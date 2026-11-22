import { expect, test } from "@playwright/test";
import { makeE2ECompany, makeE2EUser, signIn, sql } from "./support";

test("dragging the wheel brings the next machine to the front; tapping a side card spins it round", async ({ page }) => {
  const co = await makeE2ECompany();
  const [t] = await sql<{ id: string }[]>`select id from public.asset_types where company_id = ${co.id} and name = 'Roller'`;
  for (const n of [1, 2, 3, 4, 5]) {
    await sql`insert into public.assets (company_id, code, name, asset_type_id, make, model, year, tracking_unit)
      values (${co.id}, ${`ROL-0${n}`}, ${`Roller ${n}`}, ${t.id}, 'Hamm', 'HD12', 2019, 'hours')`;
  }
  const d = await makeE2EUser(co.id, "director");
  await signIn(page, d.email);
  await page.goto("/assets");
  await expect(page.getByRole("heading", { name: "ROL-01 Roller 1" })).toBeVisible();

  const stage = page.getByRole("group", { name: /drag to spin/ });
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, y, { steps: 10 });
  await page.waitForTimeout(150); // finger rests before lifting: no flick, lands on the next one
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "ROL-02 Roller 2" })).toBeVisible();

  // A quick flick carries on past the next machine.
  await page.mouse.move(box.x + box.width * 0.6, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, y, { steps: 3 });
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: /ROL-0[45]/ })).toBeVisible();
  // Back to the start with the arrow button for the rest of the story.
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Previous machine" }).click();
  await page.getByRole("button", { name: "Next machine" }).click();
  await expect(page.getByRole("heading", { name: "ROL-02 Roller 2" })).toBeVisible();
  // A drag never opens a machine.
  await expect(page).toHaveURL(/\/assets$/);

  // Tapping a card that isn't at the front spins it round instead of opening it.
  await page.getByRole("link", { name: "ROL-03 Roller 3" }).click();
  await expect(page.getByRole("heading", { name: "ROL-03 Roller 3" })).toBeVisible();
  await expect(page).toHaveURL(/\/assets$/);
  // Tapping the front card opens it.
  await page.getByRole("link", { name: "ROL-03 Roller 3" }).click();
  await expect(page).toHaveURL(/\/assets\/[0-9a-f-]{36}$/);
});
