import { expect, test, type Page } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn } from "./support";

const mainNav = (page: Page) => page.getByRole("navigation", { name: "Main" }).locator("visible=true");

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

const HOMES = {
  crew: ["Today's pre-start", "My faults"],
  supervisor: ["Crew machines", "Today's pre-starts", "Open faults"],
  workshop: ["Job board", "My jobs", "Services due this week", "Low stock"],
  office: ["Bills to match", "POs awaiting approval", "Compliance expiring in 30 days", "Users"],
  director: ["Spend vs budget", "Critical defects", "Overdue services", "Downtime", "Cost per asset"],
} as const;

for (const [type, sections] of Object.entries(HOMES)) {
  test(`${type} gets their own home screen`, async ({ page }) => {
    const co = await makeE2ECompany();
    const u = await makeE2EUser(co.id, type as keyof typeof HOMES, { crewId: co.crewId });
    await signIn(page, u.email);
    for (const s of sections) await expect(page.getByRole("region", { name: s, exact: true })).toBeVisible();
    const hasSetup = type === "director" || type === "office" || type === "workshop"; // Workshop: Setup → Assets (docs/10)
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
  await page.getByLabel("Director approval limit ($ ex GST)").fill("2500");
  await page.getByLabel("Internal labour rate ($/hr ex GST)").fill("95.50");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByLabel("Internal labour rate ($/hr ex GST)")).toHaveValue("95.50");
  await expect(page.getByLabel("Director approval limit ($ ex GST)")).toHaveValue("2500.00");
});

test("Me page shows type and signs out", async ({ page }) => {
  const co = await makeE2ECompany();
  const u = await makeE2EUser(co.id, "workshop", { name: "Wendy Workshop", lead: true });
  await signIn(page, u.email);
  await mainNav(page).getByRole("link", { name: "Me", exact: true }).click();
  await expect(page.getByText("Workshop · Workshop lead")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
