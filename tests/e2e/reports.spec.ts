import { expect, test } from "@playwright/test";
import { formError, makeE2ECompany, makeE2EUser, signIn, sql } from "./support";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test("Crew reports damage with photos; machine goes red; Workshop marks it fixed", async ({ page, browser }) => {
  const co = await makeE2ECompany();
  const [yellow] = await sql<{ id: string }[]>`insert into public.crews (company_id, name) values (${co.id}, 'Yellow') returning id`;
  const [type] = await sql<{ id: string }[]>`select id from public.asset_types where company_id = ${co.id} and name = 'Paver'`;
  const [paver] = await sql<{ id: string }[]>`insert into public.assets (company_id, code, name, asset_type_id, make, model, year, tracking_unit, crew_id, current_reading)
    values (${co.id}, 'PAV-01', 'Big paver', ${type.id}, 'Vogele', 'S1800', 2018, 'hours', ${co.crewId}, 7000) returning id`;
  const crew = await makeE2EUser(co.id, "crew", { name: "Rangi Crew", crewId: co.crewId });

  await signIn(page, crew.email);
  await page.getByRole("link", { name: "Report damage" }).click();
  await page.getByRole("link", { name: "PAV-01 Big paver" }).click();
  await expect(page.getByRole("heading", { name: "Report damage" })).toBeVisible();

  await page.getByLabel("What's wrong?").fill("Screed heater not working");
  await page.getByLabel("Details").fill("Left screed extension stays cold, error E42 on the panel");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(formError(page)).toHaveText("Add at least one photo");
  await page.getByLabel("Damage photos").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: PNG },
    { name: "b.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(page.getByRole("img", { name: "Damage photo 2" })).toBeVisible();
  await page.getByRole("button", { name: "Remove photo 2" }).click();
  await expect(page.getByRole("img", { name: "Damage photo 2" })).toHaveCount(0);
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(formError(page)).toHaveText("Is it still usable?");
  await page.getByRole("radio", { name: "Unusable" }).click();
  await expect(page.getByText("PAV-01 will be marked Unusable", { exact: false })).toBeVisible();
  await page.getByLabel("Current hours (if you know)").fill("7012");
  await page.getByRole("button", { name: "Send report" }).click();

  await expect(page.getByText("Report sent. The workshop can see it now.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Screed heater not working" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Damage photo 1" })).toBeVisible();
  await expect(page.getByText("The workshop will look at this")).toBeVisible();

  await page.goto(`/assets/${paver.id}`);
  await expect(page.getByText("Unusable").first()).toBeVisible();
  await expect(page.getByText("1 report").first()).toBeVisible();
  await expect(page.getByTestId("current-reading")).toHaveText("7,012 hr");

  // Another crew can't see it.
  const other = await makeE2EUser(co.id, "crew", { crewId: yellow.id });
  const o = await (await browser.newContext()).newPage();
  await signIn(o, other.email);
  await o.goto("/reports");
  await expect(o.getByText("No open damage reports.")).toBeVisible();

  // Workshop closes it as fixed.
  const w = await makeE2EUser(co.id, "workshop");
  const wp = await (await browser.newContext()).newPage();
  await signIn(wp, w.email);
  await expect(wp.getByRole("region", { name: "Damage reports" }).getByText("Unusable")).toBeVisible();
  await wp.getByRole("navigation", { name: "Main" }).locator("visible=true").getByRole("link", { name: "Reports" }).click();
  await wp.getByRole("link", { name: "PAV-01 Screed heater not working" }).click();
  await wp.getByRole("button", { name: "Mark fixed" }).click();
  await expect(formError(wp)).toHaveText("Say what was done");
  await wp.getByLabel("What was done").fill("Replaced heater element, tested");
  await wp.getByRole("button", { name: "Mark fixed" }).click();
  await expect(wp.getByRole("heading", { name: "Fixed" })).toBeVisible();
  await wp.goto(`/assets/${paver.id}`);
  await expect(wp.getByText("Available").first()).toBeVisible();
  await expect(wp.getByText("1 report")).toHaveCount(0);
});

test("Crew can't open someone else's report", async ({ page, browser }) => {
  const co = await makeE2ECompany();
  const [type] = await sql<{ id: string }[]>`select id from public.asset_types where company_id = ${co.id} and name = 'Roller'`;
  const [a] = await sql<{ id: string }[]>`insert into public.assets (company_id, code, name, asset_type_id, make, model, year, tracking_unit, crew_id)
    values (${co.id}, 'ROL-01', 'Roller', ${type.id}, 'Hamm', 'HD12', 2019, 'hours', ${co.crewId}) returning id`;
  const raiser = await makeE2EUser(co.id, "crew", { crewId: co.crewId });
  const [r] = await sql<{ id: string }[]>`insert into public.breakdown_reports (company_id, asset_id, crew_id, raised_by, title, details, severity, photo_paths)
    values (${co.id}, ${a.id}, ${co.crewId}, ${raiser.id}, 'Leak', 'Oil under the drum', 'usable', ${[`${co.id}/x.jpg`]}) returning id`;
  const other = await makeE2EUser(co.id, "crew", { crewId: co.crewId });
  await signIn(page, other.email);
  expect((await page.goto(`/reports/${r.id}`))?.status()).toBe(404);
  // …but the machine still shows its yellow flag to everyone on that crew.
  await page.goto(`/assets/${a.id}`);
  await expect(page.getByText("1 report")).toBeVisible();
  void browser;
});
