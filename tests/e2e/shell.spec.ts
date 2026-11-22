import { expect, test, type Page } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn } from "./support";

const mainNav = (page: Page) => page.getByRole("navigation", { name: "Main" }).locator("visible=true");

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

const HOMES = {
  crew: ["My machines", "My reports"],
  supervisor: ["Needs attention", "Crew machines", "Open reports"],
  workshop: ["Damage reports", "Readings to check", "Needs attention"],
  office: ["Waiting for approval", "Damage reports"],
  director: ["Fleet by type", "Damage reports", "Needs attention"],
} as const;

for (const [type, sections] of Object.entries(HOMES)) {
  test(`${type} gets their own home screen`, async ({ page }) => {
    const co = await makeE2ECompany();
    const u = await makeE2EUser(co.id, type as keyof typeof HOMES, { crewId: co.crewId });
    await signIn(page, u.email);
    for (const s of sections) await expect(page.getByRole("region", { name: s, exact: true })).toBeVisible();
    const hasSetup = type === "director"; // Setup is Director-only (Sam, 22/11/2026)
    await expect(mainNav(page).getByRole("link", { name: "Setup" })).toHaveCount(hasSetup ? 1 : 0);
    await noSideScroll(page);
  });
}

test("Crew and Supervisor can't reach Setup by URL", async ({ page }) => {
  const co = await makeE2ECompany();
  const u = await makeE2EUser(co.id, "supervisor", { crewId: co.crewId });
  await signIn(page, u.email);
  for (const path of ["/setup", "/setup/company", "/setup/yards-crews", "/setup/users", "/setup/audit"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
});

test("Director: Setup lists every section; yards, crews and company can be edited", async ({ page }) => {
  const co = await makeE2ECompany();
  const d = await makeE2EUser(co.id, "director");
  await signIn(page, d.email);
  await mainNav(page).getByRole("link", { name: "Setup" }).click();
  for (const s of ["Company", "Yards and crews", "Users", "Sign-up link", "Audit log"]) {
    await expect(page.getByRole("link", { name: s })).toBeVisible();
  }
  await page.getByRole("link", { name: "Yards and crews" }).click();
  const yards = page.getByRole("region", { name: "Yards" });
  await yards.getByLabel("New yard").fill("Helensville");
  await yards.getByRole("button", { name: "Add" }).click();
  await expect(yards.getByText("Helensville")).toBeVisible();
  await yards.getByRole("button", { name: "Rename Helensville" }).click();
  await yards.getByLabel("New name for Helensville").fill("Helensville Workshop");
  await yards.getByRole("button", { name: "Save" }).click();
  await expect(yards.getByText("Helensville Workshop")).toBeVisible();
  await noSideScroll(page);

  await page.goto("/setup/company");
  // Logo for report headers
  await page.getByLabel("Logo file").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
  });
  await expect(page.getByRole("status").filter({ hasText: "Logo saved" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Company logo" })).toBeVisible();
  // Key contacts are required
  const phone = page.getByLabel("Finance manager's phone");
  await phone.fill("");
  await page.getByRole("button", { name: "Save" }).click();
  expect(await phone.evaluate((el) => (el as HTMLInputElement).validity.valueMissing)).toBe(true); // phone's own check stops it
  await phone.fill("not a number");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText("Enter the finance manager's phone number");
  await phone.fill("09 555 0199");
  await page.getByLabel("Director approval limit ($ ex GST)").fill("2500");
  await page.getByLabel("Internal labour rate ($/hr ex GST)").fill("95.50");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Internal labour rate ($/hr ex GST)")).toHaveValue("95.50");
  await expect(page.getByLabel("Director approval limit ($ ex GST)")).toHaveValue("2500.00");
});

test("Me page shows type and signs out", async ({ page }) => {
  const co = await makeE2ECompany();
  const u = await makeE2EUser(co.id, "workshop", { name: "Wendy Workshop", lead: true });
  await signIn(page, u.email);
  // Phones: the round initials button in the header; desktop: the side menu.
  await page.getByRole("link", { name: "Me", exact: true }).locator("visible=true").first().click();
  await expect(page.getByText("Workshop · Workshop lead")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("desktop side menu hides so the screen gets the full width, and stays hidden on the next page", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "phones use the bottom nav");
  const co = await makeE2ECompany();
  const u = await makeE2EUser(co.id, "director");
  await signIn(page, u.email);
  const panel = page.locator("main");
  const before = (await panel.boundingBox())!.width;
  await page.getByRole("button", { name: "Hide menu" }).click();
  await expect(page.getByRole("button", { name: "Show menu" })).toBeVisible();
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(before + 150);
  await expect(mainNav(page)).toHaveCount(0);

  await page.goto("/assets");
  await expect(page.getByRole("button", { name: "Show menu" })).toBeVisible();
  await page.getByRole("button", { name: "Show menu" }).click();
  await expect(mainNav(page).getByRole("link", { name: "Assets" })).toBeVisible();
});

test("home tiles: All working, Damaged, Unusable", async ({ page }) => {
  const co = await makeE2ECompany();
  const u = await makeE2EUser(co.id, "director");
  await signIn(page, u.email);
  const tiles = page.getByRole("list", { name: "Fleet at a glance" }).getByRole("listitem");
  await expect(tiles).toHaveText([/All working\s*0/, /Damaged\s*0/, /Unusable\s*0/]);
  await expect(page.getByRole("heading", { name: /^Home, \w+day, \d{1,2} \w+ \d{4}$/ })).toBeVisible();
});
