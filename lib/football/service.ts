import "server-only";
import { addDays, cairoDateString, cairoParts, diffDays } from "@/lib/utils/dates";
import { getResource, peekResource, type ResourceOptions } from "./cache";
import type { Priority } from "./budget";
import { ProviderError } from "./errors";
import { mergeMatchLists, mergeMatchUpdate, normalizeDayFixtures, sortByKickoff, dedupeMatches } from "./merge";
import { getProvider } from "./providers";
import { indexMatches, indexPlayers, indexStandings, indexTeams } from "./search-index";
import type {
  DataResult,
  League,
  Match,
  MatchDetails,
  PlayerProfile,
  SquadPlayer,
  Standings,
  Team,
  TopScorer,
} from "./types";

/**
 * Unified data layer. Every function:
 *  - goes through the shared cache (no provider call per visitor),
 *  - returns a DataResult (never throws for provider problems),
 *  - keeps the last good copy when the provider fails.
 */

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

export interface FetchOptions {
  /** Bypass freshness (admin retry / cron). Still subject to quota guard. */
  force?: boolean;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function cairoToday(): string {
  return cairoDateString(Date.now());
}

function datePriority(date: string): Priority {
  const diff = Math.abs(diffDays(cairoToday(), date));
  if (diff <= 1) return "critical";
  if (diff <= 7) return "high";
  return "low";
}

/** Freshness for a day's fixture list, based on its content and distance from today. */
export function fixturesTtl(matches: readonly Match[], date: string, today: string, now = nowSeconds()): number {
  const diff = diffDays(today, date);
  const anyLive = matches.some((m) => m.status.group === "live" || m.status.group === "interrupted");
  if (anyLive) return 60;
  const kickoffSoon = matches.some(
    (m) => m.status.group === "upcoming" && m.timestamp - now < 20 * MIN && m.timestamp - now > -3 * HOUR,
  );
  if (kickoffSoon) return 2 * MIN;
  if (diff < -1) return DAY;
  if (diff === -1) return matches.every((m) => m.status.group !== "upcoming") ? 3 * HOUR : 15 * MIN;
  if (diff === 0) return matches.some((m) => m.status.group === "upcoming") ? 10 * MIN : 30 * MIN;
  if (diff === 1) return 30 * MIN;
  return 2 * HOUR;
}

function matchTtl(m: Match, now = nowSeconds()): number {
  switch (m.status.group) {
    case "live":
    case "interrupted":
      return 60;
    case "upcoming": {
      const until = m.timestamp - now;
      if (until > DAY) return 6 * HOUR;
      if (until > 2 * HOUR) return HOUR;
      return 5 * MIN;
    }
    case "finished":
      return now - m.timestamp < 4 * HOUR ? 15 * MIN : 7 * DAY;
    default:
      return 6 * HOUR;
  }
}

function seasonListTtl(matches: readonly Match[], now = nowSeconds()): number {
  if (matches.some((m) => m.status.group === "live")) return 2 * MIN;
  const today = cairoToday();
  if (matches.some((m) => m.cairoDate === today)) return 10 * MIN;
  const upcoming = matches.some((m) => m.status.group === "upcoming" && m.timestamp > now - DAY);
  return upcoming ? HOUR : 7 * DAY;
}

async function afterFetch<T>(result: DataResult<T>, index: (data: T) => Promise<void>): Promise<DataResult<T>> {
  if (result.source === "provider" && result.data !== null) {
    try {
      await index(result.data);
    } catch {
      // indexing is best effort
    }
  }
  return result;
}

// ── Fixtures ─────────────────────────────────────────────────────────────

export async function getFixturesByDate(date: string, opts: FetchOptions = {}): Promise<DataResult<Match[]>> {
  const today = cairoToday();
  const result = await getResource<Match[]>({
    key: `fx:date:${date}`,
    priority: datePriority(date),
    force: opts.force,
    ttl: (matches) => fixturesTtl(matches, date, today),
    fetcher: async () => normalizeDayFixtures(await getProvider().getFixturesByDate(date), date),
    isEmpty: (matches) => matches.length === 0,
    merge: (prev, next) => sortByKickoff(mergeMatchLists(prev, next)),
  });
  return afterFetch(result, indexMatches);
}

/** Live matches derived from today's (and, after midnight, yesterday's) fixtures. */
export async function getLiveMatches(): Promise<DataResult<Match[]>> {
  const today = cairoToday();
  const results = [await getFixturesByDate(today)];
  if (cairoParts(Date.now()).hour < 4) results.push(await getFixturesByDate(addDays(today, -1)));
  const primary = results[0]!;
  const all = results.flatMap((r) => r.data ?? []);
  const live = dedupeMatches(all.filter((m) => m.status.group === "live" || m.status.group === "interrupted"));
  return {
    ...primary,
    data: primary.data === null && results.every((r) => r.data === null) ? null : sortByKickoff(live),
  };
}

export async function getMatchDetails(id: number, opts: FetchOptions = {}): Promise<DataResult<MatchDetails | null>> {
  const cached = await peekResource<MatchDetails | null>(`fx:id:${id}`);
  const isHot = cached?.data && (cached.data.status.group === "live" || cached.data.cairoDate === cairoToday());
  const result = await getResource<MatchDetails | null>({
    key: `fx:id:${id}`,
    priority: isHot ? "critical" : "high",
    force: opts.force,
    ttl: (m) => (m ? matchTtl(m) : 6 * HOUR),
    fetcher: async () => getProvider().getFixture(id),
    isEmpty: (m) => m === null,
    merge: (prev, next) => (prev && next ? mergeMatchUpdate(prev, next) : next),
  });
  return afterFetch(result, async (m) => {
    if (m) await indexMatches([m]);
  });
}

export async function getHeadToHead(teamA: number, teamB: number): Promise<DataResult<Match[]>> {
  const [a, b] = teamA < teamB ? [teamA, teamB] : [teamB, teamA];
  return getResource<Match[]>({
    key: `h2h:${a}-${b}`,
    priority: "low",
    ttl: 12 * HOUR,
    fetcher: async () => sortByKickoff(dedupeMatches(await getProvider().getHeadToHead(a, b, 10))).reverse(),
  });
}

// ── Leagues ──────────────────────────────────────────────────────────────

export async function getLeagues(opts: FetchOptions = {}): Promise<DataResult<League[]>> {
  return getResource<League[]>({
    key: "leagues:current",
    priority: "high",
    force: opts.force,
    ttl: DAY,
    keepSeconds: 30 * DAY,
    fetcher: async () => getProvider().getLeagues({ current: true }),
    isEmpty: (list) => list.length === 0,
  });
}

export async function getLeagueDetails(id: number, opts: FetchOptions = {}): Promise<DataResult<League | null>> {
  // Fetched by id (not taken from the "current" list) to get every season for season navigation.
  return getResource<League | null>({
    key: `league:${id}`,
    priority: "high",
    force: opts.force,
    ttl: DAY,
    keepSeconds: 30 * DAY,
    fetcher: async () => (await getProvider().getLeagues({ id }))[0] ?? null,
    isEmpty: (l) => l === null,
  });
}

/** Current season year of a league (`current: true`), or the latest season. */
export function currentSeasonOf(league: League | null): number | null {
  if (!league || league.seasons.length === 0) return null;
  return league.seasons.find((s) => s.current)?.year ?? league.seasons[0]?.year ?? null;
}

function isPastSeason(league: League | null, season: number): boolean {
  const current = currentSeasonOf(league);
  return current !== null && season < current;
}

export async function getStandings(
  leagueId: number,
  season: number,
  opts: FetchOptions & { past?: boolean } = {},
): Promise<DataResult<Standings | null>> {
  const result = await getResource<Standings | null>({
    key: `standings:${leagueId}:${season}`,
    priority: "high",
    force: opts.force,
    ttl: opts.past ? 7 * DAY : 30 * MIN,
    keepSeconds: 60 * DAY,
    fetcher: async () => getProvider().getStandings(leagueId, season),
    isEmpty: (s) => s === null || s.groups.length === 0,
  });
  return afterFetch(result, indexStandings);
}

export async function getLeagueFixtures(leagueId: number, season: number, opts: FetchOptions = {}): Promise<DataResult<Match[]>> {
  const result = await getResource<Match[]>({
    key: `fx:league:${leagueId}:${season}`,
    priority: "high",
    force: opts.force,
    ttl: (list) => seasonListTtl(list),
    keepSeconds: 60 * DAY,
    fetcher: async () => sortByKickoff(dedupeMatches(await getProvider().getLeagueFixtures(leagueId, season))),
    isEmpty: (list) => list.length === 0,
    merge: (prev, next) => sortByKickoff(mergeMatchLists(prev, next)),
  });
  return afterFetch(result, indexMatches);
}

export async function getTopScorers(leagueId: number, season: number, past = false): Promise<DataResult<TopScorer[]>> {
  const result = await getResource<TopScorer[]>({
    key: `scorers:${leagueId}:${season}`,
    priority: "low",
    ttl: past ? 7 * DAY : 6 * HOUR,
    keepSeconds: 60 * DAY,
    fetcher: async () => getProvider().getTopScorers(leagueId, season),
  });
  return afterFetch(result, (list) => indexPlayers(list.map((s) => ({ ...s.player, team: s.team?.name ?? null }))));
}

// ── Teams ────────────────────────────────────────────────────────────────

export async function getTeams(leagueId: number, season: number): Promise<DataResult<Team[]>> {
  const result = await getResource<Team[]>({
    key: `teams:league:${leagueId}:${season}`,
    priority: "low",
    ttl: DAY,
    keepSeconds: 60 * DAY,
    fetcher: async () => getProvider().getTeams({ league: leagueId, season }),
    isEmpty: (list) => list.length === 0,
  });
  return afterFetch(result, indexTeams);
}

export async function getTeamDetails(id: number, opts: FetchOptions = {}): Promise<DataResult<Team | null>> {
  const result = await getResource<Team | null>({
    key: `team:${id}`,
    priority: "high",
    force: opts.force,
    ttl: 7 * DAY,
    keepSeconds: 60 * DAY,
    fetcher: async () => (await getProvider().getTeams({ id }))[0] ?? null,
    isEmpty: (t) => t === null,
  });
  return afterFetch(result, async (t) => {
    if (t) await indexTeams([t]);
  });
}

export async function getTeamCompetitions(id: number): Promise<DataResult<League[]>> {
  return getResource<League[]>({
    key: `team:leagues:${id}`,
    priority: "high",
    ttl: DAY,
    keepSeconds: 30 * DAY,
    fetcher: async () => getProvider().getLeagues({ team: id, current: true }),
  });
}

export async function getTeamFixtures(id: number, season: number): Promise<DataResult<Match[]>> {
  const result = await getResource<Match[]>({
    key: `fx:team:${id}:${season}`,
    priority: "high",
    ttl: (list) => seasonListTtl(list),
    keepSeconds: 60 * DAY,
    fetcher: async () => sortByKickoff(dedupeMatches(await getProvider().getTeamFixtures(id, season))),
    isEmpty: (list) => list.length === 0,
    merge: (prev, next) => sortByKickoff(mergeMatchLists(prev, next)),
  });
  return afterFetch(result, indexMatches);
}

/** Squad (players) of a team. */
export async function getPlayers(teamId: number): Promise<DataResult<SquadPlayer[]>> {
  const result = await getResource<SquadPlayer[]>({
    key: `squad:${teamId}`,
    priority: "low",
    ttl: DAY,
    keepSeconds: 60 * DAY,
    fetcher: async () => getProvider().getSquad(teamId),
  });
  return afterFetch(result, (list) =>
    indexPlayers(list.map((p) => ({ id: p.id, name: p.name, photo: p.photo, nationality: null, slug: p.slug }))),
  );
}

export async function getPlayerSeasons(playerId: number): Promise<DataResult<number[]>> {
  return getResource<number[]>({
    key: `player:seasons:${playerId}`,
    priority: "low",
    ttl: 7 * DAY,
    keepSeconds: 60 * DAY,
    fetcher: async () => getProvider().getPlayerSeasons(playerId),
  });
}

export async function getPlayerDetails(playerId: number, season: number): Promise<DataResult<PlayerProfile | null>> {
  const result = await getResource<PlayerProfile | null>({
    key: `player:${playerId}:${season}`,
    priority: "low",
    ttl: DAY,
    keepSeconds: 60 * DAY,
    fetcher: async () => getProvider().getPlayer(playerId, season),
    isEmpty: (p) => p === null,
  });
  return afterFetch(result, async (p) => {
    if (p) await indexPlayers([{ id: p.id, name: p.name, photo: p.photo, nationality: p.nationality, slug: p.slug, team: p.statistics[0]?.team?.name ?? null }]);
  });
}

// ── Diagnostics ──────────────────────────────────────────────────────────

export async function getProviderAccountStatus() {
  const provider = getProvider();
  if (!provider.isConfigured()) throw new ProviderError("not_configured", "not configured");
  return provider.getAccountStatus();
}

export { isPastSeason };
export type { ResourceOptions };
