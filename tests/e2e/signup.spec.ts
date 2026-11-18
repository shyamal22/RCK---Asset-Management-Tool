import { expect, test } from "@playwright/test";
import { emailBody, latestCode, makeE2ECompany, sql } from "./support";

test("sign up from company link, verify by code, wait for approval, then get in", async ({ page }) => {
  const co = await makeE2ECompany();
  const email = `op-${Date.now()}-${test.info().project.name}@test.local`;
  const started = Date.now() - 1000;

  await page.goto(`/join/${co.code}`);
  await expect(page.getByRole("heading", { name: `Join ${co.name}` })).toBeVisible();
  await page.getByLabel("Your name").fill("Mere Tane");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Paver-Roller-42");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(`Code sent to ${email}`)).toBeVisible();
  const code = await latestCode(email, started);
  const mail = await emailBody(email);
  expect(mail.HTML).toContain(`${co.name} Workshop`);
  expect(mail.HTML).not.toMatch(/supabase/i);
  expect(mail.HTML).not.toMatch(/href=/i); // no links to click

  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for approval" })).toBeVisible();

  // Pending: nothing else is reachable.
  await page.goto("/");
  await expect(page).toHaveURL(/\/waiting$/);

  await sql`update public.users set status = 'active', user_type = 'crew' where email = ${email}`;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mere Tane" })).toBeVisible();
});

test("disabled or unknown link is refused", async ({ page }) => {
  await page.goto("/join/not-a-real-code");
  await expect(page.getByRole("heading", { name: "Link not active" })).toBeVisible();
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
});
