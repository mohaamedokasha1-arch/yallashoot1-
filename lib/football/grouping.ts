import {
  competitionById,
  EGYPT_NATIONAL_TEAM_IDS,
  REGION_LABELS_AR,
  REGION_ORDER,
  type Region,
} from "@/data/competitions";
import { AFRICAN_COUNTRIES, ARAB_COUNTRIES, EUROPEAN_COUNTRIES } from "@/data/countries";
import type { LeagueRef, Match } from "./types";

export interface LeagueGroup {
  key: string;
  league: LeagueRef;
  region: Region;
  priority: number;
  featured: boolean;
  matches: Match[];
}

export interface RegionGroup {
  region: Region;
  label: string;
  leagues: LeagueGroup[];
  count: number;
}

export function isEgyptianMatch(m: Match): boolean {
  return (
    m.league.country === "Egypt" || EGYPT_NATIONAL_TEAM_IDS.has(m.home.id) || EGYPT_NATIONAL_TEAM_IDS.has(m.away.id)
  );
}

export function regionForLeague(league: Pick<LeagueRef, "id" | "country">): Region {
  const entry = competitionById(league.id);
  if (entry && (!league.country || entry.apiCountry === league.country)) return entry.region;
  const c = league.country ?? "";
  if (c === "Egypt") return "egypt";
  if (c === "England") return "england";
  if (ARAB_COUNTRIES.has(c)) return "arab";
  if (EUROPEAN_COUNTRIES.has(c)) return "europe";
  if (AFRICAN_COUNTRIES.has(c)) return "africa";
  return "other";
}

export function regionForMatch(m: Match): Region {
  if (isEgyptianMatch(m)) return "egypt";
  return regionForLeague(m.league);
}

function leaguePriority(league: LeagueRef): { priority: number; featured: boolean } {
  const entry = competitionById(league.id);
  if (entry && (!league.country || entry.apiCountry === league.country)) {
    return { priority: entry.priority, featured: entry.featured };
  }
  return { priority: 1000, featured: league.country === "Egypt" };
}

/** Groups matches by (region, league), ordered Egypt first then by registry priority. */
export function groupByLeague(matches: readonly Match[]): LeagueGroup[] {
  const groups = new Map<string, LeagueGroup>();
  for (const m of matches) {
    const region = regionForMatch(m);
    const key = `${region}:${m.league.id}`;
    let group = groups.get(key);
    if (!group) {
      const { priority, featured } = leaguePriority(m.league);
      group = { key, league: m.league, region, priority, featured: featured || region === "egypt", matches: [] };
      groups.set(key, group);
    }
    group.matches.push(m);
  }
  const regionIndex = (r: Region) => REGION_ORDER.indexOf(r);
  return [...groups.values()]
    .map((g) => ({ ...g, matches: [...g.matches].sort((a, b) => a.timestamp - b.timestamp || a.id - b.id) }))
    .sort(
      (a, b) =>
        regionIndex(a.region) - regionIndex(b.region) ||
        a.priority - b.priority ||
        (a.league.country ?? "").localeCompare(b.league.country ?? "") ||
        a.league.name.localeCompare(b.league.name) ||
        a.league.id - b.league.id,
    );
}

export function groupByRegion(matches: readonly Match[]): RegionGroup[] {
  const byRegion = new Map<Region, LeagueGroup[]>();
  for (const g of groupByLeague(matches)) {
    const list = byRegion.get(g.region) ?? [];
    list.push(g);
    byRegion.set(g.region, list);
  }
  return REGION_ORDER.filter((r) => byRegion.has(r)).map((region) => {
    const leagues = byRegion.get(region) ?? [];
    return {
      region,
      label: REGION_LABELS_AR[region],
      leagues,
      count: leagues.reduce((n, g) => n + g.matches.length, 0),
    };
  });
}

/** Splits league groups into featured (shown in full) and the rest (compact). */
export function splitFeatured(groups: readonly LeagueGroup[]): { featured: LeagueGroup[]; others: LeagueGroup[] } {
  const featured: LeagueGroup[] = [];
  const others: LeagueGroup[] = [];
  for (const g of groups) (g.featured ? featured : others).push(g);
  return { featured, others };
}

export function countByGroup(matches: readonly Match[]) {
  let live = 0;
  let upcoming = 0;
  let finished = 0;
  for (const m of matches) {
    if (m.status.group === "live") live++;
    else if (m.status.group === "upcoming") upcoming++;
    else if (m.status.group === "finished") finished++;
  }
  return { live, upcoming, finished, total: matches.length };
}
