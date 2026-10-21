import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { diffDays } from "@/lib/utils/dates";
import {
  cairoToday,
  currentSeasonOf,
  getFixturesByDate,
  getHeadToHead,
  getLeagueDetails,
  getLeagueFixtures,
  getLeagues,
  getMatchDetails,
  getPlayerDetails,
  getPlayers,
  getPlayerSeasons,
  getStandings,
  getTeamCompetitions,
  getTeamDetails,
  getTeamFixtures,
  getTeams,
  getTopScorers,
} from "./service";
import type { DataResult, Match } from "./types";

/**
 * Render-level caching ('use cache') on top of the data layer. Pages call these
 * wrappers so the HTML itself is cached and revalidated in the background,
 * with lifetimes matching the data type (see `cacheLife` in next.config.ts).
 * When a result is an error or a stale fallback, a short "retry" lifetime is
 * used so the page recovers quickly once the provider is reachable again.
 */

type Life = "live" | "fixtures" | "standings" | "reference" | "archive" | "retry";

function lifeFor(result: DataResult<unknown>, preferred: Life): Life {
  if (result.data === null || result.stale) return "retry";
  return preferred;
}

/** cacheLife() is typed per profile name, so dispatch with literals. */
function applyLife(life: Life): void {
  switch (life) {
    case "live":
      cacheLife("live");
      break;
    case "fixtures":
      cacheLife("fixtures");
      break;
    case "standings":
      cacheLife("standings");
      break;
    case "reference":
      cacheLife("reference");
      break;
    case "archive":
      cacheLife("archive");
      break;
    case "retry":
      cacheLife("retry");
      break;
  }
}

function hasLive(matches: readonly Match[] | null | undefined): boolean {
  return (matches ?? []).some((m) => m.status.group === "live" || m.status.group === "interrupted");
}

/** Cairo "today" (YYYY-MM-DD), recomputed at most every ~30 seconds. */
export async function qToday(): Promise<string> {
  "use cache";
  cacheLife("live");
  return cairoToday();
}

export async function qFixturesByDate(date: string) {
  "use cache";
  const result = await getFixturesByDate(date);
  const diff = diffDays(cairoToday(), date);
  const preferred: Life = hasLive(result.data) || diff === 0 ? "live" : diff < -2 ? "archive" : "fixtures";
  applyLife(lifeFor(result, preferred));
  cacheTag("fixtures", `fixtures:${date}`);
  return result;
}

export async function qMatch(id: number) {
  "use cache";
  const result = await getMatchDetails(id);
  const m = result.data;
  let preferred: Life = "fixtures";
  if (m && (m.status.group === "live" || m.status.group === "interrupted")) preferred = "live";
  else if (m && m.status.group === "finished" && Date.now() / 1000 - m.timestamp > 6 * 3600) preferred = "archive";
  else if (m && m.status.group === "upcoming" && m.timestamp - Date.now() / 1000 < 3 * 3600) preferred = "live";
  applyLife(lifeFor(result, preferred));
  cacheTag("matches", `match:${id}`);
  return result;
}

export async function qHeadToHead(teamA: number, teamB: number) {
  "use cache";
  const result = await getHeadToHead(teamA, teamB);
  applyLife(lifeFor(result, "reference"));
  cacheTag("h2h");
  return result;
}

export async function qLeagues() {
  "use cache";
  const result = await getLeagues();
  applyLife(lifeFor(result, "reference"));
  cacheTag("leagues");
  return result;
}

export async function qLeague(id: number) {
  "use cache";
  const result = await getLeagueDetails(id);
  applyLife(lifeFor(result, "reference"));
  cacheTag("leagues", `league:${id}`);
  return result;
}

export async function qStandings(leagueId: number, season: number, past = false) {
  "use cache";
  const result = await getStandings(leagueId, season, { past });
  applyLife(lifeFor(result, past ? "archive" : "standings"));
  cacheTag("standings", `standings:${leagueId}`);
  return result;
}

export async function qLeagueFixtures(leagueId: number, season: number, past = false) {
  "use cache";
  const result = await getLeagueFixtures(leagueId, season);
  const today = cairoToday();
  const preferred: Life = hasLive(result.data)
    ? "live"
    : (result.data ?? []).some((m) => m.cairoDate === today)
      ? "fixtures"
      : past
        ? "archive"
        : "standings";
  applyLife(lifeFor(result, preferred));
  cacheTag("fixtures", `league-fixtures:${leagueId}`);
  return result;
}

export async function qTopScorers(leagueId: number, season: number, past = false) {
  "use cache";
  const result = await getTopScorers(leagueId, season, past);
  applyLife(lifeFor(result, past ? "archive" : "reference"));
  cacheTag("scorers", `scorers:${leagueId}`);
  return result;
}

export async function qLeagueTeams(leagueId: number, season: number) {
  "use cache";
  const result = await getTeams(leagueId, season);
  applyLife(lifeFor(result, "reference"));
  cacheTag("teams", `league-teams:${leagueId}`);
  return result;
}

export async function qTeam(id: number) {
  "use cache";
  const result = await getTeamDetails(id);
  applyLife(lifeFor(result, "reference"));
  cacheTag("teams", `team:${id}`);
  return result;
}

export async function qTeamCompetitions(id: number) {
  "use cache";
  const result = await getTeamCompetitions(id);
  applyLife(lifeFor(result, "reference"));
  cacheTag("teams", `team:${id}`);
  return result;
}

export async function qTeamFixtures(id: number, season: number) {
  "use cache";
  const result = await getTeamFixtures(id, season);
  const today = cairoToday();
  const preferred: Life = hasLive(result.data)
    ? "live"
    : (result.data ?? []).some((m) => m.cairoDate === today)
      ? "fixtures"
      : "standings";
  applyLife(lifeFor(result, preferred));
  cacheTag("fixtures", `team-fixtures:${id}`);
  return result;
}

export async function qSquad(teamId: number) {
  "use cache";
  const result = await getPlayers(teamId);
  applyLife(lifeFor(result, "reference"));
  cacheTag("squads", `squad:${teamId}`);
  return result;
}

export async function qPlayerSeasons(playerId: number) {
  "use cache";
  const result = await getPlayerSeasons(playerId);
  applyLife(lifeFor(result, "reference"));
  cacheTag("players", `player:${playerId}`);
  return result;
}

export async function qPlayer(playerId: number, season: number) {
  "use cache";
  const result = await getPlayerDetails(playerId, season);
  applyLife(lifeFor(result, "reference"));
  cacheTag("players", `player:${playerId}`);
  return result;
}

export { currentSeasonOf };
