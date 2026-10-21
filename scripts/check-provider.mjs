#!/usr/bin/env node
/**
 * Connection test for the football data provider (API-Football v3).
 *   npm run check:provider
 * Reads FOOTBALL_API_KEY / FOOTBALL_API_BASE_URL from the environment or from
 * .env.local. Uses 4 requests: /status, /leagues?country=Egypt,
 * /leagues?search=CAF and today's fixtures (Cairo date).
 *
 * For today's fixtures it also checks that the UTC offset written by the
 * provider in `fixture.date` (requested with timezone=Africa/Cairo) equals the
 * offset computed locally from `fixture.timestamp` with the IANA rules for
 * Egypt (DST aware), and prints today's Egyptian matches in Cairo time so they
 * can be compared with the official schedule.
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

const cairoPartsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Cairo",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Cairo wall-clock offset from UTC (minutes) at an epoch-ms instant: 180 in summer, 120 in winter. */
function cairoOffsetMinutes(ms) {
  const p = Object.fromEntries(cairoPartsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return Math.round((wall - Math.floor(ms / 1000) * 1000) / 60000);
}

/** "+03:00" → 180, "Z"/"+00:00" → 0, missing → null. */
function offsetOf(iso) {
  if (typeof iso !== "string") return null;
  const m = /([+-])(\d{2}):?(\d{2})$/.exec(iso);
  if (m) return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  return /Z$/i.test(iso) ? 0 : null;
}

const fmtOffset = (min) => `UTC${min < 0 ? "-" : "+"}${Math.floor(Math.abs(min) / 60)}${Math.abs(min) % 60 ? `:${String(Math.abs(min) % 60).padStart(2, "0")}` : ""}`;
const cairoClock = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

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

    // Time-zone consistency: provider's Cairo offset vs. the IANA rules used by the site.
    const checked = list.filter((f) => typeof f.fixture?.timestamp === "number" && offsetOf(f.fixture?.date) !== null);
    const mismatched = checked.filter((f) => offsetOf(f.fixture.date) !== cairoOffsetMinutes(f.fixture.timestamp * 1000));
    if (!checked.length) {
      console.log("   (no fixtures with an explicit offset to compare today)");
    } else if (mismatched.length) {
      failed = true;
      const f = mismatched[0];
      console.error(
        `✗ Cairo offset mismatch in ${mismatched.length}/${checked.length} fixtures: provider wrote ${f.fixture.date} (${fmtOffset(offsetOf(f.fixture.date))}) but Cairo is ${fmtOffset(cairoOffsetMinutes(f.fixture.timestamp * 1000))} at that instant.`,
      );
      console.error("   The site shows times from fixture.timestamp (UTC), so displayed times stay correct; matches near midnight may be listed under the neighbouring day.");
    } else {
      console.log(`✓ provider Cairo offset matches the site's IANA rules (${fmtOffset(offsetOf(checked[0].fixture.date))}) for ${checked.length} fixtures`);
    }

    // Today's Egyptian matches in Cairo time, for a manual comparison with the official schedule.
    const sorted = [...eg].sort((a, b) => (a.fixture?.timestamp ?? 0) - (b.fixture?.timestamp ?? 0));
    const cairoDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" });
    for (const f of sorted) {
      const ts = f.fixture?.timestamp;
      const time = typeof ts === "number" ? cairoClock.format(new Date(ts * 1000)) : "--:--";
      const day = typeof ts === "number" ? cairoDay.format(new Date(ts * 1000)) : today;
      const note = day !== today ? ` (Cairo date ${day} — the site lists it on that day, not today)` : "";
      console.log(`   - ${time} ${f.teams?.home?.name ?? "?"} × ${f.teams?.away?.name ?? "?"} [${f.league?.id} ${f.league?.name}] ${f.fixture?.status?.short ?? ""}${note}`);
    }
  }
} catch (err) {
  failed = true;
  console.error("✗ Request failed:", err instanceof Error ? err.message : err);
}
process.exit(failed ? 1 : 0);
