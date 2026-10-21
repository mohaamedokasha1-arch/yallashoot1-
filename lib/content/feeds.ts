import "server-only";
import { randomUUID } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { BUILTIN_FEEDS, BUILTIN_FEED_IDS, type FeedTopic } from "@/data/news-feeds";
import { newsAllowedHosts } from "@/lib/env";
import { recordError } from "@/lib/monitoring";
import { getStore } from "@/lib/store";
import { safeHref } from "./markup";
import { safeFetchText, validatePublicUrl } from "./safe-fetch";

/**
 * News feeds (RSS/Atom): the free sources shipped in `data/news-feeds.ts` plus
 * any source the admin adds. Only headlines, dates and links to the original
 * article are shown — never the article body or images.
 * Built-in sources can be disabled from the admin panel but not edited, so the
 * catalogue in git stays the record of what is fetched and why it is allowed.
 */

export const feedInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  url: z.string().trim().max(500),
  homepage: z.string().trim().max(500).transform((v) => (v ? v : null)).nullable().default(null),
  permissionNote: z.string().trim().min(5, "اذكر سند الإذن/الترخيص").max(300),
  enabled: z.boolean().default(true),
});

export type FeedInput = z.infer<typeof feedInputSchema>;

export interface FeedSource extends FeedInput {
  id: string;
  addedAt: string;
  addedBy: string;
  /** Defined in `data/news-feeds.ts`: disabled instead of deleted. */
  builtin?: boolean;
  topic?: FeedTopic;
  section?: string;
  limit?: number;
}

export interface FeedItem {
  title: string;
  link: string;
  publishedAt: string | null;
  sourceName: string;
  sourceId: string;
}

interface FeedCache {
  items: FeedItem[];
  fetchedAt: string;
  freshUntil: number;
  error: string | null;
}

const FEEDS_KEY = "content:feeds";
const FEED_OVERRIDES_KEY = "content:feed-overrides";
const FEED_TTL_MS = 30 * 60_000;

