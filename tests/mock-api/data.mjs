/**
 * Deterministic MOCK dataset in the API-Football v3 format, generated relative
 * to the current Cairo date. Used only by automated tests (the site shows a
 * "test environment" banner whenever it is pointed at this server).
 *
 * Scenarios covered:
 *  - live / upcoming / finished / postponed / penalties matches,
 *  - a match at 00:30 Cairo time "leaking" into the previous UTC day,
 *  - a duplicated fixture with a stale copy (de-duplication),
 *  - empty day (today+4), HTTP 500 (today+5), HTTP 429 (today+6).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OTHER_FIXTURES = JSON.parse(readFileSync(join(here, "sample-other-fixtures.json"), "utf8"));
const SAMPLE_LEAGUES = JSON.parse(readFileSync(join(here, "sample-leagues.json"), "utf8"));

const TZ = "Africa/Cairo";
const MEDIA = "https://media.api-sports.io/football";

// ── Time helpers ────────────────────────────────────────────────────────────
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
function cairoParts(ms) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}
export function cairoDate(ms) {
  const p = cairoParts(ms);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
export function addDays(date, n) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n, 12));
  return t.toISOString().slice(0, 10);
}
function offsetMinutes(ms) {
  const p = cairoParts(ms);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000);
}
/** UTC epoch ms for a Cairo wall-clock time. */
export function cairoToUtc(date, hh, mm) {
  const [y, m, d] = date.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall - 120 * 60000;
  for (let i = 0; i < 3; i++) guess = wall - offsetMinutes(guess) * 60000;
  return guess;
}
function hash(n) {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

// ── Catalog ────────────────────────────────────────────────────────────────
const team = (id, name, country, venue, city) => ({ id, name, country, venue, city, logo: `${MEDIA}/teams/${id}.png` });

export const EGYPT_TEAMS = [
  team(1577, "Al Ahly", "Egypt", "Cairo International Stadium", "Cairo"),
  team(1040, "Zamalek SC", "Egypt", "Cairo International Stadium", "Cairo"),
  team(1036, "Pyramids FC", "Egypt", "30 June Stadium", "Cairo"),
  team(1030, "Ismaily SC", "Egypt", "Ismailia Stadium", "Ismailia"),
  team(1031, "AL Masry", "Egypt", "Suez Canal Authority Stadium", "Ismailia"),
  team(1035, "AL Ittih. Alexandria", "Egypt", "Alexandria Stadium", "Alexandria"),
  team(14651, "Ceramica Cleopatra", "Egypt", "Petro Sport Stadium", "Cairo"),
  team(1037, "Enppi", "Egypt", "Petro Sport Stadium", "Cairo"),
  team(1574, "El Gouna FC", "Egypt", "Khaled Bichara Stadium", "El Gouna"),
  team(1033, "AL Mokawloon", "Egypt", "Osman Ahmed Osman Stadium", "Cairo"),
  team(1039, "El Geish", "Egypt", "Gehaz El Reyada Stadium", "Cairo"),
  team(1576, "Haras El Hodood", "Egypt", "Haras El Hodoud Stadium", "Alexandria"),
  team(16431, "Future FC", "Egypt", "Al Salam Stadium", "Cairo"),
  team(7520, "Masr", "Egypt", "Al Salam Stadium", "Cairo"),
  team(1573, "Nogoom El Mostakbal FC", "Egypt", "Petro Sport Stadium", "Cairo"),
  team(1038, "Misr EL Makasa", "Egypt", "Fayoum Stadium", "Faiyum"),
];
const ENGLAND = [
  team(42, "Arsenal", "England", "Emirates Stadium", "London"),
  team(49, "Chelsea", "England", "Stamford Bridge", "London"),
  team(40, "Liverpool", "England", "Anfield", "Liverpool"),
  team(50, "Manchester City", "England", "Etihad Stadium", "Manchester"),
  team(33, "Manchester United", "England", "Old Trafford", "Manchester"),
  team(47, "Tottenham", "England", "Tottenham Hotspur Stadium", "London"),
];
const SPAIN = [
  team(529, "Barcelona", "Spain", "Estadi Olímpic Lluís Companys", "Barcelona"),
  team(541, "Real Madrid", "Spain", "Estadio Santiago Bernabéu", "Madrid"),
  team(530, "Atletico Madrid", "Spain", "Estadio Metropolitano", "Madrid"),
  team(536, "Sevilla", "Spain", "Estadio Ramón Sánchez Pizjuán", "Sevilla"),
];
const SAUDI = [
  team(2932, "Al-Hilal Saudi FC", "Saudi-Arabia", "Kingdom Arena", "Riyadh"),
  team(2939, "Al-Nassr", "Saudi-Arabia", "Al-Awwal Park", "Riyadh"),
];
const AFRICA = [team(2835, "Esperance Tunis", "Tunisia", "Stade Olympique de Radès", "Radès")];
const ALL_TEAMS = new Map([...EGYPT_TEAMS, ...ENGLAND, ...SPAIN, ...SAUDI, ...AFRICA].map((t) => [t.id, t]));
const T = (id) => ALL_TEAMS.get(id);

const FIRST = ["Mohamed", "Ahmed", "Mahmoud", "Omar", "Karim", "Hossam", "Amr", "Tarek", "Youssef", "Ali", "Mostafa", "Hassan", "Ibrahim", "Khaled", "Ziad", "Marwan", "Hamdi", "Sherif"];
const LAST = ["Adel", "Fathy", "Samir", "Gamal", "Nabil", "Fawzy", "Shawky", "Hamed", "Kamal", "Saber", "Lotfy", "Mansour", "Rashad", "Wagdy", "Zaki", "Ezzat", "Fouad", "Hegazy"];
const POSITIONS = ["Goalkeeper", "Goalkeeper", "Defender", "Defender", "Defender", "Defender", "Defender", "Defender", "Midfielder", "Midfielder", "Midfielder", "Midfielder", "Midfielder", "Midfielder", "Attacker", "Attacker", "Attacker", "Attacker"];

function squadOf(teamId) {
  return POSITIONS.map((position, i) => {
    const id = teamId * 100 + i + 1;
    const h = hash(id);
    return {
      id,
      name: `${FIRST[h % FIRST.length][0]}. ${LAST[(h >>> 8) % LAST.length]}`,
      fullFirst: FIRST[h % FIRST.length],
      fullLast: LAST[(h >>> 8) % LAST.length],
      age: 19 + (h % 15),
      number: i + 1,
      position,
      photo: `${MEDIA.replace("/football", "")}/football/players/${id}.png`,
    };
  });
}

// ── Leagues ────────────────────────────────────────────────────────────────
export function seasonFor(today) {
  const [y, m] = today.split("-").map(Number);
  return m >= 7 ? y : y - 1;
}

function leagueEntry(id, name, type, country, code, flag, season, coverage = {}) {
  return {
    league: { id, name, type, logo: `${MEDIA}/leagues/${id}.png` },
    country: { name: country, code, flag },
    seasons: [season - 2, season - 1, season].map((year) => ({
      year,
      start: `${year}-08-01`,
      end: `${year + 1}-05-31`,
      current: year === season,
      coverage: {
        fixtures: { events: true, lineups: true, statistics_fixtures: true, statistics_players: false },
        standings: coverage.standings ?? type === "League",
        players: true,
        top_scorers: coverage.topScorers ?? type === "League",
        top_assists: false,
        top_cards: false,
        injuries: false,
        predictions: false,
        odds: false,
      },
    })),
  };
}

function leagueRef(id, season, round) {
  const L = LEAGUES_META[id];
  return {
    id,
    name: L.name,
    country: L.country,
    logo: `${MEDIA}/leagues/${id}.png`,
    flag: L.flag,
    season,
    round,
    standings: L.type === "League",
  };
}

const EG_FLAG = "https://media.api-sports.io/flags/eg.svg";
const LEAGUES_META = {
  233: { name: "Premier League", type: "League", country: "Egypt", code: "EG", flag: EG_FLAG },
  714: { name: "Cup", type: "Cup", country: "Egypt", code: "EG", flag: EG_FLAG },
  895: { name: "League Cup", type: "Cup", country: "Egypt", code: "EG", flag: EG_FLAG },
  539: { name: "Super Cup", type: "Cup", country: "Egypt", code: "EG", flag: EG_FLAG },
  887: { name: "Second League", type: "League", country: "Egypt", code: "EG", flag: EG_FLAG },
  12: { name: "CAF Champions League", type: "Cup", country: "World", code: null, flag: null },
  20: { name: "CAF Confederation Cup", type: "Cup", country: "World", code: null, flag: null },
  39: { name: "Premier League", type: "League", country: "England", code: "GB-ENG", flag: "https://media.api-sports.io/flags/gb-eng.svg" },
  140: { name: "La Liga", type: "League", country: "Spain", code: "ES", flag: "https://media.api-sports.io/flags/es.svg" },
  307: { name: "Pro League", type: "League", country: "Saudi-Arabia", code: "SA", flag: "https://media.api-sports.io/flags/sa.svg" },
};

// ── Fixture construction ──────────────────────────────────────────────────
const FINISHED = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "SUSP", "INT"]);
const LONG = {
  NS: "Not Started", TBD: "Time To Be Defined", "1H": "First Half", HT: "Halftime", "2H": "Second Half",
  FT: "Match Finished", PEN: "Match Finished", AET: "Match Finished", PST: "Match Postponed", CANC: "Match Cancelled",
};

