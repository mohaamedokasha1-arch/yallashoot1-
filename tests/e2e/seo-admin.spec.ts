import { MOCK_API, canonicalOf, expect, test } from "./fixtures";

const desktopOnly = (name: string) => name !== "desktop-1440";

test.describe("SEO", () => {
  test("unique titles and canonicals on key pages", async ({ page }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    const pages = ["/", "/matches/today", "/matches/yesterday", "/matches/tomorrow", "/leagues", "/leagues/egyptian-premier-league-233", "/teams/al-ahly-1577", "/matches/al-ahly-vs-zamalek-sc-900001", "/news", "/about", "/privacy", "/terms", "/contact"];
    const titles = new Set<string>();
    for (const path of pages) {
      await page.goto(path);
      const title = await page.title();
      expect(title.length, path).toBeGreaterThan(10);
      expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
      titles.add(title);
      const canonical = await canonicalOf(page);
      expect(canonical, path).toBeTruthy();
      expect(canonical).not.toContain("?");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{30,}/);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
      expect(await page.locator('link[rel="alternate"][hreflang]').count()).toBe(0);
    }
  });

  test("robots.txt and sitemap.xml", async ({ request }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap: http://localhost:3100/sitemap.xml");
    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const xml = await sitemapRes.text();
    expect(xml).toContain("<loc>http://localhost:3100/</loc>");
    expect(xml).toContain("/leagues/egyptian-premier-league-233");
    expect(xml).toContain("/matches/al-ahly-vs-zamalek-sc-900001");
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/search");
  });

  test("structured data and Open Graph image on the home page", async ({ page }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    await page.goto("/");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((t) => t.includes('"WebSite"'))).toBe(true);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /opengraph-image/);
  });
});

test.describe("admin panel and protected routes", () => {
  test("login is required and wrong passwords are rejected", async ({ page }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    const res = await page.goto("/admin");
    expect(page.url()).toContain("/admin/login");
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    await page.getByLabel("اسم المستخدم").fill("admin");
    await page.getByLabel("كلمة المرور").fill("wrong-password");
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.getByText("بيانات الدخول غير صحيحة")).toBeVisible();
  });

  test("admin can sign in, see provider status, refresh data and sign out", async ({ page }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    await page.goto("/admin/login");
    await page.getByLabel("اسم المستخدم").fill("admin");
    await page.getByLabel("كلمة المرور").fill("e2e-admin-password");
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("لوحة المتابعة");
    await expect(page.getByText("حالة مزود البيانات")).toBeVisible();
    await expect(page.getByText("آخر طلب ناجح")).toBeVisible();
    await page.getByRole("button", { name: "تحديث مباريات اليوم" }).click();
    await expect(page.getByText(/تم التحديث بنجاح/)).toBeVisible();
    await page.goto("/admin/logs");
    await expect(page.locator("table").first()).toContainText("fixtures");
    await page.getByRole("button", { name: "خروج" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("cron endpoint requires the secret", async ({ request }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    expect((await request.get("/api/cron/refresh")).status()).toBe(401);
    expect((await request.get("/api/cron/refresh", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
    const ok = await request.get("/api/cron/refresh", { headers: { authorization: "Bearer e2e-cron-secret-0123456789" } });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.tasks.find((t: { name: string }) => t.name === "fixtures-today").ok).toBe(true);
  });

  test("security headers are set", async ({ request }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
    const health = await (await request.get("/api/health")).json();
    expect(JSON.stringify(health)).not.toContain("test-key");
  });
});

test.describe("caching", () => {
  test("visitors are served from cache (no provider call per visit)", async ({ page, request }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    await page.goto("/matches/today");
    const before = await (await request.get(`${MOCK_API}/__stats`)).json();
    for (let i = 0; i < 5; i++) await page.goto("/matches/today");
    const after = await (await request.get(`${MOCK_API}/__stats`)).json();
    expect(after.total - before.total).toBeLessThanOrEqual(1);
  });
});
