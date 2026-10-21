import { expect, test } from "./fixtures";

const desktopOnly = (name: string) => name !== "desktop-1440";

/**
 * Runs after the other suites (file order): crawling hundreds of cold pages
 * deliberately exhausts the per-minute provider budget of the test server.
 */
test.describe("internal links", () => {
  test("no dead internal links on the main pages", async ({ page, request }, info) => {
    test.skip(desktopOnly(info.project.name), "runs once");
    test.setTimeout(240_000);
    const start = ["/", "/matches/today", "/matches/yesterday", "/matches/tomorrow", "/leagues", "/leagues/egyptian-premier-league-233", "/matches/al-ahly-vs-zamalek-sc-900001", "/teams/al-ahly-1577", "/news", "/search?q=%D8%A7%D9%84%D8%A3%D9%87%D9%84%D9%8A"];
    const links = new Set<string>();
    for (const path of start) {
      await page.goto(path);
      const hrefs = await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href") ?? ""));
      for (const h of hrefs) links.add(h.split("#")[0]!);
    }
    const checked: Array<[string, number]> = [];
    for (const link of links) {
      if (!link || link.startsWith("/admin")) continue;
      const res = await request.get(link, { maxRedirects: 5 });
      checked.push([link, res.status()]);
    }
    const broken = checked.filter(([, s]) => s >= 400);
    expect(broken, `checked ${checked.length} links`).toEqual([]);
    expect(checked.length).toBeGreaterThan(40);
  });
});