function fixture({ id, leagueId, season, round, utcMs, status, elapsed = null, extra = null, home, away, goals = [null, null], ht = [null, null], pen = [null, null] }) {
  const h = T(home);
  const a = T(away);
  const played = FINISHED.has(status) || LIVE.has(status);
  const g = played ? goals : [null, null];
  let homeWinner = null;
  let awayWinner = null;
  if (FINISHED.has(status)) {
    if (status === "PEN") {
      homeWinner = pen[0] > pen[1];
      awayWinner = pen[1] > pen[0];
    } else {
      homeWinner = g[0] > g[1] ? true : g[0] < g[1] ? false : null;
      awayWinner = g[1] > g[0] ? true : g[1] < g[0] ? false : null;
      if (g[0] === g[1]) {
        homeWinner = false;
        awayWinner = false;
      }
    }
  }
  return {
    fixture: {
      id,
      referee: played ? "A. Referee" : null,
      timezone: TZ,
      date: new Date(utcMs).toISOString().replace(".000Z", "+00:00"),
      timestamp: Math.floor(utcMs / 1000),
      periods: { first: played ? Math.floor(utcMs / 1000) : null, second: null },
      venue: { id: null, name: h.venue, city: h.city },
      status: { long: LONG[status] ?? status, short: status, elapsed: played ? (elapsed ?? (FINISHED.has(status) ? 90 : null)) : null, extra },
    },
    league: leagueRef(leagueId, season, round),
    teams: {
      home: { id: h.id, name: h.name, logo: h.logo, winner: homeWinner },
      away: { id: a.id, name: a.name, logo: a.logo, winner: awayWinner },
    },
    goals: { home: g[0], away: g[1] },
    score: {
      halftime: { home: played ? ht[0] : null, away: played ? ht[1] : null },
      fulltime: { home: FINISHED.has(status) ? g[0] : null, away: FINISHED.has(status) ? g[1] : null },
      extratime: { home: null, away: null },
      penalty: { home: status === "PEN" ? pen[0] : null, away: status === "PEN" ? pen[1] : null },
    },
  };
}

