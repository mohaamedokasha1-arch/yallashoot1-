#!/usr/bin/env node
/**
 * Connection test for the football data provider (API-Football v3).
 *   npm run check:provider
 * Reads FOOTBALL_API_KEY / FOOTBALL_API_BASE_URL from the environment or from
 * .env.local. Uses 4 requests: /status, /leagues?country=Egypt,
 * /leagues?search=CAF and today's fixtures (Cairo date).
 */
import { existsSync } from "node:fs";

if (existsSync(".env.local") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");

const key = process.env.FOOTBALL_API_KEY?.trim();
const base = (process.env.FOOTBALL_API_BASE_URL?.trim() || "https://v3.football.api-sports.io").replace(/\/+$/, "");
if (!key) {
  console.error("✗ FOOTBALL_API_KEY is not set (add it to .env.local or the environment).");
  process.exit(1);
}

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function call(path) {
  const started = Date.now();
  const res = await fetch(`${base}/${path}`, { headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(10000) });
  const body = await res.json().catch(() => ({}));
  const hasErrors = body.errors && (Array.isArray(body.errors) ? body.errors.length : Object.keys(body.errors).length);
  return {
    status: res.status,
    ms: Date.now() - started,
    daily: `${res.headers.get("x-ratelimit-requests-remaining") ?? "?"}/${res.headers.get("x-ratelimit-requests-limit") ?? "?"}`,
    errors: hasErrors ? body.errors : res.ok ? null : { http: res.status },
    body,
  };
}

let failed = false;
try {
  const status = await call("status");
  if (status.errors) {
    failed = true;
    console.error("✗ /status error:", JSON.stringify(status.errors));
  } else {
    const r = status.body.response ?? {};
    console.log(
      `✓ /status (${status.ms}ms) plan=${r.subscription?.plan ?? "?"} active=${r.subscription?.active ?? "?"} requests=${r.requests?.current ?? "?"}/${r.requests?.limit_day ?? "?"}`,
    );
  }

  const egypt = await call("leagues?country=Egypt");
  if (egypt.errors) {
    failed = true;
    console.error("✗ /leagues?country=Egypt:", JSON.stringify(egypt.errors));
  } else {
    console.log(`✓ Egyptian competitions (${egypt.body.results}):`);
    for (const l of egypt.body.response ?? []) {
      const current = (l.seasons ?? []).find((s) => s.current);
      console.log(
        `   - [${l.league.id}] ${l.league.name} (${l.league.type}) current season: ${current?.year ?? "—"} standings: ${current?.coverage?.standings ?? "?"}`,
      );
    }
  }

  const caf = await call("leagues?search=CAF");
  if (caf.errors) console.error("✗ /leagues?search=CAF:", JSON.stringify(caf.errors));
  else for (const l of caf.body.response ?? []) console.log(`   - [${l.league.id}] ${l.league.name} (${l.country?.name})`);

  const fixtures = await call(`fixtures?date=${today}&timezone=Africa/Cairo`);
  if (fixtures.errors) {
    failed = true;
    console.error(`✗ fixtures ${today}:`, JSON.stringify(fixtures.errors));
  } else {
    const list = fixtures.body.response ?? [];
    const eg = list.filter((f) => f.league?.country === "Egypt");
    console.log(`✓ fixtures ${today} (Cairo): ${list.length} total, ${eg.length} Egyptian — daily quota left ${fixtures.daily}`);
  }
} catch (err) {
  failed = true;
  console.error("✗ Request failed:", err instanceof Error ? err.message : err);
}
process.exit(failed ? 1 : 0);
