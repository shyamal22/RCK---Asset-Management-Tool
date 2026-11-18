import { expect, test } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn } from "./support";

test("Director sees sign-ins and changes in the audit log, and exports are logged", async ({ page }) => {
  const co = await makeE2ECompany();
  const director = await makeE2EUser(co.id, "director", { name: "Audrey Audit" });
  await signIn(page, director.email);

  await page.goto("/setup/audit");
  const entries = page.getByRole("list", { name: "Audit entries" });
  await expect(entries.getByText(/sign in/).first()).toBeVisible();
  await expect(entries.getByText(/device verified/).first()).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const file = await download;
  const text = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString());
  expect(text.split("\r\n")[0]).toBe("When (NZ),Who,Action,Record,Record id,Device,Before,After");
  expect(text).toContain("Audrey Audit");

  await page.goto("/setup/audit?action=export");
  await expect(entries.getByText("export", { exact: true })).toBeVisible();
});

test("Crew can't open the audit log", async ({ page }) => {
  const co = await makeE2ECompany();
  const crew = await makeE2EUser(co.id, "crew", { crewId: co.crewId });
  await signIn(page, crew.email);
  expect((await page.goto("/setup/audit"))?.status()).toBe(404);
  expect((await page.request.get("/setup/audit/export")).status()).toBe(404);
});
