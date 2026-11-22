import { expect, test } from "@playwright/test";
import { formError, latestCode, makeE2ECompany, makeE2EUser, PASSWORD, signIn, sql } from "./support";

test("Director needs a code on a new device, but not again on the same device", async ({ page }) => {
  const co = await makeE2ECompany();
  const d = await makeE2EUser(co.id, "director", { name: "Dana Director" });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(d.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/verify-device$/);
  // Blocked from everything until the code is entered.
  await page.goto("/");
  await expect(page).toHaveURL(/\/verify-device$/);

  const t0 = Date.now() - 1000;
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(d.email, t0));
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { name: "Dana Director" })).toBeVisible();

  await page.context().clearCookies({ name: /^sb-/ });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(d.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dana Director" })).toBeVisible();
});

test("Crew needs no second step", async ({ page }) => {
  const co = await makeE2ECompany();
  const c = await makeE2EUser(co.id, "crew", { name: "Cam Crew", crewId: co.crewId });
  await signIn(page, c.email);
  await expect(page.getByRole("heading", { name: "Cam Crew" })).toBeVisible();
});

test("locks out after 5 wrong passwords", async ({ page }) => {
  const co = await makeE2ECompany();
  const c = await makeE2EUser(co.id, "crew", { crewId: co.crewId });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(c.email);
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Password").fill(`wrong-${i}-password`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(formError(page)).toHaveText("Email/mobile or password is wrong");
  }
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(formError(page)).toContainText("Too many tries");
});

test("phone locks; PIN unlocks; 5 wrong PINs signs out", async ({ page }) => {
  const co = await makeE2ECompany();
  const c = await makeE2EUser(co.id, "crew", { name: "Pita PIN", crewId: co.crewId });
  await signIn(page, c.email);
  await page.goto("/me/security");
  await page.getByLabel("New PIN").fill("4826");
  await page.getByRole("button", { name: "Save PIN" }).click();
  await expect(page.getByText("PIN saved")).toBeVisible();

  const lock = () => sql`update public.trusted_devices set unlocked_until = now() - interval '1 minute' where user_id = ${c.id}`;
  await page.waitForLoadState("networkidle");
  await lock();
  await page.goto("/");
  await expect(page).toHaveURL(/\/unlock$/);
  await page.getByLabel("PIN").fill("9999");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(formError(page)).toContainText("4 tries left");
  await page.getByLabel("PIN").fill("4826");
  await page.getByRole("button", { name: "Unlock" }).click();
  // The unlock screen's heading is also the person's name, so wait for Home itself.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("region", { name: "Today's pre-start" })).toBeVisible();
  await page.waitForLoadState("networkidle"); // let the home render finish touching the unlock window

  await lock();
  await page.goto("/unlock");
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("PIN").fill("9999");
    await page.getByRole("button", { name: "Unlock" }).click();
    if (i < 4) await expect(formError(page)).toContainText(`${4 - i} tries left`);
  }
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("Face ID / fingerprint (passkey) unlocks the app", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  const co = await makeE2ECompany();
  const c = await makeE2EUser(co.id, "workshop", { name: "Fran Finger" });
  await signIn(page, c.email);
  await page.goto("/me/security");
  await page.getByRole("button", { name: "Add Face ID / fingerprint" }).click();
  await expect(page.getByText("Face ID / fingerprint added")).toBeVisible();
  await page.waitForLoadState("networkidle"); // let the refresh finish touching the unlock window

  await sql`update public.trusted_devices set unlocked_until = now() - interval '1 minute' where user_id = ${c.id}`;
  await page.goto("/");
  await expect(page).toHaveURL(/\/unlock$/);
  await page.getByRole("button", { name: "Unlock with Face ID / fingerprint" }).click();
  await expect(page.getByRole("heading", { name: "Fran Finger" })).toBeVisible();
});

test("password reset by code", async ({ page }) => {
  const co = await makeE2ECompany();
  const c = await makeE2EUser(co.id, "crew", { name: "Rangi Reset", crewId: co.crewId });
  const t0 = Date.now() - 1000;
  await page.goto("/reset");
  await page.getByLabel("Email").fill(c.email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(c.email, t0));
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByLabel("New password").fill("New-Password-77");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { name: "Rangi Reset" })).toBeVisible();
  await page.context().clearCookies();
  await signIn(page, c.email, "New-Password-77");
  await expect(page.getByRole("heading", { name: "Rangi Reset" })).toBeVisible();
});
