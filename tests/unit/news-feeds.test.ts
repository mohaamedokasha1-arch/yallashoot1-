import { describe, expect, it } from "vitest";
import { BUILTIN_FEEDS, BUILTIN_FEED_IDS, builtinFeedById } from "@/data/news-feeds";
import { deleteFeed, listFeeds, parseFeed, saveFeed, setFeedEnabled } from "@/lib/content/feeds";
import { safeHref } from "@/lib/content/markup";
import { validatePublicUrl } from "@/lib/content/safe-fetch";

describe("built-in news sources", () => {
  it("includes the Egyptian sports sources the site is built around", () => {
    const ids = [...BUILTIN_FEED_IDS];
    for (const id of ["youm7-sport", "masrawy-local-sport", "vetogate-sport", "elbalad-sport", "cairo24-sport", "elfagr-sport", "shorouk-sport"]) {
      expect(ids).toContain(id);
    }
    expect(builtinFeedById("youm7-sport")).toMatchObject({ name: "اليوم السابع", topic: "football" });
  });

  it("only lists fetchable public HTTPS feeds, each with a permission note", () => {
    expect(BUILTIN_FEEDS.length).toBeGreaterThanOrEqual(10);
    for (const f of BUILTIN_FEEDS) {
      // The same validation the admin form applies to a manually added source.
      expect(() => validatePublicUrl(f.url, [])).not.toThrow();
      expect(new URL(f.url).protocol).toBe("https:");
      expect(safeHref(f.homepage)).not.toBeNull();
      expect(f.permissionNote.length).toBeGreaterThanOrEqual(20);
      expect(f.name.trim().length).toBeGreaterThan(1);
      expect(f.limit).toBeGreaterThan(0);
      expect(f.limit).toBeLessThanOrEqual(20);
      expect(["football", "general"]).toContain(f.topic);
    }
    // Stable ids: duplicates would make two sources share one cache entry.
    expect(new Set(BUILTIN_FEEDS.map((f) => f.id)).size).toBe(BUILTIN_FEEDS.length);
    expect(new Set(BUILTIN_FEEDS.map((f) => f.url)).size).toBe(BUILTIN_FEEDS.length);
  });

  it("keeps football sources ahead of general news so the list stays about football", () => {
    const football = BUILTIN_FEEDS.filter((f) => f.topic === "football").reduce((n, f) => n + f.limit, 0);
    const general = BUILTIN_FEEDS.filter((f) => f.topic === "general").reduce((n, f) => n + f.limit, 0);
    expect(football).toBeGreaterThan(general * 4);
    expect(BUILTIN_FEEDS[0]?.id).toBe("youm7-sport");
  });
});

describe("feed source list", () => {
  it("ships the built-in sources enabled, with admin sources appended", async () => {
    const feeds = await listFeeds();
    expect(feeds.slice(0, BUILTIN_FEEDS.length).every((f) => f.builtin && f.enabled)).toBe(true);
    expect(feeds[0]?.id).toBe("youm7-sport");

    await saveFeed(
      { name: "مصدر النادي", url: "https://club.example.com/feed", homepage: "https://club.example.com", permissionNote: "إذن مكتوب من النادي", enabled: true },
      "admin",
    );
    const after = await listFeeds();
    expect(after).toHaveLength(BUILTIN_FEEDS.length + 1);
    expect(after.at(-1)?.name).toBe("مصدر النادي");
    expect(after.at(-1)?.builtin).toBeFalsy();
  });

  it("disables a built-in source instead of deleting it, and re-enables it", async () => {
    await deleteFeed("youm7-sport", "admin");
    const disabled = await listFeeds();
    expect(disabled).toHaveLength(BUILTIN_FEEDS.length);
    expect(disabled.find((f) => f.id === "youm7-sport")?.enabled).toBe(false);

    await setFeedEnabled("youm7-sport", true, "admin");
    expect((await listFeeds()).find((f) => f.id === "youm7-sport")?.enabled).toBe(true);
  });

  it("refuses to overwrite a built-in source through the admin form", async () => {
    await expect(
      saveFeed({ name: "بديل", url: "https://other.example.com/feed", homepage: null, permissionNote: "سند إذن", enabled: true }, "admin", "youm7-sport"),
    ).rejects.toThrow();
    expect((await listFeeds()).find((f) => f.id === "youm7-sport")?.name).toBe("اليوم السابع");
  });
});

describe("feed parsing of a real publisher shape", () => {
  it("reads the Youm7-style item (CDATA title, source line in the description)", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel>
      <title><![CDATA[rss-أخبار الرياضة]]></title>
      <item>
        <title><![CDATA[الأهلي يستضيف القناة الليلة في الدوري]]></title>
        <link>https://www.youm7.com/story/2026/10/21/x/7586401</link>
        <description><![CDATA[المصدر:اليوم السابع]]></description>
        <pubDate>Wed, 21 Oct 2026 10:00:00 GMT</pubDate>
      </item>
      <item><title>بلا رابط</title></item>
    </channel></rss>`;
    const items = parseFeed(xml, { id: "youm7-sport", name: "اليوم السابع" });
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      title: "الأهلي يستضيف القناة الليلة في الدوري",
      link: "https://www.youm7.com/story/2026/10/21/x/7586401",
      publishedAt: "2026-10-21T10:00:00.000Z",
      sourceName: "اليوم السابع",
      sourceId: "youm7-sport",
    });
  });

  it("honours the per-source headline limit", () => {
    const item = (n: number) =>
      `<item><title>خبر ${n}</title><link>https://example.com/${n}</link><pubDate>Wed, 21 Oct 2026 10:0${n % 10}:00 GMT</pubDate></item>`;
    const xml = `<rss><channel>${Array.from({ length: 20 }, (_, i) => item(i)).join("")}</channel></rss>`;
    expect(parseFeed(xml, { id: "s", name: "مصدر" }, 4)).toHaveLength(4);
  });
});
