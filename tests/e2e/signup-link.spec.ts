import { expect, test } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn } from "./support";

test("Director turns the sign-up link off/on and regenerates it", async ({ page, browser }) => {
  const co = await makeE2ECompany();
  const director = await makeE2EUser(co.id, "director");
  await signIn(page, director.email);
  await page.goto("/setup/signup-link");
  await expect(page.getByLabel("Sign-up QR code")).toBeVisible();
  const oldUrl = (await page.getByTestId("signup-url").textContent())!;
  expect(oldUrl).toContain(`/join/${co.code}`);

  const visitor = await browser.newPage();
  await page.getByRole("button", { name: "Turn link off" }).click();
  await expect(page.getByRole("button", { name: "Turn link on" })).toBeVisible();
  await visitor.goto(`/join/${co.code}`);
  await expect(visitor.getByRole("heading", { name: "Link not active" })).toBeVisible();

  await page.getByRole("button", { name: "Turn link on" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "New link" }).click();
  await expect(page.getByTestId("signup-url")).not.toHaveText(oldUrl);
  const newUrl = (await page.getByTestId("signup-url").textContent())!;

  await visitor.goto(`/join/${co.code}`);
  await expect(visitor.getByRole("heading", { name: "Link not active" })).toBeVisible();
  await visitor.goto(new URL(newUrl).pathname);
  await expect(visitor.getByRole("heading", { name: `Join ${co.name}` })).toBeVisible();
});

test("Crew cannot open the sign-up link settings", async ({ page }) => {
  const co = await makeE2ECompany();
  const crew = await makeE2EUser(co.id, "crew", { crewId: co.crewId });
  await signIn(page, crew.email);
  const res = await page.goto("/setup/signup-link");
  expect(res?.status()).toBe(404);
});