function roundRobin(teamIds) {
  const ids = [...teamIds];
  const rounds = [];
  const n = ids.length;
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const homeIdx = r % 2 === 0 ? i : n - 1 - i;
      const awayIdx = r % 2 === 0 ? n - 1 - i : i;
      pairs.push([ids[homeIdx], ids[awayIdx]]);
    }
    rounds.push(pairs);
    ids.splice(1, 0, ids.pop());
  }
  return rounds;
}

// ── Dataset ────────────────────────────────────────────────────────────────
export function createDataset(nowMs = Date.now()) {
  const today = cairoDate(nowMs);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const S = seasonFor(today);
  const R10 = "Regular Season - 10";

  const liveKickoff = nowMs - 67 * 60000 - 15 * 60000;
  const special = [
    // Egyptian Premier League — yesterday
    fixture({ id: 900001, leagueId: 233, season: S, round: R10, utcMs: cairoToUtc(yesterday, 20, 0), status: "FT", home: 1577, away: 1040, goals: [2, 1], ht: [1, 0] }),
    fixture({ id: 900002, leagueId: 233, season: S, round: R10, utcMs: cairoToUtc(yesterday, 17, 0), status: "FT", home: 14651, away: 1037, goals: [0, 0], ht: [0, 0] }),
    // today
    fixture({ id: 900003, leagueId: 233, season: S, round: R10, utcMs: liveKickoff, status: "2H", elapsed: 67, home: 1036, away: 1030, goals: [1, 0], ht: [1, 0] }),
    fixture({ id: 900004, leagueId: 233, season: S, round: R10, utcMs: cairoToUtc(today, 22, 0), status: "NS", home: 1031, away: 1035 }),
    fixture({ id: 900005, leagueId: 233, season: S, round: R10, utcMs: cairoToUtc(today, 16, 0), status: "PST", home: 1574, away: 1033 }),
    fixture({ id: 900006, leagueId: 233, season: S, round: R10, utcMs: cairoToUtc(today, 15, 0), status: "FT", home: 1039, away: 1576, goals: [1, 3], ht: [0, 1] }),
    fixture({ id: 900007, leagueId: 233, season: S, round: R10, utcMs: cairoToUtc(today, 23, 30), status: "NS", home: 16431, away: 7520 }),
    // tomorrow (00:30 Cairo = previous UTC day)
    fixture({ id: 900008, leagueId: 233, season: S, round: R10, utcMs: cairoToUtc(tomorrow, 0, 30), status: "NS", home: 1573, away: 1038 }),
    fixture({ id: 900009, leagueId: 233, season: S, round: "Regular Season - 11", utcMs: cairoToUtc(tomorrow, 19, 0), status: "NS", home: 1040, away: 1036 }),
    fixture({ id: 900010, leagueId: 233, season: S, round: "Regular Season - 11", utcMs: cairoToUtc(tomorrow, 21, 0), status: "NS", home: 1577, away: 14651 }),
    // Egypt Cup with penalties (today)
    fixture({ id: 900011, leagueId: 714, season: S, round: "Round of 32", utcMs: cairoToUtc(today, 18, 0), status: "PEN", home: 1037, away: 1574, goals: [2, 2], ht: [1, 1], pen: [4, 3] }),
    // CAF Champions League (tomorrow)
    fixture({ id: 900012, leagueId: 12, season: S, round: "Group Stage - 1", utcMs: cairoToUtc(tomorrow, 18, 0), status: "NS", home: 1036, away: 2835 }),
    // England
    fixture({ id: 900020, leagueId: 39, season: S, round: "Regular Season - 8", utcMs: cairoToUtc(today, 17, 0), status: "FT", home: 42, away: 49, goals: [2, 0], ht: [1, 0] }),
    fixture({ id: 900021, leagueId: 39, season: S, round: "Regular Season - 8", utcMs: nowMs - 50 * 60000, status: "HT", elapsed: 45, home: 40, away: 50, goals: [1, 1], ht: [1, 1] }),
    fixture({ id: 900022, leagueId: 39, season: S, round: "Regular Season - 9", utcMs: cairoToUtc(tomorrow, 22, 0), status: "NS", home: 33, away: 47 }),
    fixture({ id: 900023, leagueId: 39, season: S, round: "Regular Season - 8", utcMs: cairoToUtc(yesterday, 21, 0), status: "FT", home: 47, away: 42, goals: [0, 1], ht: [0, 0] }),
    // Spain
    fixture({ id: 900030, leagueId: 140, season: S, round: "Regular Season - 9", utcMs: cairoToUtc(today, 22, 0), status: "NS", home: 529, away: 541 }),
    fixture({ id: 900031, leagueId: 140, season: S, round: "Regular Season - 9", utcMs: cairoToUtc(yesterday, 19, 0), status: "FT", home: 530, away: 536, goals: [1, 0], ht: [0, 0] }),
    // Saudi
    fixture({ id: 900040, leagueId: 307, season: S, round: "Regular Season - 7", utcMs: cairoToUtc(today, 20, 0), status: "FT", home: 2932, away: 2939, goals: [3, 1], ht: [2, 0] }),
  ];

  // Other leagues (real league/team names from an API sample, re-dated to today).
  const others = OTHER_FIXTURES.map((o, i) => {
    const utcMs = cairoToUtc(today, 13 + (i % 9), (i * 10) % 60);
    const played = FINISHED.has(o.status);
    return {
      fixture: {
        id: 910000 + i,
        referee: null,
        timezone: TZ,
        date: new Date(utcMs).toISOString().replace(".000Z", "+00:00"),
        timestamp: Math.floor(utcMs / 1000),
        periods: { first: null, second: null },
        venue: o.venue,
        status: { long: LONG[o.status] ?? o.status, short: o.status, elapsed: played ? 90 : null, extra: null },
      },
      league: { ...o.league, season: S, standings: false },
      teams: { home: { ...o.home, winner: null }, away: { ...o.away, winner: null } },
      goals: played ? o.goals : { home: null, away: null },
      score: {
        halftime: { home: null, away: null },
        fulltime: played ? o.goals : { home: null, away: null },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
    };
  });

  // Egyptian league season: generated rounds 1-9 (finished) and 12-13 (upcoming).
  const rr = roundRobin(EGYPT_TEAMS.map((t) => t.id));
  const generated = [];
  rr.forEach((pairs, r) => {
    const roundNo = r + 1;
    if (roundNo > 13 || roundNo === 10 || roundNo === 11) return;
    const date = roundNo <= 9 ? addDays(today, -7 * (10 - roundNo)) : addDays(today, 7 * (roundNo - 11));
    pairs.forEach(([home, away], i) => {
      const id = 920000 + roundNo * 100 + i;
      const finished = roundNo <= 9;
      generated.push(
        fixture({
          id,
          leagueId: 233,
          season: S,
          round: `Regular Season - ${roundNo}`,
          utcMs: cairoToUtc(date, 17 + (i % 4), i % 2 ? 30 : 0),
          status: finished ? "FT" : "NS",
          home,
          away,
          goals: finished ? [hash(id) % 4, hash(id * 7) % 3] : [null, null],
          ht: finished ? [Math.min(hash(id) % 4, 1), 0] : [null, null],
        }),
      );
    });
  });

  const all = [...special, ...others, ...generated];
  const byId = new Map(all.map((f) => [f.fixture.id, f]));
  return { today, yesterday, tomorrow, season: S, all, byId };
}

// ── Derived resources ─────────────────────────────────────────────────────
export function eventsFor(f) {
  const status = f.fixture.status.short;
  if (!FINISHED.has(status) && !LIVE.has(status)) return [];
  const events = [];
  const add = (side, goals) => {
    const t = f.teams[side];
    const squad = squadOf(t.id);
    for (let i = 0; i < (goals ?? 0); i++) {
      const h = hash(f.fixture.id * 31 + i + (side === "home" ? 0 : 50));
      const scorer = squad[14 + (h % 4)];
      const assist = squad[8 + ((h >>> 4) % 6)];
      events.push({
        time: { elapsed: 5 + (h % 80), extra: null },
        team: { id: t.id, name: t.name, logo: t.logo },
        player: { id: scorer.id, name: scorer.name },
        assist: { id: assist.id, name: assist.name },
        type: "Goal",
        detail: "Normal Goal",
        comments: null,
      });
    }
    const carded = squad[3 + (hash(f.fixture.id + (side === "home" ? 1 : 2)) % 5)];
    events.push({
      time: { elapsed: 30 + (hash(f.fixture.id) % 40), extra: null },
      team: { id: t.id, name: t.name, logo: t.logo },
      player: { id: carded.id, name: carded.name },
      assist: { id: null, name: null },
      type: "Card",
      detail: "Yellow Card",
      comments: "Foul",
    });
    events.push({
      time: { elapsed: 60 + (hash(f.fixture.id * 3) % 20), extra: null },
      team: { id: t.id, name: t.name, logo: t.logo },
      player: { id: squad[12].id, name: squad[12].name },
      assist: { id: squad[17].id, name: squad[17].name },
      type: "subst",
      detail: "Substitution 1",
      comments: null,
    });
  };
  add("home", f.goals.home);
  add("away", f.goals.away);
  const elapsed = f.fixture.status.elapsed ?? 90;
  return events.filter((e) => e.time.elapsed <= elapsed).sort((a, b) => a.time.elapsed - b.time.elapsed);
}

function gridFor(index, rows) {
  let start = 0;
  for (let r = 0; r < rows.length; r++) {
    if (index < start + rows[r]) return `${r + 1}:${index - start + 1}`;
    start += rows[r];
  }
  return null;
}

function lineupFor(teamRef) {
  const squad = squadOf(teamRef.id);
  const xi = [squad[0], squad[2], squad[3], squad[4], squad[5], squad[8], squad[9], squad[10], squad[14], squad[15], squad[16]];
  const subs = [squad[1], squad[6], squad[7], squad[11], squad[12], squad[13], squad[17]];
  const pos = (p) => (p.position === "Goalkeeper" ? "G" : p.position === "Defender" ? "D" : p.position === "Midfielder" ? "M" : "F");
  return {
    team: { id: teamRef.id, name: teamRef.name, logo: teamRef.logo, colors: null },
    coach: { id: teamRef.id * 10, name: `Coach ${teamRef.name.split(" ")[0]}`, photo: null },
    formation: "4-3-3",
    // Grid like the real API: "row:col", row 1 = goalkeeper, rows follow the formation (1-4-3-3).
    startXI: xi.map((p, i) => ({ player: { id: p.id, name: p.name, number: p.number, pos: pos(p), grid: gridFor(i, [1, 4, 3, 3]) } })),
    substitutes: subs.map((p) => ({ player: { id: p.id, name: p.name, number: p.number, pos: pos(p), grid: null } })),
  };
}

function statsFor(f) {
  const h = hash(f.fixture.id);
  const poss = 40 + (h % 21);
  const block = (teamRef, mine) => ({
    team: { id: teamRef.id, name: teamRef.name, logo: teamRef.logo },
    statistics: [
      { type: "Shots on Goal", value: 2 + ((h >>> (mine ? 3 : 5)) % 6) },
      { type: "Total Shots", value: 7 + ((h >>> (mine ? 4 : 6)) % 9) },
      { type: "Ball Possession", value: `${mine ? poss : 100 - poss}%` },
      { type: "Corner Kicks", value: (h >>> (mine ? 7 : 9)) % 9 },
      { type: "Fouls", value: 8 + ((h >>> (mine ? 2 : 8)) % 8) },
      { type: "Yellow Cards", value: 1 },
      { type: "Red Cards", value: null },
      { type: "Goalkeeper Saves", value: (h >>> (mine ? 10 : 12)) % 6 },
    ],
  });
  return [block(f.teams.home, true), block(f.teams.away, false)];
}

export function fixtureDetails(f) {
  const status = f.fixture.status.short;
  const started = FINISHED.has(status) || LIVE.has(status);
  return {
    ...f,
    events: eventsFor(f),
    lineups: started ? [lineupFor(f.teams.home), lineupFor(f.teams.away)] : [],
    statistics: started ? statsFor(f) : [],
    players: [],
  };
}

export function standingsFor(ds, leagueId, season) {
  if (leagueId !== 233 || season !== ds.season) return [];
  const table = new Map(EGYPT_TEAMS.map((t) => [t.id, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, form: [] }]));
  const finished = ds.all
    .filter((f) => f.league.id === 233 && FINISHED.has(f.fixture.status.short))
    .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
  const seen = new Set();
  for (const f of finished) {
    if (seen.has(f.fixture.id)) continue;
    seen.add(f.fixture.id);
    const h = table.get(f.teams.home.id);
    const a = table.get(f.teams.away.id);
    if (!h || !a) continue;
    const [gh, ga] = [f.goals.home, f.goals.away];
    h.p++; a.p++; h.gf += gh; h.ga += ga; a.gf += ga; a.ga += gh;
    if (gh > ga) { h.w++; a.l++; h.form.push("W"); a.form.push("L"); }
    else if (gh < ga) { a.w++; h.l++; h.form.push("L"); a.form.push("W"); }
    else { h.d++; a.d++; h.form.push("D"); a.form.push("D"); }
  }
  const rows = [...table.values()]
    .map((r) => ({ ...r, pts: r.w * 3 + r.d }))
    .sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || x.team.id - y.team.id);
  const description = (rank) =>
    rank === 1 ? "Promotion - CAF Champions League" : rank === 3 ? "Promotion - CAF Confederation Cup" : rank >= rows.length - 1 ? "Relegation" : null;
  return [
    {
      league: {
        ...leagueRef(233, season, null),
        standings: [
          rows.map((r, i) => ({
            rank: i + 1,
            team: { id: r.team.id, name: r.team.name, logo: r.team.logo },
            points: r.pts,
            goalsDiff: r.gf - r.ga,
            group: "Premier League",
            form: r.form.slice(-5).reverse().join(""),
            status: "same",
            description: description(i + 1),
            all: { played: r.p, win: r.w, draw: r.d, lose: r.l, goals: { for: r.gf, against: r.ga } },
            home: { played: null, win: null, draw: null, lose: null, goals: { for: null, against: null } },
            away: { played: null, win: null, draw: null, lose: null, goals: { for: null, against: null } },
            update: new Date().toISOString(),
          })),
        ],
      },
    },
  ];
}

