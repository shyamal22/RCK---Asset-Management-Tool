import { expect, test, devices } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn, sql } from "./support";

async function fleet(companyId: string) {
  const [t] = await sql<{ id: string }[]>`select id from public.asset_types where company_id = ${companyId} and name = 'Roller'`;
  const [a] = await sql<{ id: string }[]>`insert into public.assets (company_id, code, name, asset_type_id, make, model, year, tracking_unit)
    values (${companyId}, 'ROL-01', 'Roller 1', ${t.id}, 'Hamm', 'HD12', 2019, 'hours') returning id`;
  return a.id;
}

test("‹ Back returns to the list you came from, filters kept; opened cold it goes to the parent", async ({ page }) => {
  const co = await makeE2ECompany();
  const id = await fleet(co.id);
  const d = await makeE2EUser(co.id, "director");
  await signIn(page, d.email);

  await page.goto("/assets?view=list&status=available");
  await page.getByRole("link", { name: "ROL-01 Roller 1" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/assets/${id}$`));
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/assets\?view=list&status=available$/);
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0); // tab root

  // The phone's own back gesture keeps ‹ Back in step with history.
  await page.getByRole("link", { name: "ROL-01 Roller 1" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/assets/${id}$`));
  await page.getByRole("navigation", { name: "Main" }).locator("visible=true").getByRole("link", { name: "Assets" }).click();
  await expect(page).toHaveURL(/\/assets$/);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/assets/${id}$`));
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/assets\?view=list&status=available$/);

  await page.goto(`/setup/assets/${id}`); // straight onto the edit screen
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(new RegExp(`/assets/${id}$`));
});

test("a missing machine shows Not found inside the app, with the tabs still there", async ({ page }) => {
  const co = await makeE2ECompany();
  const d = await makeE2EUser(co.id, "director");
  await signIn(page, d.email);
  const res = await page.goto(`/assets/${crypto.randomUUID()}`);
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).locator("visible=true")).toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: /^Home,/ })).toBeVisible();
});

test("sign-in screens always have a way back", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: /Forgot password/ }).click();
  await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goto("/join/not-a-real-code");
  await expect(page.getByRole("heading", { name: "Link not active" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible();
});

test("no signal shows our own Try again screen, not the browser's error", async ({ page, context }) => {
  await page.goto("/sign-in");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await context.setOffline(true);
  await page.goto("/sign-in").catch(() => {});
  await expect(page.getByRole("heading", { name: "No signal" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
  // Signal back: it notices and reloads by itself.
  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible({ timeout: 15_000 });
});

test("on an iPhone browser (not the home-screen app) a tip says how to get the full-screen app", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 15"] });
  const p = await ctx.newPage();
  await p.goto("/sign-in");
  const tip = p.getByRole("complementary", { name: "Open the app" });
  await expect(tip).toContainText("open KRE Assets from your home screen");
  await p.waitForTimeout(400); // entrance animation done: the tip must sit fully on screen
  const box = (await tip.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(p.viewportSize()!.width);
  await tip.getByRole("button", { name: "Hide this tip" }).click();
  await expect(tip).toBeHidden();
  await p.reload();
  await expect(p.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(tip).toBeHidden(); // stays hidden for the session

  // The installed app (navigator.standalone) never shows it.
  const app = await browser.newContext({ ...devices["iPhone 15"] });
  await app.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
  const ap = await app.newPage();
  await ap.goto("/sign-in");
  await expect(ap.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(ap.getByRole("complementary", { name: "Open the app" })).toHaveCount(0);
  await ctx.close();
  await app.close();
});

test("pressing shows straight away, clears on release, and sliding off cancels it", async ({ page }) => {
  await page.goto("/sign-in");
  const btn = page.getByRole("button", { name: "Sign in" });
  await expect(btn).toBeVisible();
  await page.waitForLoadState("networkidle"); // press controller is installed after hydration
  const b = (await btn.boundingBox())!;
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  // Down: pressed at once (no waiting for the browser's :active).
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await expect(btn).toHaveAttribute("data-pressed", "");
  // Slide well off: cancelled, nothing submitted.
  await page.mouse.move(cx, cy + 80, { steps: 4 });
  await expect(btn).not.toHaveAttribute("data-pressed");
  await page.mouse.up();
  await expect(page.locator('p[role="alert"]')).toHaveCount(0);
  // A quick tap still shows, then clears by itself.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.up();
  await expect(btn).not.toHaveAttribute("data-pressed", { timeout: 2000 });
});
