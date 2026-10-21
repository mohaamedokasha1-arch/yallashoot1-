#!/usr/bin/env node
/**
 * Mock API-Football v3 server for automated tests ONLY.
 * Usage: node tests/mock-api/server.mjs  (PORT via MOCK_API_PORT, default 4010)
 * Requires the header `x-apisports-key: <MOCK_API_KEY>` (default "test-key").
 *
 * Extra endpoints:  GET /__stats  → request counters (to verify caching)
 *                   POST /__reset → reset counters
 */
import { createServer } from "node:http";
import {
  addDays,
  genericLeague,
  ALL_TEAMS,
  createDataset,
  fixtureDetails,
  headToHead,
  leaguesList,
  playerResponse,
  squadResponse,
  standingsFor,
  teamInfo,
  teamLeagues,
  topScorersFor,
} from "./data.mjs";

const PORT = Number(process.env.MOCK_API_PORT ?? 4010);
const KEY = process.env.MOCK_API_KEY ?? "test-key";
const DAILY_LIMIT = 7500;

let counters = { total: 0, byEndpoint: {} };

function send(res, status, body, extraHeaders = {}) {
  counters.total++;
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "x-ratelimit-requests-limit": String(DAILY_LIMIT),
    "x-ratelimit-requests-remaining": String(Math.max(0, DAILY_LIMIT - counters.total)),
    "X-RateLimit-Limit": "300",
    "X-RateLimit-Remaining": "299",
    ...extraHeaders,
  });
  res.end(json);
}

function envelope(endpoint, params, response, errors = []) {
  return {
    get: endpoint,
    parameters: params,
    errors,
    results: Array.isArray(response) ? response.length : 1,
    paging: { current: 1, total: 1 },
    response,
  };
}

function handle(endpoint, q, ds) {
  const num = (k) => (q[k] !== undefined ? Number(q[k]) : undefined);
  switch (endpoint) {
    case "status":
      return {
        account: { firstname: "Mock", lastname: "Account", email: "mock@example.invalid" },
        subscription: { plan: "Mock Pro", end: "2030-01-01T00:00:00+00:00", active: true },
        requests: { current: counters.total, limit_day: DAILY_LIMIT },
      };
    case "fixtures": {
      if (q.id) {
        const f = ds.byId.get(num("id"));
        return f ? [fixtureDetails(f)] : [];
      }
      if (q.live) return ds.all.filter((f) => ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"].includes(f.fixture.status.short));
      if (q.date) {
        const list = ds.all.filter((f) => {
          const local = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(
            new Date(f.fixture.timestamp * 1000),
          );
          return local === q.date;
        });
        if (q.date === ds.today) {
          // Provider quirks the site must survive:
          // 1) a stale duplicate of a finished fixture (must be de-duplicated, finished wins)
          const finished = ds.byId.get(900006);
          list.push({ ...finished, fixture: { ...finished.fixture, status: { long: "Not Started", short: "NS", elapsed: null, extra: null } }, goals: { home: null, away: null } });
          // 2) a fixture of the next Cairo day (00:30) leaking into today's list
          list.push(ds.byId.get(900008));
        }
        return list.filter((f) => !q.league || f.league.id === num("league"));
      }
      if (q.league && q.season) return ds.all.filter((f) => f.league.id === num("league") && f.league.season === num("season"));
      if (q.team && q.season)
        return ds.all.filter((f) => (f.teams.home.id === num("team") || f.teams.away.id === num("team")) && f.league.season === num("season"));
      return [];
    }
    case "fixtures/headtohead": {
      const [a, b] = String(q.h2h ?? "").split("-").map(Number);
      return headToHead(ds, a, b);
    }
    case "standings":
      return standingsFor(ds, num("league"), num("season"));
    case "players/topscorers":
      return topScorersFor(ds, num("league"), num("season"));
    case "leagues": {
      let list = leaguesList(ds);
      if (q.id) {
        const id = num("id");
        list = list.filter((l) => l.league.id === id);
        // The real provider knows every league id referenced by the site's registry.
        if (list.length === 0 && Number.isInteger(id) && id > 0 && id <= 2000) list = [genericLeague(ds, id)];
      }
      if (q.country) list = list.filter((l) => l.country.name.toLowerCase() === String(q.country).toLowerCase());
      if (q.search) {
        const s = String(q.search).toLowerCase();
        list = list.filter((l) => l.league.name.toLowerCase().includes(s) || l.country.name.toLowerCase().includes(s));
      }
      if (q.team) list = teamLeagues(ds, num("team"));
      return list;
    }
    case "teams": {
      if (q.id) {
        const t = teamInfo(num("id"));
        return t ? [t] : [];
      }
      if (q.search) {
        const s = String(q.search).toLowerCase();
        return [...ALL_TEAMS.values()].filter((t) => t.name.toLowerCase().includes(s)).map((t) => teamInfo(t.id));
      }
      if (q.league) {
        const ids = new Set(ds.all.filter((f) => f.league.id === num("league")).flatMap((f) => [f.teams.home.id, f.teams.away.id]));
        return [...ids].map((id) => teamInfo(id)).filter(Boolean);
      }
      return [];
    }
    case "players/squads":
      return squadResponse(num("team"));
    case "players":
      return playerResponse(ds, num("id"), num("season"));
    case "players/seasons": {
      const id = num("player");
      return ALL_TEAMS.has(Math.floor(id / 100)) ? [ds.season - 2, ds.season - 1, ds.season] : [];
    }
    default:
      return null;
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname === "/__stats") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(counters));
    return;
  }
  if (url.pathname === "/__reset" && req.method === "POST") {
    counters = { total: 0, byEndpoint: {} };
    res.writeHead(204);
    res.end();
    return;
  }
  const endpoint = url.pathname.replace(/^\/+/, "");
  const q = Object.fromEntries(url.searchParams.entries());
  counters.byEndpoint[endpoint] = (counters.byEndpoint[endpoint] ?? 0) + 1;

  if (req.method !== "GET") return send(res, 405, envelope(endpoint, q, [], { method: "Only GET is allowed" }));
  if (req.headers["x-apisports-key"] !== KEY) {
    return send(res, 200, envelope(endpoint, q, [], { token: "Error/Missing application key." }));
  }

  const ds = createDataset();
  if (endpoint === "fixtures" && q.date) {
    if (q.date === addDays(ds.today, 5)) return send(res, 500, { message: "Internal Server Error" });
    if (q.date === addDays(ds.today, 6)) return send(res, 429, envelope(endpoint, q, [], { rateLimit: "Too many requests." }));
    if (q.date === addDays(ds.today, 4)) return send(res, 200, envelope(endpoint, q, []));
  }
  let response;
  try {
    response = handle(endpoint, q, ds);
  } catch (err) {
    console.error("[mock-api] handler error", err);
    return send(res, 500, { message: "Mock handler error" });
  }
  if (response === null) return send(res, 404, { message: `Endpoint '${endpoint}' does not exist` });
  return send(res, 200, envelope(endpoint, q, response));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-api] listening on http://127.0.0.1:${PORT} (key: ${KEY})`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
