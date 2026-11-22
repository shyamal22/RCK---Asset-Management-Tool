import { expect, test } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn, sql } from "./support";

// 1×1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test("Workshop adds a roller, records readings, edits it and adds a photo", async ({ page }) => {
  const co = await makeE2ECompany();
  const w = await makeE2EUser(co.id, "workshop", { name: "Wiremu Workshop" });
  await signIn(page, w.email);

  await page.getByRole("link", { name: "Assets" }).first().click();
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();
  await expect(page.getByText("No assets yet.")).toBeVisible();
  await page.getByRole("link", { name: "Add asset" }).click();
  await expect(page.getByRole("heading", { name: "Add asset" })).toBeVisible();

  // A photo is required for new machines.
  await page.getByLabel("Type").selectOption({ label: "Roller" });
  await expect(page.getByLabel("Code")).toHaveValue("ROL-01");
  await page.getByLabel("Name").fill("Roller 1");
  await page.getByRole("button", { name: "Add asset" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText("Add a photo of the machine");
  await page.getByLabel("Asset photo").setInputFiles({ name: "roller.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("img", { name: "Photo of the new asset" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Hours" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Suggested for Roller.", { exact: false })).toBeVisible();
  await page.getByLabel("Name").fill("Roller 1");
  await page.getByLabel("Make").fill("Hamm");
  await page.getByLabel("Model").fill("HD12 VV");
  await page.getByLabel("Year").fill("2019");
  await page.getByLabel("Current hours").fill("1,200");
  await page.getByLabel("Crew").selectOption({ label: "Green" });
  await page.getByRole("button", { name: "Add asset" }).click();

  await expect(page.getByRole("heading", { name: "ROL-01 Roller 1" })).toBeVisible();
  await expect(page.getByTestId("current-reading")).toHaveText("1,200 hr");
  await expect(page.getByText("Available")).toBeVisible();
  await expect(page.getByRole("img", { name: "ROL-01 Roller 1" })).toBeVisible();

  await page.getByLabel("New reading (hours)").fill("1210.5");
  await page.getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await expect(page.getByTestId("current-reading")).toHaveText("1,210.5 hr");

  await page.getByLabel("New reading (hours)").fill("1000");
  await page.getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByText("lower than the last reading", { exact: false })).toBeVisible();
  await expect(page.getByTestId("current-reading")).toHaveText("1,210.5 hr");
  await expect(page.getByText("Lower than previous")).toBeVisible();

  // Duplicate code is refused.
  await page.goto("/setup/assets/new");
  await page.getByLabel("Type").selectOption({ label: "Roller" });
  await expect(page.getByLabel("Code")).toHaveValue("ROL-02");
  await page.getByLabel("Code").fill("rol-01");
  await page.getByLabel("Asset photo").setInputFiles({ name: "copy.png", mimeType: "image/png", buffer: PNG });
  await page.getByLabel("Name").fill("Copy");
  await page.getByLabel("Make").fill("Hamm");
  await page.getByLabel("Model").fill("HD12");
  await page.getByLabel("Year").fill("2020");
  await page.getByRole("button", { name: "Add asset" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText("Code ROL-01 is already used");

  // Edit: status + name; photo.
  await page.goto("/assets");
  await page.getByRole("link", { name: "ROL-01 Roller 1" }).click();
  await page.getByRole("link", { name: "Edit asset" }).click();
  await page.getByLabel("Asset photo").setInputFiles({ name: "roller.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("status").filter({ hasText: "Photo saved" })).toBeVisible();
  await page.getByLabel("Name").fill("Big roller");
  await page.getByLabel("Status").selectOption({ label: "Unusable" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "ROL-01 Big roller" })).toBeVisible();
  await expect(page.getByText("Unusable")).toBeVisible();
  await expect(page.getByRole("img", { name: "ROL-01 Big roller" })).toBeVisible();

  // Not a lead: can't change Hours ↔ Km, can't archive.
  await page.getByRole("link", { name: "Edit asset" }).click();
  await expect(page.getByText("Only a Director or the Workshop lead can change this.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Archive asset" })).toHaveCount(0);
});

test("search by name or code and filter; Crew only sees their crew's machines", async ({ page, browser }) => {
  const co = await makeE2ECompany();
  const [yellow] = await sql<{ id: string }[]>`insert into public.crews (company_id, name) values (${co.id}, 'Yellow') returning id`;
  const types = await sql<{ id: string; name: string }[]>`select id, name from public.asset_types where company_id = ${co.id}`;
  const t = (n: string) => types.find((x) => x.name === n)!.id;
  await sql`insert into public.assets (company_id, code, name, asset_type_id, make, model, year, tracking_unit, crew_id, status) values
    (${co.id}, 'PAV-01', 'Big paver', ${t("Paver")}, 'Vogele', 'S1800', 2018, 'hours', ${co.crewId}, 'available'),
    (${co.id}, 'TRK-03', 'Tipper', ${t("Truck")}, 'Isuzu', 'FVZ', 2021, 'km', ${yellow.id}, 'in_workshop')`;

  const d = await makeE2EUser(co.id, "director");
  await signIn(page, d.email);
  await page.goto("/assets");
  await expect(page.getByText("2 assets")).toBeVisible();
  // The bay and showroom rows scroll inside themselves; the page never scrolls sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.getByLabel("Search assets").fill("trk-03");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("1 asset", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "TRK-03 Tipper" })).toBeVisible();
  await page.getByLabel("Search assets").fill("paver");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("link", { name: "PAV-01 Big paver" })).toBeVisible();
  await page.getByRole("link", { name: "Clear" }).click();
  await expect(page).toHaveURL(/\/assets$/);
  await expect(page.getByLabel("Search assets")).toHaveValue("");
  await page.locator("summary", { hasText: "Filter" }).click();
  await page.getByLabel("Status").selectOption({ label: "In workshop" });
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("1 asset", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "TRK-03 Tipper" })).toBeVisible();

  // Type bays + showroom: pick Pavers, the focused machine's details show below.
  await page.goto("/assets");
  const bays = page.getByRole("navigation", { name: "Asset types" });
  await expect(bays.getByRole("link", { name: "All, 2" })).toHaveAttribute("aria-current", "true");
  await bays.getByRole("link", { name: "Paver, 1" }).click();
  await expect(page.getByText("1 asset", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PAV-01 Big paver" })).toBeVisible();
  await expect(page.getByText("1 of 1")).toBeVisible();
  // Status chips
  await page.getByRole("navigation", { name: "Quick filters" }).getByRole("link", { name: "In workshop" }).click();
  await expect(page.getByText("Nothing matches.")).toBeVisible();
  // List view still there for desk work
  await page.goto("/assets?view=list");
  await expect(page.getByRole("link", { name: "PAV-01 Big paver" })).toBeVisible();

  const crew = await makeE2EUser(co.id, "crew", { crewId: co.crewId });
  const p = await (await browser.newContext()).newPage();
  await signIn(p, crew.email);
  await p.goto("/assets");
  await expect(p.getByRole("link", { name: "PAV-01 Big paver" })).toBeVisible();
  await expect(p.getByRole("link", { name: "TRK-03 Tipper" })).toHaveCount(0);
  await expect(p.getByRole("link", { name: "Add asset" })).toHaveCount(0);
  expect((await p.goto("/setup/assets/new"))?.status()).toBe(404);
});

test("Director changes a truck to kilometres and archives an asset", async ({ page }) => {
  const co = await makeE2ECompany();
  const [type] = await sql<{ id: string }[]>`select id from public.asset_types where company_id = ${co.id} and name = 'Truck'`;
  const [a] = await sql<{ id: string }[]>`insert into public.assets (company_id, code, name, asset_type_id, make, model, year, tracking_unit)
    values (${co.id}, 'TRK-09', 'Water cart', ${type.id}, 'Hino', '500', 2015, 'hours') returning id`;
  const d = await makeE2EUser(co.id, "director");
  await signIn(page, d.email);
  await page.goto(`/setup/assets/${a.id}`);
  await page.getByLabel("Current kilometres").fill("182300");
  await page.getByLabel("Reason for the change").fill("Set up with the wrong unit");
  await page.getByRole("button", { name: "Change to kilometres" }).click();
  await expect(page.getByText("Now tracked by kilometres")).toBeVisible();
  await page.goto(`/assets/${a.id}`);
  await expect(page.getByTestId("current-reading")).toHaveText("182,300 km");

  await page.goto(`/setup/assets/${a.id}`);
  await page.getByLabel("Reason for archiving (sold, scrapped…)").fill("Sold");
  page.once("dialog", (dlg) => dlg.accept());
  await page.getByRole("button", { name: "Archive asset" }).click();
  await expect(page.getByText("Asset archived. Its history is kept.")).toBeVisible();
  await page.goto("/assets");
  await expect(page.getByText("No assets yet.")).toBeVisible();
});