export function topScorersFor(ds, leagueId, season) {
  if (leagueId !== 233 || season !== ds.season) return [];
  const goals = new Map();
  for (const f of ds.all) {
    if (f.league.id !== 233 || !FINISHED.has(f.fixture.status.short)) continue;
    for (const e of eventsFor(f)) {
      if (e.type !== "Goal") continue;
      const g = goals.get(e.player.id) ?? { player: e.player, team: e.team, goals: 0, assists: 0, apps: 0 };
      g.goals++;
      goals.set(e.player.id, g);
    }
  }
  return [...goals.values()]
    .sort((a, b) => b.goals - a.goals || a.player.id - b.player.id)
    .slice(0, 20)
    .map((g) => ({
      player: { id: g.player.id, name: g.player.name, photo: `${MEDIA}/players/${g.player.id}.png`, nationality: "Egypt" },
      statistics: [
        {
          team: g.team,
          league: leagueRef(233, season, null),
          games: { appearences: 9, minutes: 700, position: "Attacker" },
          goals: { total: g.goals, assists: g.assists },
          penalty: { scored: 0 },
        },
      ],
    }));
}

export function leaguesList(ds) {
  const S = ds.season;
  const main = Object.entries(LEAGUES_META).map(([id, L]) => leagueEntry(Number(id), L.name, L.type, L.country, L.code, L.flag, S));
  const known = new Set(main.map((l) => l.league.id));
  const extra = SAMPLE_LEAGUES.filter((l) => !known.has(l.id)).map((l) =>
    leagueEntry(l.id, l.name, l.type === "League" ? "League" : "Cup", l.country, null, l.flag, S),
  );
  return [...main, ...extra];
}

