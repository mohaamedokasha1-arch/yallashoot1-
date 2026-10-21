/**
 * Built-in free news sources (RSS/Atom).
 *
 * Every feed below is a free, publicly published feed of its own publisher:
 * it was opened and checked on 2026-10-21 and returned current items. The site
 * shows ONLY the headline, its publication date, the publisher name and a link
 * to the original article — never the article body, the images or the videos.
 *
 * Re-publishing headlines is the publisher's decision, not ours: each entry
 * carries the note describing why the feed is considered usable. If a publisher
 * asks to be removed, disable the source in the admin panel (or delete the
 * entry here) — no code change is needed anywhere else.
 *
 * Order matters: Egyptian football sources first, then Arab/international
 * sports, then general news (general feeds contribute fewer headlines).
 */

export type FeedTopic = "football" | "general";

export interface BuiltinFeed {
  /** Stable id — also the store key for cached items. Never reuse it. */
  id: string;
  /** Publisher name shown next to the headline. */
  name: string;
  /** Feed section, shown in the admin list. */
  section: string;
  url: string;
  homepage: string;
  topic: FeedTopic;
  /** Maximum number of headlines taken from this feed per refresh. */
  limit: number;
  permissionNote: string;
}

const FREE_RSS_NOTE =
  "خلاصة RSS مجانية ينشرها الناشر بنفسه على موقعه. يُعرض العنوان وتاريخ النشر واسم المصدر ورابط الخبر الأصلي فقط، دون نسخ نص الخبر أو صوره.";

const DECLARED_FREE_NOTE =
  "خدمة RSS مجانية معلنة على صفحة خدمة RSS لدى الناشر («خدمة إخبارية مجانية ولا يتم احتساب أي رسوم على استخدامها»). يُعرض العنوان والتاريخ ورابط الخبر الأصلي فقط.";

export const BUILTIN_FEEDS: readonly BuiltinFeed[] = [
  // ── مصر: كرة قدم ────────────────────────────────────────────────────────
  {
    id: "youm7-sport",
    name: "اليوم السابع",
    section: "أخبار الرياضة",
    url: "https://www.youm7.com/rss/SectionRss?SectionID=298",
    homepage: "https://www.youm7.com/",
    topic: "football",
    limit: 12,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "masrawy-local-sport",
    name: "مصراوي",
    section: "رياضة محلية",
    url: "https://www.masrawy.com/rss/feed/577/%D8%A3%D8%AE%D8%A8%D8%A7%D8%B1-%D9%85%D8%AD%D9%84%D9%8A%D8%A9",
    homepage: "https://www.masrawy.com/sports/sports_news",
    topic: "football",
    limit: 12,
    permissionNote: DECLARED_FREE_NOTE,
  },
  {
    id: "masrawy-sport",
    name: "مصراوي",
    section: "رياضة (عربية وعالمية)",
    url: "https://www.masrawy.com/rss/feed/27/%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9",
    homepage: "https://www.masrawy.com/channel/sports",
    topic: "football",
    limit: 8,
    permissionNote: DECLARED_FREE_NOTE,
  },
  {
    id: "vetogate-sport",
    name: "فيتو",
    section: "رياضة",
    url: "https://www.vetogate.com/rss.aspx?id=2",
    homepage: "https://www.vetogate.com/category/2",
    topic: "football",
    limit: 10,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "elbalad-sport",
    name: "صدى البلد",
    section: "رياضة",
    url: "https://www.elbalad.news/rss.aspx?id=5",
    homepage: "https://www.elbalad.news/category/5",
    topic: "football",
    limit: 10,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "cairo24-sport",
    name: "القاهرة 24",
    section: "رياضة",
    url: "https://www.cairo24.com/rss.aspx?id=7",
    homepage: "https://www.cairo24.com/category/7",
    topic: "football",
    limit: 10,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "elfagr-sport",
    name: "بوابة الفجر",
    section: "الفجر الرياضي",
    url: "https://www.elfagr.org/rss.aspx?id=38",
    homepage: "https://www.elfagr.org/category/38",
    topic: "football",
    limit: 10,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "shorouk-sport",
    name: "بوابة الشروق",
    section: "رياضة",
    url: "https://www.shorouknews.com/sports/rss",
    homepage: "https://www.shorouknews.com/sports",
    topic: "football",
    limit: 10,
    permissionNote:
      "خدمة RSS مجانية معلنة على صفحة «خدمة محتوى جريدة الشروق RSS» («الخدمة مجانية ولا تحتاج إلى تسجيل»). يُعرض العنوان والتاريخ ورابط الخبر الأصلي فقط.",
  },

  // ── رياضة عربية ودولية ───────────────────────────────────────────────────
  {
    id: "skynewsarabia-sport",
    name: "سكاي نيوز عربية",
    section: "رياضة",
    url: "https://www.skynewsarabia.com/web/rss/sport.xml",
    homepage: "https://www.skynewsarabia.com/sport",
    topic: "football",
    limit: 8,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "alarabiya-sport",
    name: "العربية",
    section: "رياضة",
    url: "https://www.alarabiya.net/feed/rss2/ar/sport.xml",
    homepage: "https://www.alarabiya.net/sport",
    topic: "football",
    limit: 8,
    permissionNote: DECLARED_FREE_NOTE,
  },
  {
    id: "france24-sport",
    name: "فرانس 24",
    section: "رياضة",
    url: "https://www.france24.com/ar/%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9/rss",
    homepage: "https://www.france24.com/ar/%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9/",
    topic: "football",
    limit: 8,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "rt-sport",
    name: "RT Arabic",
    section: "رياضة",
    url: "https://rtarabic.com/rss/sport/",
    homepage: "https://rtarabic.com/sport/",
    topic: "football",
    limit: 6,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "aawsat-sport",
    name: "الشرق الأوسط",
    section: "الرياضة",
    url: "https://aawsat.com/feed/sport",
    homepage: "https://aawsat.com/%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9",
    topic: "football",
    limit: 6,
    permissionNote: "خدمة RSS مجانية معلنة على صفحة «خدمة RSS» لدى الناشر. يُعرض العنوان والتاريخ ورابط الخبر الأصلي فقط.",
  },

  // ── أخبار عامة (عدد عناوين أقل) ──────────────────────────────────────────
  {
    id: "almasryalyoum",
    name: "المصري اليوم",
    section: "أخبار",
    url: "https://www.almasryalyoum.com/rss/rssfeeds",
    homepage: "https://www.almasryalyoum.com/",
    topic: "general",
    limit: 4,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "aljazeera-net",
    name: "الجزيرة نت",
    section: "آخر الأخبار",
    url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9",
    homepage: "https://www.aljazeera.net/",
    topic: "general",
    limit: 4,
    permissionNote: FREE_RSS_NOTE,
  },
  {
    id: "bbc-arabic",
    name: "بي بي سي عربي",
    section: "أخبار",
    url: "https://feeds.bbci.co.uk/arabic/rss.xml",
    homepage: "https://www.bbc.com/arabic",
    topic: "general",
    limit: 4,
    permissionNote: "خلاصة RSS مجانية تنشرها بي بي سي لخدمة القراء. يُعرض العنوان والتاريخ ورابط الخبر الأصلي فقط.",
  },
];

export const BUILTIN_FEED_IDS: ReadonlySet<string> = new Set(BUILTIN_FEEDS.map((f) => f.id));

export function builtinFeedById(id: string): BuiltinFeed | undefined {
  return BUILTIN_FEEDS.find((f) => f.id === id);
}
