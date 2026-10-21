/**
 * Maps raw API-Football v3 objects to the provider-independent domain model.
 * Mapping is defensive: wrong types become `null`, and records missing
 * essential fields (ids, team names, kick-off) are dropped instead of guessed.
 */
import { competitionById } from "@/data/competitions";
import { cairoDateString } from "@/lib/utils/dates";
import { entitySlug, matchSlug } from "@/lib/utils/slug";
import { countryNameAr, leagueNameAr, teamNameAr } from "../../names";
import { buildStatus } from "../../status";
import type {
  League,
  LeagueRef,
  LeagueSeason,
  Lineup,
  LineupPlayer,
  Match,
  MatchDetails,
  MatchEvent,
  MatchStatistic,
  PlayerProfile,
  PlayerRef,
  PlayerSeasonStats,
  ScorePair,
  SquadPlayer,
  StandingRecord,
  StandingRow,
  Standings,
  Team,
  TeamRef,
  TopScorer,
} from "../../types";

type Obj = Record<string, unknown>;

export function obj(value: unknown): Obj {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : {};
}

export function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function str(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length ? t : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function int(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** Only accept http(s) image URLs from the provider. */
function imageUrl(value: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function leagueSlug(id: number, name: string, country: string | null): string {
  const entry = competitionById(id);
  if (entry && (!country || entry.apiCountry === country)) return `${entry.slug}-${id}`;
  const base = country && country !== "World" ? `${country} ${name}` : name;
  return entitySlug(base, id);
}

export function mapLeagueRef(raw: unknown): LeagueRef | null {
  const l = obj(raw);
  const id = int(l.id);
  const name = str(l.name);
  if (id === null || !name) return null;
  const country = str(l.country);
  return {
    id,
    name,
    nameAr: leagueNameAr(id, country),
    country,
    countryAr: countryNameAr(country),
    logo: imageUrl(l.logo),
    flag: imageUrl(l.flag),
    season: int(l.season),
    round: str(l.round),
    slug: leagueSlug(id, name, country),
  };
}

export function mapTeamRef(raw: unknown, country?: string | null): TeamRef | null {
  const t = obj(raw);
  const id = int(t.id);
  const name = str(t.name);
  if (id === null || !name) return null;
  return {
    id,
    name,
    nameAr: teamNameAr(id, name, country && country !== "World" ? country : null),
    logo: imageUrl(t.logo),
    slug: entitySlug(name, id),
  };
}

function pair(raw: unknown): ScorePair {
  const p = obj(raw);
  return { home: int(p.home), away: int(p.away) };
}

const NULL_PAIR: ScorePair = { home: null, away: null };

export function mapFixture(raw: unknown): Match | null {
  const o = obj(raw);
  const f = obj(o.fixture);
  const id = int(f.id);
  const league = mapLeagueRef(o.league);
  if (id === null || !league) return null;
  const domesticCountry = league.country && league.country !== "World" ? league.country : null;
  const teams = obj(o.teams);
  const home = mapTeamRef(teams.home, domesticCountry);
  const away = mapTeamRef(teams.away, domesticCountry);
  if (!home || !away || home.id === away.id) return null;

  let timestamp = int(f.timestamp);
  if (timestamp === null) {
    const date = str(f.date);
    const parsed = date ? Date.parse(date) : NaN;
    timestamp = Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
  }
  if (timestamp === null) return null;

  const st = obj(f.status);
  const status = buildStatus(str(st.short), int(st.elapsed), int(st.extra), str(st.long));
  const notPlayed = status.group === "upcoming" || status.group === "postponed" || (status.group === "cancelled" && status.code !== "ABD");

  const goals = notPlayed ? NULL_PAIR : pair(o.goals);
  const score = obj(o.score);
  const homeWinner = bool(obj(teams.home).winner);
  const awayWinner = bool(obj(teams.away).winner);
  let winner: Match["winner"] = null;
  if (status.group === "finished") {
    const pen = pair(score.penalty);
    if (homeWinner === true) winner = "home";
    else if (awayWinner === true) winner = "away";
    else if (status.code === "PEN" && pen.home !== null && pen.away !== null && pen.home !== pen.away) {
      winner = pen.home > pen.away ? "home" : "away";
    } else if (status.code !== "PEN" && goals.home !== null && goals.away !== null) {
      winner = goals.home === goals.away ? "draw" : goals.home > goals.away ? "home" : "away";
    }
  }

  const venueRaw = obj(f.venue);
  const venue = {
    id: int(venueRaw.id),
    name: str(venueRaw.name),
    city: str(venueRaw.city),
  };

  return {
    id,
    provider: "api-football",
    slug: matchSlug(home.name, away.name, id),
    kickoff: new Date(timestamp * 1000).toISOString(),
    timestamp,
    cairoDate: cairoDateString(timestamp * 1000),
    status,
    league,
    home,
    away,
    goals,
    score: notPlayed
      ? { halftime: NULL_PAIR, fulltime: NULL_PAIR, extratime: NULL_PAIR, penalty: NULL_PAIR }
      : {
          halftime: pair(score.halftime),
          fulltime: pair(score.fulltime),
          extratime: pair(score.extratime),
          penalty: pair(score.penalty),
        },
    winner,
    venue: venue.name || venue.city ? venue : null,
    referee: str(f.referee),
  };
}

function person(raw: unknown): { id: number | null; name: string } | null {
  const p = obj(raw);
  const name = str(p.name);
  return name ? { id: int(p.id), name } : null;
}

function mapEvents(raw: unknown, match: Match): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (const item of arr(raw)) {
    const e = obj(item);
    const time = obj(e.time);
    const teamId = int(obj(e.team).id);
    const typeRaw = (str(e.type) ?? "").toLowerCase();
    const type: MatchEvent["type"] =
      typeRaw === "goal" ? "goal" : typeRaw === "card" ? "card" : typeRaw === "subst" ? "subst" : typeRaw === "var" ? "var" : "other";
    events.push({
      minute: int(time.elapsed),
      extra: int(time.extra),
      teamId,
      side: teamId === match.home.id ? "home" : teamId === match.away.id ? "away" : null,
      type,
      detail: str(e.detail) ?? "",
      player: person(e.player),
      assist: person(e.assist),
      comments: str(e.comments),
    });
  }
  return events.sort((a, b) => (a.minute ?? 0) + (a.extra ?? 0) / 100 - ((b.minute ?? 0) + (b.extra ?? 0) / 100));
}

function lineupPlayers(raw: unknown): LineupPlayer[] {
  const players: LineupPlayer[] = [];
  for (const item of arr(raw)) {
    const p = obj(obj(item).player);
    const name = str(p.name);
    if (!name) continue;
    players.push({ id: int(p.id), name, number: int(p.number), pos: str(p.pos), grid: str(p.grid) });
  }
  return players;
}

function mapLineups(raw: unknown, match: Match): Lineup[] {
  const lineups: Lineup[] = [];
  for (const item of arr(raw)) {
    const l = obj(item);
    const teamId = int(obj(l.team).id);
    if (teamId === null) continue;
    const side = teamId === match.home.id ? "home" : teamId === match.away.id ? "away" : null;
    if (!side) continue;
    const coach = obj(l.coach);
    const coachName = str(coach.name);
    lineups.push({
      teamId,
      side,
      formation: str(l.formation),
      coach: coachName ? { id: int(coach.id), name: coachName, photo: imageUrl(coach.photo) } : null,
      startXI: lineupPlayers(l.startXI),
      substitutes: lineupPlayers(l.substitutes),
    });
  }
  return lineups.sort((a, b) => (a.side === b.side ? 0 : a.side === "home" ? -1 : 1));
}

function statValue(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function mapStatistics(raw: unknown, match: Match): MatchStatistic[] {
  const byType = new Map<string, MatchStatistic>();
  for (const item of arr(raw)) {
    const block = obj(item);
    const teamId = int(obj(block.team).id);
    const side = teamId === match.home.id ? "home" : teamId === match.away.id ? "away" : null;
    if (!side) continue;
    for (const s of arr(block.statistics)) {
      const stat = obj(s);
      const type = str(stat.type);
      if (!type) continue;
      const entry = byType.get(type) ?? { type, home: null, away: null };
      entry[side] = statValue(stat.value);
      byType.set(type, entry);
    }
  }
  return [...byType.values()].filter((s) => s.home !== null || s.away !== null);
}

export function mapFixtureDetails(raw: unknown): MatchDetails | null {
  const match = mapFixture(raw);
  if (!match) return null;
  const o = obj(raw);
  return {
    ...match,
    events: Array.isArray(o.events) ? mapEvents(o.events, match) : null,
    lineups: Array.isArray(o.lineups) ? mapLineups(o.lineups, match) : null,
    statistics: Array.isArray(o.statistics) ? mapStatistics(o.statistics, match) : null,
  };
}

function record(raw: unknown): StandingRecord {
  const r = obj(raw);
  const goals = obj(r.goals);
  return {
    played: int(r.played),
    win: int(r.win),
    draw: int(r.draw),
    lose: int(r.lose),
    goalsFor: int(goals.for),
    goalsAgainst: int(goals.against),
  };
}

export function mapStandings(raw: unknown): Standings | null {
  const first = obj(arr(raw)[0]);
  const leagueRaw = obj(first.league);
  const league = mapLeagueRef(leagueRaw);
  if (!league) return null;
  const domestic = league.country && league.country !== "World" ? league.country : null;
  const groups = arr(leagueRaw.standings).map((groupRaw) => {
    const rows: StandingRow[] = [];
    for (const item of arr(groupRaw)) {
      const r = obj(item);
      const team = mapTeamRef(r.team, domestic);
      const rank = int(r.rank);
      if (!team || rank === null) continue;
      rows.push({
        rank,
        team,
        points: int(r.points),
        goalsDiff: int(r.goalsDiff),
        group: str(r.group),
        form: str(r.form),
        description: str(r.description),
        all: record(r.all),
        home: r.home ? record(r.home) : null,
        away: r.away ? record(r.away) : null,
        updatedAt: str(r.update),
      });
    }
    rows.sort((a, b) => a.rank - b.rank);
    return { name: rows[0]?.group ?? null, rows };
  });
  return { league, groups: groups.filter((g) => g.rows.length > 0) };
}

function coverage(raw: unknown): LeagueSeason["coverage"] {
  const c = obj(raw);
  const fx = obj(c.fixtures);
  return {
    standings: c.standings === true,
    events: fx.events === true,
    lineups: fx.lineups === true,
    statistics: fx.statistics_fixtures === true,
    players: c.players === true,
    topScorers: c.top_scorers === true,
  };
}

export function mapLeague(raw: unknown): League | null {
  const o = obj(raw);
  const l = obj(o.league);
  const c = obj(o.country);
  const id = int(l.id);
  const name = str(l.name);
  if (id === null || !name) return null;
  const countryName = str(c.name) ?? "World";
  const typeRaw = (str(l.type) ?? "").toLowerCase();
  const seasons: LeagueSeason[] = [];
  for (const s of arr(o.seasons)) {
    const season = obj(s);
    const year = int(season.year);
    if (year === null) continue;
    seasons.push({
      year,
      start: str(season.start),
      end: str(season.end),
      current: season.current === true,
      coverage: coverage(season.coverage),
    });
  }
  seasons.sort((a, b) => b.year - a.year);
  return {
    id,
    name,
    nameAr: leagueNameAr(id, countryName),
    type: typeRaw === "league" ? "league" : typeRaw === "cup" ? "cup" : null,
    logo: imageUrl(l.logo),
    country: { name: countryName, nameAr: countryNameAr(countryName), code: str(c.code), flag: imageUrl(c.flag) },
    seasons,
    slug: leagueSlug(id, name, countryName),
  };
}

export function mapPlayerRef(raw: unknown): PlayerRef | null {
  const p = obj(raw);
  const id = int(p.id);
  const name = str(p.name);
  if (id === null || !name) return null;
  return { id, name, photo: imageUrl(p.photo), nationality: str(p.nationality), slug: entitySlug(name, id) };
}

export function mapTopScorer(raw: unknown): TopScorer | null {
  const o = obj(raw);
  const player = mapPlayerRef(o.player);
  if (!player) return null;
  const stats = obj(arr(o.statistics)[0]);
  const leagueCountry = str(obj(stats.league).country);
  return {
    player,
    team: mapTeamRef(stats.team, leagueCountry),
    goals: int(obj(stats.goals).total),
    assists: int(obj(stats.goals).assists),
    appearances: int(obj(stats.games).appearences),
    penalties: int(obj(stats.penalty).scored),
  };
}

export function mapTeam(raw: unknown): Team | null {
  const o = obj(raw);
  const t = obj(o.team);
  const id = int(t.id);
  const name = str(t.name);
  if (id === null || !name) return null;
  const country = str(t.country);
  const v = obj(o.venue);
  const venueName = str(v.name);
  return {
    id,
    name,
    nameAr: teamNameAr(id, name, country),
    code: str(t.code),
    country,
    countryAr: countryNameAr(country),
    founded: int(t.founded),
    national: t.national === true,
    logo: imageUrl(t.logo),
    venue: venueName || str(v.city) ? { name: venueName, city: str(v.city), capacity: int(v.capacity) } : null,
    slug: entitySlug(name, id),
  };
}

export function mapSquad(raw: unknown): SquadPlayer[] {
  const first = obj(arr(raw)[0]);
  const players: SquadPlayer[] = [];
  for (const item of arr(first.players)) {
    const p = obj(item);
    const id = int(p.id);
    const name = str(p.name);
    if (id === null || !name) continue;
    players.push({
      id,
      name,
      age: int(p.age),
      number: int(p.number),
      position: str(p.position),
      photo: imageUrl(p.photo),
      slug: entitySlug(name, id),
    });
  }
  return players;
}

export function mapPlayerProfile(raw: unknown, season: number | null): PlayerProfile | null {
  const o = obj(arr(raw)[0]);
  const p = obj(o.player);
  const id = int(p.id);
  const name = str(p.name);
  if (id === null || !name) return null;
  const birth = obj(p.birth);
  const statistics: PlayerSeasonStats[] = arr(o.statistics).map((s) => {
    const st = obj(s);
    const games = obj(st.games);
    const goals = obj(st.goals);
    const cards = obj(st.cards);
    const league = mapLeagueRef(st.league);
    return {
      team: mapTeamRef(st.team, league?.country ?? null),
      league,
      appearances: int(games.appearences),
      lineups: int(games.lineups),
      minutes: int(games.minutes),
      position: str(games.position),
      rating: str(games.rating),
      goals: int(goals.total),
      assists: int(goals.assists),
      yellow: int(cards.yellow),
      red: int(cards.red),
    };
  });
  return {
    id,
    name,
    firstname: str(p.firstname),
    lastname: str(p.lastname),
    age: int(p.age),
    birthDate: str(birth.date),
    birthPlace: str(birth.place),
    birthCountry: str(birth.country),
    nationality: str(p.nationality),
    height: str(p.height),
    weight: str(p.weight),
    photo: imageUrl(p.photo),
    injured: bool(p.injured),
    season,
    statistics,
    slug: entitySlug(name, id),
  };
}
