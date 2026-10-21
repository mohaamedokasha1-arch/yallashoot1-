import "server-only";
import { COMPETITIONS } from "@/data/competitions";
import { countryNameAr } from "@/data/countries";
import { TEAM_NAMES } from "@/data/teams";
import { addDays } from "@/lib/utils/dates";
import { compactKey, isArabic, matchScore, normalizeText, searchTokens } from "@/lib/utils/arabic";
import { entitySlug } from "@/lib/utils/slug";
import { getResource, peekResource } from "./cache";
import { leagueSlug } from "./providers/api-football/mapper";
import { getProvider } from "./providers";
import { indexTeams, loadIndex } from "./search-index";
import { cairoToday } from "./service";
import { leagueNameAr, teamAliases, teamNameAr } from "./names";
import type { League, LeagueRef, Match, SearchResults, Team } from "./types";

export const MAX_QUERY_LENGTH = 60;

export function sanitizeQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

type TeamHit = SearchResults["teams"][number] & { score: number };
type LeagueHit = LeagueRef & { score: number };
type PlayerHit = SearchResults["players"][number] & { score: number };

function upsert<T extends { id: number; score: number }>(map: Map<number, T>, item: T) {
  const prev = map.get(item.id);
  if (!prev || item.score > prev.score) map.set(item.id, item);
}

function leagueRefFromRegistry(entry: (typeof COMPETITIONS)[number]): LeagueRef {
  return {
    id: entry.id,
    name: entry.apiName,
    nameAr: entry.nameAr,
    country: entry.apiCountry,
    countryAr: countryNameAr(entry.apiCountry),
    logo: `https://media.api-sports.io/football/leagues/${entry.id}.png`,
    flag: null,
    season: null,
    round: null,
    slug: `${entry.slug}-${entry.id}`,
  };
}

function leagueRefFromLeague(l: League): LeagueRef {
  return {
    id: l.id,
    name: l.name,
    nameAr: l.nameAr,
    country: l.country.name,
    countryAr: l.country.nameAr,
    logo: l.logo,
    flag: l.country.flag,
    season: null,
    round: null,
    slug: l.slug,
  };
}