interface FeedOverride {
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

async function readOverrides(): Promise<Record<string, FeedOverride>> {
  try {
    const raw = await getStore().get<Record<string, FeedOverride>>(FEED_OVERRIDES_KEY);
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

async function writeOverrides(overrides: Record<string, FeedOverride>): Promise<void> {
  await getStore().set(FEED_OVERRIDES_KEY, overrides);
}

async function listCustomFeeds(): Promise<FeedSource[]> {
  try {
    return Object.values(await getStore().hgetall<FeedSource>(FEEDS_KEY))
      .filter((f) => f && typeof f.id === "string")
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  } catch {
    return [];
  }
}

/** Built-in free sources (catalogue order) followed by admin-added sources. */
export async function listFeeds(): Promise<FeedSource[]> {
  const overrides = await readOverrides();
  const builtin: FeedSource[] = BUILTIN_FEEDS.map((f) => ({
    id: f.id,
    name: f.name,
    url: f.url,
    homepage: f.homepage,
    permissionNote: f.permissionNote,
    enabled: overrides[f.id]?.enabled ?? true,
    addedAt: "",
    addedBy: "المصادر المضمّنة",
    builtin: true,
    topic: f.topic,
    section: f.section,
    limit: f.limit,
  }));
  return [...builtin, ...(await listCustomFeeds()).filter((f) => !BUILTIN_FEED_IDS.has(f.id))];
}

/** Enables/disables a source. Built-in sources are kept in the catalogue. */
export async function setFeedEnabled(id: string, enabled: boolean, user: string): Promise<void> {
  const overrides = await readOverrides();
  overrides[id] = { enabled, updatedAt: new Date().toISOString(), updatedBy: user };
  await writeOverrides(overrides);
  await getStore().del(`feed:items:${id}`);
}

export async function saveFeed(input: FeedInput, user: string, id?: string): Promise<FeedSource> {
  validatePublicUrl(input.url, newsAllowedHosts());
  if (input.homepage && !safeHref(input.homepage)) throw new Error("رابط الصفحة الرئيسية غير صالح");
  if (id && BUILTIN_FEED_IDS.has(id)) throw new Error("المصادر المضمّنة لا تُعدَّل، يمكن تعطيلها فقط");
  const feeds = await listCustomFeeds();
  const existing = id ? feeds.find((f) => f.id === id) : undefined;
  const feed: FeedSource = {
    ...input,
    id: existing?.id ?? randomUUID(),
    addedAt: existing?.addedAt ?? new Date().toISOString(),
    addedBy: existing?.addedBy ?? user,
  };
  await getStore().hset(FEEDS_KEY, { [feed.id]: feed });
  await getStore().del(`feed:items:${feed.id}`);
  return feed;
}

/** Removes an admin-added source; a built-in one is disabled instead. */
export async function deleteFeed(id: string, user = "admin"): Promise<void> {
  if (BUILTIN_FEED_IDS.has(id)) {
    await setFeedEnabled(id, false, user);
    return;
  }
  await getStore().hdel(FEEDS_KEY, id);
  await getStore().del(`feed:items:${id}`);
}

function textOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) return textOf((value as Record<string, unknown>)["#text"]);
  return null;
}

function cleanTitle(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function toIso(value: string | null): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Parses RSS 2.0 / Atom into headline items (pure, unit-tested). */
export function parseFeed(xml: string, source: { id: string; name: string }, limit = 20): FeedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: true,
    htmlEntities: true,
    parseTagValue: false,
    trimValues: true,
  });
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }
  const items: FeedItem[] = [];
  const rss = doc.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  const feed = doc.feed as Record<string, unknown> | undefined;
  const rawItems = channel?.item ?? feed?.entry ?? [];
  for (const raw of Array.isArray(rawItems) ? rawItems : [rawItems]) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const title = textOf(it.title);
    let link = textOf(it.link);
    if (!link && it.link && typeof it.link === "object") {
      const links = Array.isArray(it.link) ? it.link : [it.link];
      const alt = links.find((l) => l && typeof l === "object" && ((l as Record<string, unknown>)["@_rel"] ?? "alternate") === "alternate") as
        | Record<string, unknown>
        | undefined;
      link = textOf(alt?.["@_href"]);
    }
    const href = link ? safeHref(link.trim()) : null;
    if (!title || !href) continue;
    items.push({
      title: cleanTitle(title),
      link: href,
      publishedAt: toIso(textOf(it.pubDate) ?? textOf(it.published) ?? textOf(it.updated) ?? textOf(it["dc:date"])),
      sourceName: source.name,
      sourceId: source.id,
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function refreshFeed(feed: FeedSource, previous: FeedCache | null): Promise<FeedCache> {
  try {
    const { text } = await safeFetchText(feed.url, { allowedHosts: newsAllowedHosts(), maxBytes: 1_500_000 });
    const items = parseFeed(text, feed, feed.limit ?? 20);
    const cache: FeedCache = { items, fetchedAt: new Date().toISOString(), freshUntil: Date.now() + FEED_TTL_MS, error: null };
    await getStore().set(`feed:items:${feed.id}`, cache, 7 * 86400);
    return cache;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordError({ source: "feed", kind: "fetch_failed", message, key: feed.name });
    const cache: FeedCache = {
      items: previous?.items ?? [],
      fetchedAt: previous?.fetchedAt ?? new Date(0).toISOString(),
      freshUntil: Date.now() + 10 * 60_000,
      error: message,
    };
    await getStore().set(`feed:items:${feed.id}`, cache, 7 * 86400);
    return cache;
  }
}

export async function getFeedItems(options: { force?: boolean } = {}): Promise<{ items: FeedItem[]; errors: Array<{ feed: string; error: string }> }> {
  const feeds = (await listFeeds()).filter((f) => f.enabled);
  const errors: Array<{ feed: string; error: string }> = [];
  const lists = await Promise.all(
    feeds.map(async (feed) => {
      const cached = await getStore().get<FeedCache>(`feed:items:${feed.id}`);
      const cache = !options.force && cached && cached.freshUntil > Date.now() ? cached : await refreshFeed(feed, cached);
      if (cache.error) errors.push({ feed: feed.name, error: cache.error });
      return cache.items;
    }),
  );
  const seen = new Set<string>();
  const items = lists
    .flat()
    .filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true)))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return { items: items.slice(0, 60), errors };
}

export interface FeedSourceLabel {
  name: string;
  homepage: string | null;
}

/**
 * Publisher names + homepages of the enabled sources, for the attribution list
 * under the headlines. Cached like every other render-time store read.
 */
export async function qFeedSources(): Promise<FeedSourceLabel[]> {
  "use cache";
  cacheLife("reference");
  cacheTag("feeds");
  const byName = new Map<string, string | null>();
  for (const f of await listFeeds()) {
    if (!f.enabled) continue;
    const home = typeof f.homepage === "string" && f.homepage ? f.homepage : null;
    const known = byName.get(f.name);
    if (!byName.has(f.name)) byName.set(f.name, home);
    else if (!known && home) byName.set(f.name, home);
  }
  return [...byName.entries()].map(([name, homepage]) => ({ name, homepage }));
}

export async function qHeadlines(): Promise<FeedItem[]> {
  "use cache";
  cacheLife("news");
  cacheTag("feeds");
  try {
    return (await getFeedItems()).items;
  } catch {
    return [];
  }
}
