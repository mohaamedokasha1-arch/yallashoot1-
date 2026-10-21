import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { competitionById, COMPETITIONS } from "@/data/competitions";
import { listArticles } from "@/lib/content/articles";
import { siteUrl } from "@/lib/env";
import { competitionPath, notableTeams } from "@/lib/football/featured";
import { isEgyptianMatch } from "@/lib/football/grouping";
import { qFixturesByDate, qLeagues, qToday } from "@/lib/football/queries";
import { addDays } from "@/lib/utils/dates";

/**
 * Dynamic sitemap: static pages, registry competitions, notable teams,
 * published articles and matches of yesterday/today/tomorrow in featured
 * competitions (all URLs are canonical).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("fixtures");
  cacheTag("sitemap", "fixtures", "articles");
  const base = siteUrl();
  const today = await qToday();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "always", priority: 1 },
    { url: `${base}/matches/today`, changeFrequency: "always", priority: 0.9 },
    { url: `${base}/matches/yesterday`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/matches/tomorrow`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/leagues`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/news`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.2 },
  ];
  // Only list registry competitions the provider currently knows (no dead URLs).
  const leagues = await qLeagues();
  const active = leagues.data ? new Set(leagues.data.map((l) => l.id)) : null;
  for (const c of COMPETITIONS) {
    if (active && !active.has(c.id)) continue;
    entries.push({ url: `${base}${competitionPath(c)}`, changeFrequency: "daily", priority: c.region === "egypt" ? 0.8 : 0.6 });
  }
  for (const t of notableTeams()) {
    entries.push({ url: `${base}${t.href}`, changeFrequency: "daily", priority: t.country === "Egypt" ? 0.7 : 0.5 });
  }
  const articles = await listArticles(false);
  for (const a of articles) {
    entries.push({ url: `${base}/news/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly", priority: 0.5 });
  }
  for (const date of [addDays(today, -1), today, addDays(today, 1)]) {
    const res = await qFixturesByDate(date);
    for (const m of res.data ?? []) {
      const featured = isEgyptianMatch(m) || competitionById(m.league.id)?.featured;
      if (featured) entries.push({ url: `${base}/matches/${m.slug}`, changeFrequency: "hourly", priority: 0.6 });
    }
  }
  return entries;
}
