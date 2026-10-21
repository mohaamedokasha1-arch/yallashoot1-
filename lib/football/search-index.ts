import "server-only";
import { getStore } from "@/lib/store";
import type { Match, PlayerRef, Standings, Team, TeamRef } from "./types";

/**
 * Entities seen in provider responses (teams, leagues, players) are recorded
 * in a small KV index so search can find them without spending API requests.
 */

export interface IndexedTeam {
  id: number;
  name: string;
  logo: string | null;
  country: string | null;
}

export interface IndexedLeague {
  id: number;
  name: string;
  logo: string | null;
  country: string | null;
}

export interface IndexedPlayer {
  id: number;
  name: string;
  photo: string | null;
  team: string | null;
}

const TEAMS_KEY = "idx:teams";
const LEAGUES_KEY = "idx:leagues";
const PLAYERS_KEY = "idx:players";

function teamRecord(t: TeamRef, country: string | null): IndexedTeam {
  return { id: t.id, name: t.name, logo: t.logo, country };
}

export async function indexMatches(matches: readonly Match[]): Promise<void> {
  if (matches.length === 0) return;
  const teams: Record<string, IndexedTeam> = {};
  const leagues: Record<string, IndexedLeague> = {};
  for (const m of matches) {
    const domestic = m.league.country && m.league.country !== "World" ? m.league.country : null;
    teams[String(m.home.id)] = teamRecord(m.home, domestic);
    teams[String(m.away.id)] = teamRecord(m.away, domestic);
    leagues[String(m.league.id)] = { id: m.league.id, name: m.league.name, logo: m.league.logo, country: m.league.country };
  }
  try {
    const store = getStore();
    await Promise.all([store.hset(TEAMS_KEY, teams), store.hset(LEAGUES_KEY, leagues)]);
  } catch {
    // best effort
  }
}

export async function indexStandings(standings: Standings | null): Promise<void> {
  if (!standings) return;
  const domestic = standings.league.country && standings.league.country !== "World" ? standings.league.country : null;
  const teams: Record<string, IndexedTeam> = {};
  for (const g of standings.groups) for (const r of g.rows) teams[String(r.team.id)] = teamRecord(r.team, domestic);
  try {
    await getStore().hset(TEAMS_KEY, teams);
  } catch {
    // best effort
  }
}

export async function indexTeams(list: readonly Team[]): Promise<void> {
  if (list.length === 0) return;
  const teams: Record<string, IndexedTeam> = {};
  for (const t of list) teams[String(t.id)] = { id: t.id, name: t.name, logo: t.logo, country: t.country };
  try {
    await getStore().hset(TEAMS_KEY, teams);
  } catch {
    // best effort
  }
}

export async function indexPlayers(players: ReadonlyArray<PlayerRef & { team?: string | null }>): Promise<void> {
  if (players.length === 0) return;
  const record: Record<string, IndexedPlayer> = {};
  for (const p of players) record[String(p.id)] = { id: p.id, name: p.name, photo: p.photo, team: p.team ?? null };
  try {
    await getStore().hset(PLAYERS_KEY, record);
  } catch {
    // best effort
  }
}

export interface EntityIndex {
  teams: IndexedTeam[];
  leagues: IndexedLeague[];
  players: IndexedPlayer[];
}

let memo: { at: number; value: EntityIndex } | null = null;

export async function loadIndex(): Promise<EntityIndex> {
  if (memo && Date.now() - memo.at < 120_000) return memo.value;
  try {
    const store = getStore();
    const [teams, leagues, players] = await Promise.all([
      store.hgetall<IndexedTeam>(TEAMS_KEY),
      store.hgetall<IndexedLeague>(LEAGUES_KEY),
      store.hgetall<IndexedPlayer>(PLAYERS_KEY),
    ]);
    const value = {
      teams: Object.values(teams).filter((t) => t && typeof t.id === "number"),
      leagues: Object.values(leagues).filter((l) => l && typeof l.id === "number"),
      players: Object.values(players).filter((p) => p && typeof p.id === "number"),
    };
    memo = { at: Date.now(), value };
    return value;
  } catch {
    return { teams: [], leagues: [], players: [] };
  }
}

/** Learned country for a team id (used for Arabic name rules). */
export async function teamCountryFromIndex(id: number): Promise<string | null> {
  const index = await loadIndex();
  return index.teams.find((t) => t.id === id)?.country ?? null;
}
