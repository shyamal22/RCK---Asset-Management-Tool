import { expect, test } from "@playwright/test";
import { latestCode, makeE2ECompany, makeE2EPlatformAdmin, makeE2EUser, PASSWORD, signIn } from "./support";

test("KRE admin creates a client; the invited Director signs up straight into setup; support access is visible and endable", async ({
  page,
  browser,
}) => {
  const admin = await makeE2EPlatformAdmin("Kiri Admin");
  await signIn(page, admin.email);
  await expect(page).toHaveURL(/\/kre$/);
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();

  const client = `Client ${Date.now()}`;
  const directorEmail = `director-${crypto.randomUUID().slice(0, 8)}@test.local`;
  await page.getByLabel("Company name").fill(client);
  await page.getByLabel("Director's name").fill("Dana Director");
  await page.getByLabel("Director's email").fill(directorEmail);
  await page.getByRole("button", { name: "Create and invite Director" }).click();
  await expect(page.getByRole("heading", { name: client })).toBeVisible();
  await expect(page.getByText("Director invited")).toBeVisible();
  const inviteUrl = (await page.getByTestId("invite-url").textContent())!;

  // The invited Director signs up from the link and is active straight away (no approval wait).
  const d = await (await browser.newContext()).newPage();
  const t0 = Date.now() - 1000;
  await d.goto(new URL(inviteUrl).pathname);
  await expect(d.getByRole("heading", { name: `Join ${client}` })).toBeVisible();
  await d.getByLabel("Your name").fill("Dana Director");
  await d.getByLabel("Email").fill(directorEmail);
  await d.getByLabel("Password").fill(PASSWORD);
  await d.getByRole("button", { name: "Create account" }).click();
  await d.getByLabel("6-digit code").fill(await latestCode(directorEmail, t0));
  await d.getByRole("button", { name: "Confirm" }).click();
  await expect(d).toHaveURL(/\/setup\/start$/);

  // KRE admin sees the Director signed up, but none of the client's data until support access starts.
  await page.reload();
  await expect(page.getByText(/Dana Director \(.*\) signed up/)).toBeVisible();
  await expect(page.getByText("Yards")).toHaveCount(0);
  await page.getByLabel("Reason for access").fill("Helping with setup");
  await page.getByLabel("How long").selectOption({ label: "1 hour" });
  await page.getByRole("button", { name: "Start read-only access" }).click();
  await expect(page.getByText(/Read-only until/)).toBeVisible();

  // The client's Director sees it and ends it.
  await d.goto("/setup/company");
  await expect(d.getByRole("heading", { name: "KRE support access" })).toBeVisible();
  await expect(d.getByText(/Kiri Admin can view \(not change\) your data/)).toBeVisible();
  await d.getByRole("button", { name: "End access now" }).click();
  await expect(d.getByRole("heading", { name: "KRE support access" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Start read-only access" })).toBeVisible();
});

test("client users can't open the KRE admin area", async ({ page }) => {
  const co = await makeE2ECompany();
  const director = await makeE2EUser(co.id, "director");
  await signIn(page, director.email);
  await expect(page.getByRole("link", { name: "Clients" })).toHaveCount(0);
  expect((await page.goto("/kre"))?.status()).toBe(404);
});

test("people at a client on hold see a message, not data", async ({ page, browser }) => {
  const admin = await makeE2EPlatformAdmin("Hold Admin");
  const co = await makeE2ECompany();
  const crew = await makeE2EUser(co.id, "crew", { crewId: co.crewId });
  await signIn(page, admin.email);
  await page.goto(`/kre/${co.id}`);
  await page.getByLabel("Reason for putting on hold").fill("Account unpaid");
  page.once("dialog", (dlg) => dlg.accept());
  await page.getByRole("button", { name: "Put on hold" }).click();
  await expect(page.getByRole("button", { name: "Reactivate" })).toBeVisible();

  const p = await (await browser.newContext()).newPage();
  await p.goto("/sign-in");
  await p.getByLabel("Email").fill(crew.email);
  await p.getByLabel("Password").fill(PASSWORD);
  await p.getByRole("button", { name: "Sign in" }).click();
  await expect(p.getByText("Your company's account is on hold. Talk to your manager.")).toBeVisible();

  await page.getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByRole("button", { name: "Put on hold" })).toBeVisible();
});
