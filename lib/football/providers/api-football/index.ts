import "server-only";
import { footballConfig } from "@/lib/env";
import { CAIRO_TZ } from "@/lib/utils/dates";
import type { FootballProvider, ProviderAccountStatus } from "../types";
import { apiFootballGet } from "./client";
import {
  arr,
  int,
  mapFixture,
  mapFixtureDetails,
  mapLeague,
  mapPlayerProfile,
  mapSquad,
  mapStandings,
  mapTeam,
  mapTopScorer,
  obj,
  str,
} from "./mapper";
import type { League, Match, Team, TopScorer } from "../../types";

function mapMany<T>(raw: unknown, mapper: (item: unknown) => T | null): T[] {
  const out: T[] = [];
  for (const item of arr(raw)) {
    const mapped = mapper(item);
    if (mapped) out.push(mapped);
  }
  return out;
}

export const apiFootballProvider: FootballProvider = {
  id: "api-football",
  name: "API-Football (API-Sports)",
  website: "https://www.api-football.com",

  isConfigured() {
    return Boolean(footballConfig().apiKey);
  },

  async getAccountStatus(): Promise<ProviderAccountStatus> {
    const { response } = await apiFootballGet("status");
    const r = obj(response);
    const sub = obj(r.subscription);
    const req = obj(r.requests);
    return {
      plan: str(sub.plan),
      active: typeof sub.active === "boolean" ? sub.active : null,
      requestsToday: int(req.current),
      dailyLimit: int(req.limit_day),
      subscriptionEnd: str(sub.end),
    };
  },

  async getFixturesByDate(date) {
    const { response } = await apiFootballGet("fixtures", { date, timezone: CAIRO_TZ });
    return mapMany(response, mapFixture);
  },

  async getLiveFixtures() {
    const { response } = await apiFootballGet("fixtures", { live: "all", timezone: CAIRO_TZ });
    return mapMany(response, mapFixture);
  },

  async getFixture(id) {
    const { response } = await apiFootballGet("fixtures", { id, timezone: CAIRO_TZ });
    const first = arr(response)[0];
    return first ? mapFixtureDetails(first) : null;
  },

  async getHeadToHead(teamA, teamB, last) {
    const { response } = await apiFootballGet("fixtures/headtohead", {
      h2h: `${teamA}-${teamB}`,
      last,
      timezone: CAIRO_TZ,
    });
    return mapMany(response, mapFixture);
  },

  async getLeagues(params) {
    const { response } = await apiFootballGet("leagues", {
      id: params.id,
      current: params.current ? "true" : undefined,
      country: params.country,
      search: params.search,
      team: params.team,
    });
    return mapMany<League>(response, mapLeague);
  },

  async getStandings(leagueId, season) {
    const { response } = await apiFootballGet("standings", { league: leagueId, season });
    return mapStandings(response);
  },

  async getLeagueFixtures(leagueId, season) {
    const { response } = await apiFootballGet("fixtures", { league: leagueId, season, timezone: CAIRO_TZ });
    return mapMany<Match>(response, mapFixture);
  },

  async getTopScorers(leagueId, season) {
    const { response } = await apiFootballGet("players/topscorers", { league: leagueId, season });
    return mapMany<TopScorer>(response, mapTopScorer);
  },

  async getTeams(params) {
    const { response } = await apiFootballGet("teams", {
      id: params.id,
      league: params.league,
      season: params.season,
      search: params.search,
    });
    return mapMany<Team>(response, mapTeam);
  },

  async getTeamFixtures(teamId, season) {
    const { response } = await apiFootballGet("fixtures", { team: teamId, season, timezone: CAIRO_TZ });
    return mapMany<Match>(response, mapFixture);
  },

  async getSquad(teamId) {
    const { response } = await apiFootballGet("players/squads", { team: teamId });
    return mapSquad(response);
  },

  async getPlayer(playerId, season) {
    const { response } = await apiFootballGet("players", { id: playerId, season });
    return mapPlayerProfile(response, season);
  },

  async getPlayerSeasons(playerId) {
    const { response } = await apiFootballGet("players/seasons", { player: playerId });
    return arr(response)
      .map((y) => int(y))
      .filter((y): y is number => y !== null)
      .sort((a, b) => b - a);
  },
};
