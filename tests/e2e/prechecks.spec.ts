import { expect, test } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn, sql } from "./support";

// 1×1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test("Workshop sets up roller checks; Crew does a pre-check one question at a time; problems flag the machine; Workshop dismisses one", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const co = await makeE2ECompany();
  const [t] = await sql<{ id: string }[]>`select id from public.asset_types where company_id = ${co.id} and name = 'Roller'`;
  const [roller] = await sql<{ id: string }[]>`insert into public.assets (company_id, code, name, asset_type_id, make, model, year, tracking_unit, crew_id, current_reading)
    values (${co.id}, 'ROL-01', 'Big roller', ${t.id}, 'Hamm', 'HD12', 2019, 'hours', ${co.crewId}, 1200) returning id`;

  // Workshop: the starter list, trimmed to three checks.
  const w = await makeE2EUser(co.id, "workshop");
  await signIn(page, w.email);
  await page.goto("/prechecks");
  await page.getByRole("link", { name: "Templates" }).click();
  await expect(page.getByRole("link", { name: /Roller/ })).toContainText("Not set up");
  await page.getByRole("link", { name: /Roller/ }).click();
  const checks = page.getByRole("list", { name: "Checks" }).getByRole("listitem");
  while ((await checks.count()) > 3) await page.getByRole("button", { name: `Remove check ${await checks.count()}` }).click();
  await expect(page.getByLabel("Question 1")).toHaveValue("Tyres / tracks");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();

  // Crew: Checks tab → Start → pick the roller → one screen per question.
  const crew = await makeE2EUser(co.id, "crew", { crewId: co.crewId });
  const cp = await (await browser.newContext()).newPage();
  await signIn(cp, crew.email);
  await cp.getByRole("navigation", { name: "Main" }).locator("visible=true").getByRole("link", { name: "Checks" }).click();
  await cp.getByRole("link", { name: "Start pre-check" }).click();
  await cp.getByRole("link", { name: "ROL-01 Big roller" }).click();
  await cp.getByLabel("Current hours").fill("1250");
  await cp.getByRole("button", { name: "Next" }).click();

  await expect(cp.getByRole("heading", { name: "Tyres / tracks" })).toBeVisible();
  await expect(cp.getByRole("button", { name: "Next" })).toBeDisabled();
  await cp.getByRole("radio", { name: "Usable" }).click();
  await expect(cp.getByRole("button", { name: "Next" })).toBeDisabled(); // photo needed
  await cp.getByLabel("Photo", { exact: true }).setInputFiles({ name: "tyre.png", mimeType: "image/png", buffer: PNG });
  await cp.getByLabel("What's wrong?").fill("Front left worn");
  await cp.getByRole("button", { name: "Next" }).click();

  await expect(cp.getByRole("heading", { name: "Any oil, fuel or hydraulic leaks?" })).toBeVisible();
  await cp.getByRole("radio", { name: "Yes" }).click();
  await cp.getByRole("button", { name: "Next" }).click();

  await cp.getByRole("radio", { name: "Fine" }).click();
  await cp.getByRole("button", { name: "Next" }).click();
  await expect(cp.getByRole("heading", { name: "Ready to send" })).toBeVisible();
  await cp.getByRole("button", { name: "Send with problems" }).click();
  await expect(cp.getByRole("status")).toContainText("Problem");
  const url = cp.url();

  // The machine now carries both open items; the reading moved on.
  await cp.goto(`/assets/${roller.id}`);
  await expect(cp.getByText("2 reports").first()).toBeVisible();
  await expect(cp.getByTestId("current-reading")).toHaveText("1,250 hr");

  // Workshop dismisses the leak with a reason.
  await page.goto(url.replace(/\?sent=1$/, ""));
  const leak = page.getByRole("list", { name: "Checks" }).getByRole("listitem").filter({ hasText: "leaks" });
  await leak.getByRole("button", { name: "Dismiss" }).click();
  await leak.getByLabel("Reason").fill("Old stain, not a leak");
  await leak.getByRole("button", { name: "Dismiss" }).click();
  await expect(leak).toContainText("Dismissed");
  await page.goto(`/assets/${roller.id}`);
  await expect(page.getByText("1 report").first()).toBeVisible();
});
