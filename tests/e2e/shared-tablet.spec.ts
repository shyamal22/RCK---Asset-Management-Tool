import { expect, test } from "@playwright/test";
import { formError, makeE2ECompany, makeE2EUser, signIn, sql } from "./support";

test("shared workshop tablet: switch between mechanics by PIN, idle returns to list", async ({ page }) => {
  const co = await makeE2ECompany();
  const lead = await makeE2EUser(co.id, "workshop", { name: "Lee Lead", lead: true });
  const m1 = await makeE2EUser(co.id, "workshop", { name: "Mike Mechanic" });
  const m2 = await makeE2EUser(co.id, "workshop", { name: "Nina Mechanic" });
  const office = await makeE2EUser(co.id, "office", { name: "Olive Office" });
  for (const [u, pin] of [[m1, "4826"], [m2, "5937"], [office, "6048"]] as const) {
    await sql`update public.users set pin_hash = extensions.crypt(${pin}, extensions.gen_salt('bf', 8)) where id = ${u.id}`;
  }

  await signIn(page, lead.email);
  await page.goto("/me/security");
  await page.getByRole("button", { name: "Make this a shared tablet" }).click();
  await expect(page.getByRole("button", { name: "Stop sharing this device" })).toBeVisible();
  await page.context().clearCookies({ name: /^sb-/ });

  await page.goto("/switch");
  await expect(page.getByRole("button", { name: "Olive Office" })).toHaveCount(0); // Office not on shared tablets
  await page.getByRole("button", { name: "Mike Mechanic" }).click();
  await page.getByLabel("PIN").fill("1111");
  await page.getByRole("button", { name: "Go" }).click();
  await expect(formError(page)).toContainText("Wrong PIN");
  await page.getByLabel("PIN").fill("4826");
  await page.getByRole("button", { name: "Go" }).click();
  await expect(page.getByRole("heading", { name: /^Home,/ })).toBeVisible();

  await page.goto("/switch");
  await page.getByRole("button", { name: "Nina Mechanic" }).click();
  await page.getByLabel("PIN").fill("5937");
  await page.getByRole("button", { name: "Go" }).click();
  // The PIN step also shows the person's name; wait for Home itself before locking.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("region", { name: "Damage reports" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  await sql`update public.trusted_devices set unlocked_until = now() - interval '1 minute' where user_id = ${m2.id}`;
  await page.goto("/");
  await expect(page).toHaveURL(/\/switch$/);
});

test("a normal browser can't use the switch screen", async ({ page }) => {
  await page.goto("/switch");
  await expect(page).toHaveURL(/\/sign-in$/);
});
