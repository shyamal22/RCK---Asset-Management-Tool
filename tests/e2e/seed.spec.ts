import { expect, test } from "@playwright/test";
import { signIn } from "./support";

// Runs against `pnpm db:seed` data (CI seeds before e2e).
test("seeded RCK crew member signs in to the Crew home", async ({ page }) => {
  await signIn(page, "crew@rck.test", process.env.SEED_PASSWORD ?? "Workshop-Dev-2026");
  await expect(page.getByRole("heading", { name: "Kia ora, Mere" })).toBeVisible();
  await expect(page.getByRole("region", { name: "My machines" })).toBeVisible();
});
