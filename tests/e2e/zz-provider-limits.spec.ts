import { cairoDate, expect, test } from "./fixtures";

/**
 * Runs last: a provider 429 makes the data layer pause ALL provider requests
 * for 60 seconds (the limit is account-wide), which would affect other tests.
 */
test("rate limiting (HTTP 429) is explained to visitors", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "runs once, at the end");
  await page.goto(`/matches/date/${cairoDate(6)}`);
  await expect(page.locator('main [role="alert"]')).toContainText("حد الطلبات");
  // Pages with data already cached keep working during the pause.
  const res = await page.goto("/matches/today");
  expect(res?.status()).toBe(200);
  await expect(page.locator('[data-match-id="900003"]')).toBeVisible();
});
