import { expect, test } from "@playwright/test";
import { latestCode, makeE2ECompany, makeE2EUser, PASSWORD, signIn } from "./support";

test("Director approves a pending person, who then lands on their home screen", async ({ browser }) => {
  const co = await makeE2ECompany();
  const director = await makeE2EUser(co.id, "director");
  const email = `new-${Date.now()}-${test.info().project.name}@test.local`;

  const newbie = await browser.newPage();
  const t0 = Date.now() - 1000;
  await newbie.goto(`/join/${co.code}`);
  await newbie.getByLabel("Your name").fill("Hemi Walker");
  await newbie.getByLabel("Email").fill(email);
  await newbie.getByLabel("Password").fill(PASSWORD);
  await newbie.getByRole("button", { name: "Create account" }).click();
  await newbie.getByLabel("6-digit code").fill(await latestCode(email, t0));
  await newbie.getByRole("button", { name: "Confirm" }).click();
  await expect(newbie.getByRole("heading", { name: "Waiting for approval" })).toBeVisible();

  const page = await browser.newPage();
  await signIn(page, director.email);
  await page.goto("/setup/users");
  const card = page.getByRole("region", { name: "Hemi Walker" });
  await card.getByRole("radio", { name: "Crew" }).click();
  await card.getByLabel("Crew").selectOption({ label: "Green" });
  await card.getByRole("button", { name: "Approve" }).click();
  // Nobody left waiting: the waiting block goes and Hemi is in the People list.
  await expect(page.getByRole("region", { name: "Hemi Walker" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Waiting for approval" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "People" }).getByRole("link", { name: /Hemi Walker/ })).toBeVisible();

  await newbie.goto("/");
  await expect(newbie.getByRole("heading", { name: /^Home,/ })).toBeVisible();
});
