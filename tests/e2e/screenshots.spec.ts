import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/** Visual snapshots used in docs/ (390px mobile and 1440px desktop). */
const SHOTS: Array<{ name: string; path: string; before?: (page: Page) => Promise<void>; fullPage?: boolean }> = [
  { name: "home", path: "/" },
  { name: "match", path: "/matches/al-ahly-vs-zamalek-sc-900001" },
  {
    name: "match-lineups",
    path: "/matches/al-ahly-vs-zamalek-sc-900001",
    before: async (page) => {
      await page.locator('label[for="tab-lineups"]').click();
      await page.locator("#lineups").scrollIntoViewIfNeeded();
    },
  },
  { name: "league", path: "/leagues/egyptian-premier-league-233" },
  {
    name: "home-night",
    path: "/",
    before: async (page) => {
      await page.getByRole("button", { name: "الوضع الليلي" }).click();
    },
  },
];

for (const shot of SHOTS) {
  test(`screenshot ${shot.name}`, async ({ page, consoleErrors }, info) => {
    await page.goto(shot.path);
    await page.waitForLoadState("networkidle");
    if (shot.before) await shot.before(page);
    const width = info.project.name === "mobile-390" ? 390 : 1440;
    await page.screenshot({ path: `docs/screenshots/${shot.name}-${width}.png`, fullPage: shot.fullPage ?? false });
    // Leave the default (day) skin for the following tests.
    await page.evaluate(() => localStorage.removeItem("ys-skin"));
    expect(consoleErrors).toEqual([]);
  });
}
