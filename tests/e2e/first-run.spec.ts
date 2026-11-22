import { expect, test } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn, sql } from "./support";

test("new company: Director is guided through setup once, then it gets out of the way", async ({ page }) => {
  const co = await makeE2ECompany(`Fresh Co ${Date.now()}`, { setupDone: false });
  await sql`update public.crews set deleted_at = now() where company_id = ${co.id}`;
  const d = await makeE2EUser(co.id, "director", { name: "First Director" });
  await signIn(page, d.email);
  await expect(page).toHaveURL(/\/setup\/start$/);

  // Company details and key contacts are required before moving on.
  await expect(page.getByRole("link", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Fill in the company details and key contacts, then Save")).toBeVisible();
  await page.getByLabel("Company name").fill("RCK Group");
  await page.getByLabel("NZBN").fill("942904");
  await page.getByLabel("Workshop manager", { exact: true }).fill("Wayne Wiremu");
  await page.getByLabel("Workshop manager's phone").fill("021 555 0101");
  await page.getByLabel("Finance manager", { exact: true }).fill("Fiona Finance");
  await page.getByLabel("Finance manager's phone").fill("09 555 0102");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText("Enter the 13-digit NZBN");
  await page.getByLabel("NZBN").fill("9429041234567");
  await page.getByLabel("Director approval limit ($ ex GST)").fill("2000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await page.getByRole("link", { name: "Next" }).click();

  await expect(page.getByText("Add at least one yard and one crew")).toBeVisible();
  await page.getByRole("region", { name: "Yards" }).getByLabel("New yard").fill("Helensville");
  await page.getByRole("region", { name: "Yards" }).getByRole("button", { name: "Add" }).click();
  await page.getByRole("region", { name: "Crews" }).getByLabel("New crew").fill("Green");
  await page.getByRole("region", { name: "Crews" }).getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Add at least one yard and one crew")).toHaveCount(0);
  await page.getByRole("link", { name: "Next" }).click();

  await expect(page.getByLabel("Sign-up QR code")).toBeVisible();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: "First Director" })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
});
