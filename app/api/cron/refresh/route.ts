import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { getFeedItems } from "@/lib/content/feeds";
import { cronSecret } from "@/lib/env";
import { EGYPT_PREMIER_LEAGUE_ID } from "@/lib/football/featured";
import { cairoToday, currentSeasonOf, getFixturesByDate, getLeagueDetails, getLeagues, getStandings } from "@/lib/football/service";
import type { DataResult } from "@/lib/football/types";
import { recordCronRun, type CronRunEntry } from "@/lib/monitoring";
import { addDays } from "@/lib/utils/dates";

function authorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function detail(res: DataResult<unknown>): { ok: boolean; detail: string } {
  if (res.error && !res.stale) return { ok: false, detail: res.error.kind };
  if (res.stale) return { ok: false, detail: `stale (${res.error?.kind ?? "?"})` };
  return { ok: true, detail: `${res.source}${Array.isArray(res.data) ? ` · ${res.data.length}` : ""}` };
}

/**
 * Daily warm-up (Vercel Cron, see vercel.json). Refreshes yesterday's final
 * results and today's/tomorrow's fixtures, and warms reference data. Live
 * updates do NOT depend on this job (Hobby plans allow one run per day).
 */
export async function GET(request: NextRequest) {
  const secret = cronSecret();
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!authorized(request, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const startedAt = new Date().toISOString();
  const tasks: CronRunEntry["tasks"] = [];
  const today = cairoToday();
  const run = async (name: string, fn: () => Promise<{ ok: boolean; detail: string }>) => {
    try {
      tasks.push({ name, ...(await fn()) });
    } catch (err) {
      tasks.push({ name, ok: false, detail: err instanceof Error ? err.message : String(err) });
    }
  };

  for (const [name, offset, force] of [
    ["fixtures-yesterday", -1, true],
    ["fixtures-today", 0, true],
    ["fixtures-tomorrow", 1, false],
  ] as const) {
    await run(name, async () => {
      const date = addDays(today, offset);
      const res = await getFixturesByDate(date, { force });
      revalidateTag(`fixtures:${date}`, "max");
      return detail(res);
    });
  }
  await run("leagues", async () => {
    const res = await getLeagues();
    if (res.source === "provider") revalidateTag("leagues", "max");
    return detail(res);
  });
  await run("egypt-standings", async () => {
    const league = await getLeagueDetails(EGYPT_PREMIER_LEAGUE_ID);
    const season = currentSeasonOf(league.data);
    if (!season) return detail(league);
    const res = await getStandings(EGYPT_PREMIER_LEAGUE_ID, season);
    if (res.source === "provider") revalidateTag(`standings:${EGYPT_PREMIER_LEAGUE_ID}`, "max");
    return detail(res);
  });
  await run("news-feeds", async () => {
    const { items, errors } = await getFeedItems();
    revalidateTag("feeds", "max");
    return { ok: errors.length === 0, detail: `${items.length} items${errors.length ? `, ${errors.length} errors` : ""}` };
  });

  const entry: CronRunEntry = { startedAt, finishedAt: new Date().toISOString(), ok: tasks.every((t) => t.ok), tasks };
  await recordCronRun(entry);
  return Response.json(entry, { headers: { "Cache-Control": "no-store" } });
}