/**
 * The real provider knows every club id used by the site's name dictionary, so
 * the mock answers with a generic record for unknown ids up to 50000. Higher
 * ids are treated as non-existent (404 scenarios).
 */
function genericTeam(id) {
  return { id, name: `Team ${id}`, country: "World", venue: "Stadium", city: "City", logo: `${MEDIA}/teams/${id}.png` };
}

export function genericLeague(ds, id) {
  return leagueEntry(id, `League ${id}`, "League", "World", null, null, ds.season, { standings: false, topScorers: false });
}

export function teamInfo(id) {
  const t = T(id) ?? (Number.isInteger(id) && id > 0 && id <= 50000 ? genericTeam(id) : null);
  if (!t) return null;
  return {
    team: { id: t.id, name: t.name, code: t.name.slice(0, 3).toUpperCase(), country: t.country, founded: 1900 + (hash(id) % 100), national: false, logo: t.logo },
    venue: { id: t.id * 3, name: t.venue, address: null, city: t.city, capacity: 20000 + (hash(id) % 50000), surface: "grass", image: null },
  };
}

export function squadResponse(id) {
  const t = T(id);
  if (!t) return [];
  return [{ team: { id: t.id, name: t.name, logo: t.logo }, players: squadOf(id).map(({ fullFirst: _f, fullLast: _l, ...p }) => p) }];
}

