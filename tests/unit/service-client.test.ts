import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/football/errors";
import { apiFootballGet, buildQuery } from "@/lib/football/providers/api-football/client";
import { setProviderForTests, type FootballProvider } from "@/lib/football/providers";
import { cairoToday, fixturesTtl, getFixturesByDate, getLiveMatches } from "@/lib/football/service";
import { getMonitoringSnapshot } from "@/lib/monitoring";
import { addDays, cairoDayBoundsUtc } from "@/lib/utils/dates";
import { makeMatch } from "./helpers/factories";

function fakeProvider(impl: Partial<FootballProvider>): FootballProvider {
  const notUsed = async () => {
    throw new Error("not used");
  };
  return {
    id: "api-football",
    name: "fake",
    website: "https://example.invalid",
    isConfigured: () => true,
    getAccountStatus: notUsed,
    getFixturesByDate: notUsed,
    getLiveFixtures: notUsed,
    getFixture: notUsed,
    getHeadToHead: notUsed,
    getLeagues: notUsed,
    getStandings: notUsed,
    getLeagueFixtures: notUsed,
    getTopScorers: notUsed,
    getTeams: notUsed,
    getTeamFixtures: notUsed,
    getSquad: notUsed,
    getPlayer: notUsed,
    getPlayerSeasons: notUsed,
    ...impl,
  } as FootballProvider;
}

describe("data layer (service)", () => {
  beforeEach(() => {
    process.env.FOOTBALL_API_KEY = "unit-test-key";
  });

  it("returns only the Cairo day's fixtures, de-duplicated", async () => {
    const today = cairoToday();
    const { start } = cairoDayBoundsUtc(today);
    const inDay = makeMatch({ id: 1, code: "FT", kickoffMs: start.getTime() + 15 * 3600_000 });
    const staleCopy = { ...inDay, status: { ...inDay.status, code: "NS" as const, group: "upcoming" as const } };
    const nextDay = makeMatch({ id: 2, kickoffMs: start.getTime() + 24.5 * 3600_000 });
    setProviderForTests(fakeProvider({ getFixturesByDate: async () => [inDay, staleCopy, nextDay] }));
    const res = await getFixturesByDate(today);
    expect(res.data?.map((m) => m.id)).toEqual([1]);
    expect(res.data?.[0]?.status.code).toBe("FT");
  });

  it("keeps showing the last saved copy when the provider later fails", async () => {
    const today = cairoToday();
    const { start } = cairoDayBoundsUtc(today);
    const m = makeMatch({ id: 3, code: "FT", kickoffMs: start.getTime() + 10 * 3600_000 });
    let fail = false;
    setProviderForTests(
      fakeProvider({
        getFixturesByDate: async () => {
          if (fail) throw new ProviderError("server", "HTTP 503");
          return [m];
        },
      }),
    );
    await getFixturesByDate(today);
    fail = true;
    const res = await getFixturesByDate(today, { force: true });
    expect(res.data?.map((x) => x.id)).toEqual([3]);
    expect(res.stale).toBe(true);
    expect(res.error?.kind).toBe("server");
  });

  it("derives live matches from today's fixtures (no extra provider call)", async () => {
    const today = cairoToday();
    const { start } = cairoDayBoundsUtc(today);
    const calls = vi.fn();
    setProviderForTests(
      fakeProvider({
        getFixturesByDate: async (date) => {
          calls(date);
          return date === today
            ? [makeMatch({ id: 4, code: "2H", elapsed: 60, kickoffMs: start.getTime() + 12 * 3600_000 }), makeMatch({ id: 5, code: "NS", kickoffMs: start.getTime() + 20 * 3600_000, away: { id: 9, name: "X", nameAr: null, logo: null, slug: "x-9" } })]
            : [];
        },
      }),
    );
    const live = await getLiveMatches();
    expect(live.data?.map((m) => m.id)).toEqual([4]);
    expect(calls.mock.calls.every(([d]) => d === today || d === addDays(today, -1))).toBe(true);
  });

  it("refreshes live days fast and settled days slowly", () => {
    const today = "2026-10-21";
    const now = Date.UTC(2026, 9, 21, 12) / 1000;
    expect(fixturesTtl([makeMatch({ code: "1H", elapsed: 5 })], today, today, now)).toBe(60);
    expect(fixturesTtl([makeMatch({ code: "FT" })], "2026-10-10", today, now)).toBe(86400);
    expect(fixturesTtl([makeMatch({ code: "NS", kickoffMs: Date.UTC(2026, 9, 21, 19) })], today, today, now)).toBe(600);
  });
});

describe("API-Football client", () => {
  beforeEach(() => {
    process.env.FOOTBALL_API_KEY = "unit-test-key";
    process.env.FOOTBALL_API_BASE_URL = "http://127.0.0.1:9";
  });

  const ok = (body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", ...headers } });

  it("whitelists and sanitises query parameters", () => {
    expect(buildQuery({ date: "2026-10-21", timezone: "Africa/Cairo" })).toBe("date=2026-10-21&timezone=Africa%2FCairo");
    expect(buildQuery({ search: "Al Ahly<script>" })).toBe("search=Al+Ahlyscript");
    expect(() => buildQuery({ evil: "1" })).toThrow();
  });

  it("sends only the API key header and records quota headers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ get: "status", errors: [], results: 1, response: [] }, { "x-ratelimit-requests-limit": "100", "x-ratelimit-requests-remaining": "77" }),
    );
    await apiFootballGet("fixtures", { date: "2026-10-21" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("http://127.0.0.1:9/fixtures?date=2026-10-21");
    expect(init?.headers).toEqual({ "x-apisports-key": "unit-test-key" });
    const mon = await getMonitoringSnapshot();
    expect(mon.requests[0]?.dailyRemaining).toBe(77);
    expect(JSON.stringify(mon)).not.toContain("unit-test-key");
  });

  it.each([
    [{ token: "Error/Missing application key." }, "auth"],
    [{ requests: "You have reached the request limit for the day" }, "quota_exceeded"],
    [{ rateLimit: "Too many requests" }, "rate_limited"],
    [{ plan: "Free plans do not have access to this season" }, "plan_restricted"],
  ])("classifies body errors %j as %s", async (errors, kind) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ errors, results: 0, response: [] }));
    await expect(apiFootballGet("fixtures", { date: "2026-10-21" })).rejects.toMatchObject({ kind });
  });

  it("retries once on 5xx and then fails with a server error", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("oops", { status: 503 }));
    await expect(apiFootballGet("fixtures", { date: "2026-10-21" })).rejects.toMatchObject({ kind: "server" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps HTTP 429, timeouts and invalid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 429 }));
    await expect(apiFootballGet("fixtures", { date: "2026-10-21" })).rejects.toMatchObject({ kind: "rate_limited" });

    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(timeout);
    await expect(apiFootballGet("fixtures", { date: "2026-10-22" })).rejects.toMatchObject({ kind: "timeout" });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(apiFootballGet("fixtures", { date: "2026-10-23" })).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("refuses to run without an API key", async () => {
    delete process.env.FOOTBALL_API_KEY;
    await expect(apiFootballGet("status")).rejects.toMatchObject({ kind: "not_configured" });
  });

  it("rejects insecure non-local base URLs", async () => {
    process.env.FOOTBALL_API_BASE_URL = "http://evil.example.com";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ errors: [], results: 0, response: [] }));
    await apiFootballGet("status");
    expect(String(fetchMock.mock.calls[0]![0])).toBe("https://v3.football.api-sports.io/status");
  });
});
