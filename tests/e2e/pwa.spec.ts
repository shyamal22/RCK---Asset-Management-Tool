import { expect, test } from "@playwright/test";

test("installs to an iPhone home screen full screen, with KRE icons", async ({ page, request }) => {
  await page.goto("/sign-in");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "black-translucent");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-touch-icon\.png/);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const res = await request.get(href!); // signed out: must not redirect to sign-in
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.display).toBe("standalone");
  for (const i of m.icons) expect((await request.get(i.src)).headers()["content-type"]).toContain("image/png");
});
