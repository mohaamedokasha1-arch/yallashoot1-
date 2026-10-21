import { canonicalOf, expect, expectNoHorizontalScroll, test } from "./fixtures";

test.describe("Egyptian league page", () => {
  test("shows standings, fixtures, results, scorers and teams", async ({ page, consoleErrors }) => {
    const res = await page.goto("/leagues/egyptian-premier-league-233");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الدوري المصري الممتاز");
    const standings = page.locator("#standings table");
    await expect(standings.locator("tbody tr")).toHaveCount(16);
    await expect(standings.locator("tbody tr").first()).toContainText("الأهلي");
    await expect(page.locator("#fixtures")).toContainText("المباريات القادمة");
    await expect(page.locator("#results .match-row").first()).toBeVisible();
    await expect(page.locator("#scorers table tbody tr").first()).toBeVisible();
    await expect(page.locator("#teams a").first()).toBeVisible();
    expect(await canonicalOf(page)).toContain("/leagues/egyptian-premier-league-233");
    await expectNoHorizontalScroll(page);
    expect(consoleErrors).toEqual([]);
  });

  test("leagues index lists Egyptian competitions first and filters", async ({ page, consoleErrors }) => {
    await page.goto("/leagues");
    const first = page.locator("#leagues-directory section").first();
    await expect(first.locator("h2")).toContainText("الكرة المصرية");
    await expect(first).toContainText("كأس مصر");
    await page.getByLabel("ابحث عن بطولة أو دولة").fill("كأس مصر");
    await expect(page.getByText(/عدد النتائج/)).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(consoleErrors).toEqual([]);
  });
});

test.describe("match page", () => {
  test("finished match shows score, events, lineups, stats, H2H and standings", async ({ page, consoleErrors }) => {
    const res = await page.goto("/matches/al-ahly-vs-zamalek-sc-900001");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الأهلي ضد الزمالك");
    const header = page.locator('section[aria-label="ملخص المباراة"]');
    await expect(header.locator('[data-side="home"]').first()).toHaveText("2");
    await expect(header.locator('[data-side="away"]').first()).toHaveText("1");
    await expect(page.locator("#events")).toContainText("هدف");
    await expect(page.locator("#lineups")).toContainText("4-3-3");
    await expect(page.locator("#stats")).toContainText("الاستحواذ");
    await expect(page.locator("#h2h")).toContainText("المواجهات المباشرة");
    await expect(page.locator("#standings tr[aria-current]")).toHaveCount(2);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((t) => t.includes('"SportsEvent"'))).toBe(true);
    await expectNoHorizontalScroll(page);
    expect(consoleErrors).toEqual([]);
  });

  test("upcoming match has no score and explains missing lineups", async ({ page }) => {
    await page.goto("/matches/al-masry-vs-al-ittih-alexandria-900004");
    await expect(page.locator('section[aria-label="ملخص المباراة"] [data-side="home"]')).toHaveCount(0);
    await expect(page.locator("#lineups")).toContainText("التشكيل غير متاح");
  });

  test("non-canonical slugs keep the canonical URL", async ({ page }) => {
    await page.goto("/matches/wrong-text-900001");
    expect(await canonicalOf(page)).toContain("/matches/al-ahly-vs-zamalek-sc-900001");
  });
});

test.describe("team and player pages", () => {
  test("team page shows competitions, fixtures and squad; player page works", async ({ page, consoleErrors }) => {
    const res = await page.goto("/teams/al-ahly-1577");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الأهلي");
    await expect(page.locator("#competitions")).toContainText("الدوري المصري الممتاز");
    await expect(page.locator("#results .match-row").first()).toBeVisible();
    await expect(page.locator("#standing tr[aria-current]")).toHaveCount(1);
    const player = page.locator("#squad a").first();
    const href = await player.getAttribute("href");
    expect(href).toMatch(/^\/players\/.+-\d+$/);
    const pres = await page.goto(href!);
    expect(pres?.status()).toBe(200);
    await expect(page.locator("#stats table")).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(consoleErrors).toEqual([]);
  });

  test("a player without provider data is a 404, not an empty page", async ({ page }) => {
    const res = await page.goto("/players/nobody-999999999");
    expect(res?.status()).toBe(404);
  });
});

test.describe("search", () => {
  const queries: Array<[string, string]> = [
    ["الأهلي", "الأهلي"],
    ["الزمالك", "الزمالك"],
    ["بيراميدز", "بيراميدز"],
    ["الإسماعيلي", "الإسماعيلي"],
    ["سيراميكا كليوباترا", "سيراميكا كليوباترا"],
  ];
  for (const [q, name] of queries) {
    test(`finds ${q}`, async ({ page }) => {
      await page.goto(`/search?q=${encodeURIComponent(q)}`);
      await expect(page.locator("#teams a").first()).toContainText(name);
    });
  }

  test("shows suggestions while typing and a no-results state", async ({ page, consoleErrors }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.getByRole("combobox").pressSequentially("الاهلي", { delay: 30 });
    await expect(page.getByRole("listbox")).toContainText("الأهلي");
    await page.goto("/search?q=zzzzqqqxx");
    await expect(page.getByText("لا توجد نتائج")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