export async function searchFootball(
  rawQuery: string,
  opts: { allowProvider?: boolean; limit?: number } = {},
): Promise<SearchResults> {
  const query = sanitizeQuery(rawQuery);
  const empty: SearchResults = { query, teams: [], leagues: [], players: [], matches: [], providerSearched: false };
  if (searchTokens(query).length === 0) return empty;
  const limit = opts.limit ?? 12;

  const teams = new Map<number, TeamHit>();
  const leagues = new Map<number, LeagueHit>();
  const players = new Map<number, PlayerHit>();

  // 1) Curated dictionary (Arabic names + aliases).
  for (const t of TEAM_NAMES) {
    if (t.legacy) continue;
    const score = matchScore(query, [t.ar, ...t.api, ...(t.aliases ?? [])]);
    if (score > 0) {
      upsert(teams, {
        id: t.id,
        name: t.api[0] ?? t.ar,
        nameAr: t.ar,
        logo: `https://media.api-sports.io/football/teams/${t.id}.png`,
        slug: entitySlug(t.api[0] ?? String(t.id), t.id),
        country: t.country,
        countryAr: countryNameAr(t.country),
        score: score + (t.country === "Egypt" ? 6 : 0) + (t.notable ? 3 : 0),
      });
    }
  }
  for (const c of COMPETITIONS) {
    const countryAr = countryNameAr(c.apiCountry) ?? "";
    const score = matchScore(query, [c.nameAr, c.apiName, `${c.apiName} ${c.apiCountry}`, `${c.nameAr} ${countryAr}`, c.slug.replace(/-/g, " ")]);
    if (score > 0) upsert(leagues, { ...leagueRefFromRegistry(c), score: score + (c.region === "egypt" ? 6 : 0) });
  }

  // 2) Entities seen in provider data (no API cost).
  const index = await loadIndex();
  for (const t of index.teams) {
    const nameAr = teamNameAr(t.id, t.name, t.country);
    const score = matchScore(query, [t.name, nameAr ?? "", ...teamAliases(t.id)]);
    if (score > 0) {
      upsert(teams, {
        id: t.id,
        name: t.name,
        nameAr,
        logo: t.logo,
        slug: entitySlug(t.name, t.id),
        country: t.country,
        countryAr: countryNameAr(t.country),
        score: score + (t.country === "Egypt" ? 6 : 0),
      });
    }
  }
  const allLeagues = await peekResource<League[]>("leagues:current");
  for (const l of allLeagues?.data ?? []) {
    const score = matchScore(query, [l.name, l.nameAr ?? "", `${l.name} ${l.country.name}`, `${l.nameAr ?? ""} ${l.country.nameAr ?? ""}`, l.country.nameAr ?? ""]);
    if (score > 0) upsert(leagues, { ...leagueRefFromLeague(l), score: score + (l.country.name === "Egypt" ? 6 : 0) });
  }
  for (const l of index.leagues) {
    const nameAr = leagueNameAr(l.id, l.country);
    const score = matchScore(query, [l.name, nameAr ?? "", `${l.name} ${l.country ?? ""}`]);
    if (score > 0 && !leagues.has(l.id)) {
      upsert(leagues, {
        id: l.id,
        name: l.name,
        nameAr,
        country: l.country,
        countryAr: countryNameAr(l.country),
        logo: l.logo,
        flag: null,
        season: null,
        round: null,
        slug: leagueSlug(l.id, l.name, l.country),
        score,
      });
    }
  }
  for (const p of index.players) {
    const score = matchScore(query, [p.name]);
    if (score > 0) {
      upsert(players, { id: p.id, name: p.name, photo: p.photo, nationality: null, slug: entitySlug(p.name, p.id), teamName: p.team, score });
    }
  }

  // 3) Provider search for Latin queries (budget permitting, cached per query).
  let providerSearched = false;
  const compact = compactKey(query);
  if (opts.allowProvider && !isArabic(query) && compact.length >= 3 && teams.size < 3) {
    const normalized = normalizeText(query);
    const res = await getResource<Team[]>({
      key: `search:teams:${normalized}`,
      priority: "low",
      ttl: 7 * 86400,
      fetcher: async () => getProvider().getTeams({ search: normalized }),
    });
    if (res.source === "provider" && res.data) await indexTeams(res.data);
    providerSearched = res.data !== null;
    for (const t of res.data ?? []) {
      const score = Math.max(matchScore(query, [t.name, t.nameAr ?? ""]), 40);
      upsert(teams, {
        id: t.id,
        name: t.name,
        nameAr: t.nameAr,
        logo: t.logo,
        slug: t.slug,
        country: t.country,
        countryAr: t.countryAr,
        score: score + (t.country === "Egypt" ? 6 : 0),
      });
    }
  }

  // 4) Matches around today involving matching teams.
  const today = cairoToday();
  const matches: Array<{ match: Match; rank: number }> = [];
  const seenMatches = new Set<number>();
  for (const date of [addDays(today, -1), today, addDays(today, 1)]) {
    const day = await peekResource<Match[]>(`fx:date:${date}`);
    for (const m of day?.data ?? []) {
      if (seenMatches.has(m.id)) continue;
      const rank = Math.max(
        matchScore(query, [m.home.name, m.home.nameAr ?? "", ...teamAliases(m.home.id)]),
        matchScore(query, [m.away.name, m.away.nameAr ?? "", ...teamAliases(m.away.id)]),
        matchScore(query, [`${m.home.nameAr ?? m.home.name} ${m.away.nameAr ?? m.away.name}`, `${m.home.name} ${m.away.name}`]),
      );
      if (rank >= 45) {
        seenMatches.add(m.id);
        matches.push({ match: m, rank });
      }
    }
  }

  const byScore = <T extends { score: number }>(a: T, b: T) => b.score - a.score;
  const strip = <T extends { score: number }>({ score: _score, ...rest }: T) => rest;
  return {
    query,
    teams: [...teams.values()].sort(byScore).slice(0, limit).map(strip),
    leagues: [...leagues.values()].sort(byScore).slice(0, Math.min(limit, 10)).map(strip),
    players: [...players.values()].sort(byScore).slice(0, Math.min(limit, 10)).map(strip),
    matches: matches
      .sort((a, b) => b.rank - a.rank || a.match.timestamp - b.match.timestamp)
      .slice(0, 10)
      .map((x) => x.match),
    providerSearched,
  };
}
