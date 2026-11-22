import { expect, test } from "@playwright/test";
import { formError, makeE2ECompany, makeE2EUser, signIn } from "./support";

test("Director changes a person's access and deactivates them", async ({ browser }) => {
  const co = await makeE2ECompany();
  const director = await makeE2EUser(co.id, "director");
  const worker = await makeE2EUser(co.id, "crew", { name: "Wiremu Worker", crewId: co.crewId });

  const workerPage = await browser.newPage();
  await signIn(workerPage, worker.email);
  await expect(workerPage.getByRole("heading", { name: /^Home,/ })).toBeVisible();

  const page = await browser.newPage();
  await signIn(page, director.email);
  await page.goto("/setup/users");
  await page.getByRole("link", { name: /Wiremu Worker/ }).click();

  const access = page.getByRole("region", { name: "Access", exact: true });
  await access.getByRole("radio", { name: "Workshop" }).click();
  await access.getByLabel("Workshop lead").check();
  await access.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");

  // Acting access was removed from the screens (Sam, 22/11/2026).
  await expect(page.getByRole("region", { name: "Acting access" })).toHaveCount(0);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByRole("button", { name: "Reactivate" })).toBeVisible();

  // Signed out everywhere: their open page loses access.
  await workerPage.goto("/");
  await expect(workerPage).toHaveURL(/\/sign-in/);
  await signInExpectFail(workerPage, worker.email);
});

async function signInExpectFail(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Paver-Roller-42");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(formError(page)).toBeVisible();
}

test("Director can't change their own access", async ({ page }) => {
  const co = await makeE2ECompany();
  const director = await makeE2EUser(co.id, "director", { name: "Self Director" });
  await signIn(page, director.email);
  await page.goto("/setup/users");
  await page.getByRole("link", { name: /Self Director/ }).click();
  await expect(page.getByText("You can't change your own access.")).toBeVisible();
});