export function playerResponse(ds, playerId, season) {
  const teamId = Math.floor(playerId / 100);
  const t = T(teamId);
  if (!t || season > ds.season || season < ds.season - 2) return [];
  const p = squadOf(teamId).find((x) => x.id === playerId);
  if (!p) return [];
  const goals = topScorersFor(ds, 233, ds.season).find((s) => s.player.id === playerId)?.statistics[0].goals.total ?? 0;
  return [
    {
      player: {
        id: p.id,
        name: p.name,
        firstname: p.fullFirst,
        lastname: p.fullLast,
        age: p.age,
        birth: { date: `${2026 - p.age}-03-15`, place: t.city, country: t.country },
        nationality: t.country,
        height: `${170 + (hash(p.id) % 25)} cm`,
        weight: `${65 + (hash(p.id) % 20)} kg`,
        injured: false,
        photo: p.photo,
      },
      statistics: [
        {
          team: { id: t.id, name: t.name, logo: t.logo },
          league: t.country === "Egypt" ? leagueRef(233, season, null) : leagueRef(39, season, null),
          games: { appearences: 9, lineups: 8, minutes: 720, number: p.number, position: p.position, rating: "7.1", captain: false },
          goals: { total: season === ds.season ? goals : 2, conceded: null, assists: 1, saves: null },
          cards: { yellow: 1, yellowred: 0, red: 0 },
        },
      ],
    },
  ];
}

