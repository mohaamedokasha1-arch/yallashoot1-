import { cairoDate, canonicalOf, expect, expectNoHorizontalScroll, test } from "./fixtures";

test.describe("home page", () => {
  test("shows today's matches with Egypt first, live ticker and correct states", async ({ page, consoleErrors }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("مباريات اليوم");
    await expect(page.getByText("بيئة اختبار")).toBeVisible();

    // Egyptian section is the first region of the board.
    const board = page.locator(".match-board").first();
    await expect(board.locator(".region-block h2").first()).toContainText("الكرة المصرية");

    // Live ticker + live row with minute.
    await expect(page.getByRole("heading", { name: /مباشر الآن/ })).toBeVisible();
    const live = board.locator('[data-match-id="900003"]');
    await expect(live).toContainText("بيراميدز");
    await expect(live).toContainText("67'");

    // Upcoming: Cairo kick-off time, no score.
    const upcoming = board.locator('[data-match-id="900004"]');
    await expect(upcoming).toContainText("10:00 م");
    await expect(upcoming.locator('[data-side="home"]')).toHaveCount(0);

    // Postponed: labelled, no score.
    const postponed = board.locator('[data-match-id="900005"]');
    await expect(postponed).toContainText("مؤجلة");
    await expect(postponed.locator('[data-side="home"]')).toHaveCount(0);

    // Duplicate with a stale copy → exactly one row, finished score kept (home 1, away 3).
    const finished = board.locator('[data-match-id="900006"]');
    await expect(finished).toHaveCount(1);
    await expect(finished.locator('[data-side="home"]')).toHaveText("1");
    await expect(finished.locator('[data-side="away"]')).toHaveText("3");
    await expect(finished).toContainText("انتهت");

    // Penalties shown with their own score.
    await expect(board.locator('[data-match-id="900011"]')).toContainText("ترجيح");

    // 00:30 Cairo match of tomorrow must not leak into today.
    await expect(page.locator('[data-match-id="900008"]')).toHaveCount(0);

    expect(await canonicalOf(page)).toMatch(/^http:\/\/localhost:3100\/?$/);
    await expectNoHorizontalScroll(page);
    expect(consoleErrors).toEqual([]);
  });

  test("status filters work without reloading", async ({ page, consoleErrors }) => {
    await page.goto("/matches/today");
    const board = page.locator(".match-board");
    await board.locator("label", { hasText: "مباشر" }).first().click();
    await expect(board.locator('.match-row[data-group="live"]').first()).toBeVisible();
    await expect(board.locator('.match-row[data-group="finished"]').first()).toBeHidden();
    await board.locator("label", { hasText: "منتهية" }).first().click();
    await expect(board.locator('[data-match-id="900006"]')).toBeVisible();
    await expect(board.locator('[data-match-id="900004"]')).toBeHidden();
    await board.locator("label", { hasText: "الكل" }).first().click();
    await expect(board.locator('[data-match-id="900004"]')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});

test.describe("day pages (Cairo time)", () => {
  test("yesterday shows final results", async ({ page, consoleErrors }) => {
    await page.goto("/matches/yesterday");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الأمس");
    const m = page.locator('[data-match-id="900001"]');
    await expect(m).toContainText("الأهلي");
    await expect(m.locator('[data-side="home"]')).toHaveText("2");
    await expect(m.locator('[data-side="away"]')).toHaveText("1");
    await expect(page.locator('nav[aria-label="اختيار اليوم"] [aria-current="page"]')).toContainText("أمس");
    await expectNoHorizontalScroll(page);
    expect(consoleErrors).toEqual([]);
  });

  test("tomorrow includes the 00:30 Cairo match and upcoming times", async ({ page, consoleErrors }) => {
    await page.goto("/matches/tomorrow");
    const late = page.locator('[data-match-id="900008"]');
    await expect(late).toContainText("12:30 ص");
    await expect(page.locator('[data-match-id="900009"]')).toContainText("7:00 م");
    await expect(page.locator('[data-match-id="900009"] [data-side="home"]')).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test("today page lists today's date and navigates by day", async ({ page, consoleErrors }) => {
    await page.goto("/matches/today");
    await expect(page.locator('nav[aria-label="اختيار اليوم"] [aria-current="page"]')).toContainText("اليوم");
    await page.getByRole("link", { name: /اليوم التالي/ }).click();
    await expect(page).toHaveURL(/\/matches\/tomorrow$/);
    expect(await canonicalOf(page)).toContain("/matches/tomorrow");
    expect(consoleErrors).toEqual([]);
  });

  test("date picker redirects to the date page", async ({ page }) => {
    const target = cairoDate(3);
    await page.goto(`/matches/go?d=${target}`);
    await expect(page).toHaveURL(new RegExp(`/matches/date/${target}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("مباريات");
  });

  test("date page for today points its canonical to /matches/today", async ({ page }) => {
    await page.goto(`/matches/date/${cairoDate(0)}`);
    expect(await canonicalOf(page)).toContain("/matches/today");
  });
});

test.describe("no data, provider failures and invalid input", () => {
  test("a day without matches shows a clear empty state", async ({ page, consoleErrors }) => {
    const res = await page.goto(`/matches/date/${cairoDate(4)}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText("لا توجد مباريات في هذا اليوم")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("a provider failure is explained (no fake data)", async ({ page, consoleErrors }) => {
    await page.goto(`/matches/date/${cairoDate(5)}`);
    await expect(page.locator('main [role="alert"]')).toContainText("تعذّر تحميل");
    await expect(page.locator(".match-row")).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test("invalid URLs return 404", async ({ page }) => {
    for (const url of ["/matches/date/2026-02-31", "/matches/date/not-a-date", "/matches/no-id-here", "/teams/abc", "/leagues/xyz", "/players/x", "/this-page-does-not-exist"]) {
      const res = await page.goto(url);
      expect(res?.status(), url).toBe(404);
    }
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الصفحة غير موجودة");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });

  test("an unknown match id returns 404", async ({ page }) => {
    const res = await page.goto("/matches/x-vs-y-123456789");
    expect(res?.status()).toBe(404);
  });
});