export function teamLeagues(ds, teamId) {
  const t = T(teamId);
  if (!t) return [];
  const all = leaguesList(ds);
  const ids = t.country === "Egypt" ? [233, 714] : t.country === "England" ? [39] : t.country === "Spain" ? [140] : t.country === "Saudi-Arabia" ? [307] : [12];
  if (teamId === 1577 || teamId === 1036) ids.push(12);
  return all.filter((l) => ids.includes(l.league.id));
}

export function headToHead(ds, a, b) {
  const list = ds.all.filter(
    (f) => (f.teams.home.id === a && f.teams.away.id === b) || (f.teams.home.id === b && f.teams.away.id === a),
  );
  if (!T(a) || !T(b)) return list;
  const past = [1, 2, 3].map((k) =>
    fixture({
      id: 930000 + k + a + b,
      leagueId: 233,
      season: ds.season - k,
      round: "Regular Season - 20",
      utcMs: cairoToUtc(addDays(ds.today, -365 * k), 20, 0),
      status: "FT",
      home: k % 2 ? a : b,
      away: k % 2 ? b : a,
      goals: [hash(a + b + k) % 3, hash(a * b + k) % 3],
      ht: [0, 0],
    }),
  );
  return [...list, ...past];
}

export { FINISHED, LIVE, ALL_TEAMS };
