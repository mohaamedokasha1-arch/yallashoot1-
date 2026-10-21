import { beforeEach, describe, expect, it, vi } from "vitest";
import { decideBudget, getQuotaState, parseRateLimitHeaders, recordFailure, ttlScaleFor, type QuotaState } from "@/lib/football/budget";
import { getResource } from "@/lib/football/cache";
import { ProviderError } from "@/lib/football/errors";

function state(overrides: Partial<QuotaState> = {}): QuotaState {
  return {
    day: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
    dailyLimit: 100,
    dailyRemaining: 50,
    minuteLimit: 10,
    minuteRemaining: 9,
    blockedUntil: null,
    blockedReason: null,
    failures: 0,
    circuitOpenUntil: null,
    ...overrides,
  };
}

describe("quota guard", () => {
  const opts = { now: Date.now(), reservePercent: 10, dailyLimitOverride: null };
  it("reserves the end of the daily quota for critical requests", () => {
    expect(decideBudget(state({ dailyRemaining: 50 }), "low", opts)).toEqual({ ok: true });
    expect(decideBudget(state({ dailyRemaining: 15 }), "low", opts)).toEqual({ ok: false, kind: "budget_guard" });
    expect(decideBudget(state({ dailyRemaining: 9 }), "high", opts)).toEqual({ ok: false, kind: "budget_guard" });
    expect(decideBudget(state({ dailyRemaining: 9 }), "critical", opts)).toEqual({ ok: true });
    expect(decideBudget(state({ dailyRemaining: 0 }), "critical", opts)).toEqual({ ok: false, kind: "quota_exceeded" });
  });

  it("honours 429 blocks and the circuit breaker", () => {
    expect(decideBudget(state({ blockedUntil: Date.now() + 30_000, blockedReason: "rate_limited" }), "critical", opts)).toEqual({ ok: false, kind: "rate_limited" });
    expect(decideBudget(state({ circuitOpenUntil: Date.now() + 30_000 }), "critical", opts)).toEqual({ ok: false, kind: "circuit_open" });
    expect(decideBudget(state({ day: "2000-01-01", dailyRemaining: 0 }), "low", opts)).toEqual({ ok: true });
  });

  it("opens the circuit only after consecutive failures in a short window", async () => {
    for (let i = 0; i < 4; i++) await recordFailure("server");
    expect((await getQuotaState()).circuitOpenUntil).toBeNull();
    await recordFailure("timeout");
    expect((await getQuotaState()).circuitOpenUntil).toBeGreaterThan(Date.now());
  });

  it("reads API-Football rate-limit headers and scales freshness for small plans", () => {
    const h = new Headers({ "x-ratelimit-requests-limit": "100", "x-ratelimit-requests-remaining": "42", "X-RateLimit-Limit": "10", "X-RateLimit-Remaining": "9" });
    expect(parseRateLimitHeaders(h)).toEqual({ dailyLimit: 100, dailyRemaining: 42, minuteLimit: 10, minuteRemaining: 9 });
    expect(ttlScaleFor(100, null)).toBe(10);
    expect(ttlScaleFor(7500, null)).toBe(1);
    expect(ttlScaleFor(7500, 2)).toBe(2);
  });
});

describe("shared resource cache", () => {
  beforeEach(() => {
    process.env.FOOTBALL_API_KEY = "unit-test-key";
  });

  it("calls the provider once and serves the cached copy afterwards", async () => {
    const fetcher = vi.fn(async () => [1, 2, 3]);
    const a = await getResource({ key: "t:1", ttl: 600, priority: "critical", fetcher });
    const b = await getResource({ key: "t:1", ttl: 600, priority: "critical", fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a.source).toBe("provider");
    expect(b.source).toBe("cache");
    expect(b.data).toEqual([1, 2, 3]);
    expect(b.fetchedAt).toBe(a.fetchedAt);
  });

  it("de-duplicates concurrent requests (single flight)", async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return "x";
    });
    await Promise.all([1, 2, 3, 4].map(() => getResource({ key: "t:sf", ttl: 600, priority: "critical", fetcher })));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves the last good copy (flagged stale) when the provider fails", async () => {
    await getResource({ key: "t:2", ttl: 600, priority: "critical", fetcher: async () => ["good"] });
    const res = await getResource({
      key: "t:2",
      ttl: 600,
      priority: "critical",
      force: true,
      fetcher: async () => {
        throw new ProviderError("server", "HTTP 500");
      },
    });
    expect(res.data).toEqual(["good"]);
    expect(res.stale).toBe(true);
    expect(res.error?.kind).toBe("server");
  });

  it("returns an explicit error (not fake data) when nothing was ever stored", async () => {
    const res = await getResource({
      key: "t:3",
      ttl: 600,
      priority: "critical",
      fetcher: async () => {
        throw new ProviderError("timeout", "slow");
      },
    });
    expect(res.data).toBeNull();
    expect(res.error?.kind).toBe("timeout");
  });

  it("does not replace good data with a suspicious empty response", async () => {
    const opts = { key: "t:4", ttl: 600, priority: "critical" as const, isEmpty: (d: number[]) => d.length === 0, force: true };
    await getResource({ ...opts, fetcher: async () => [1, 2] });
    const first = await getResource({ ...opts, fetcher: async () => [] as number[] });
    expect(first.data).toEqual([1, 2]);
    expect(first.error?.kind).toBe("suspicious_empty");
    await getResource({ ...opts, fetcher: async () => [] as number[] });
    const third = await getResource({ ...opts, fetcher: async () => [] as number[] });
    expect(third.data).toEqual([]);
    expect(third.error).toBeNull();
  });

  it("backs off briefly per resource after a transient failure", async () => {
    const fetcher = vi.fn(async () => {
      throw new ProviderError("server", "HTTP 500");
    });
    await getResource({ key: "t:8", ttl: 600, priority: "critical", fetcher });
    const again = await getResource({ key: "t:8", ttl: 600, priority: "critical", fetcher });
    expect(again.error?.kind).toBe("server");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("remembers plan restrictions to avoid wasting quota", async () => {
    const fetcher = vi.fn(async () => {
      throw new ProviderError("plan_restricted", "plan");
    });
    const a = await getResource({ key: "t:5", ttl: 600, priority: "critical", fetcher });
    const b = await getResource({ key: "t:5", ttl: 600, priority: "critical", fetcher });
    expect(a.error?.kind).toBe("plan_restricted");
    expect(b.error?.kind).toBe("plan_restricted");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports not_configured without calling anything when the key is missing", async () => {
    delete process.env.FOOTBALL_API_KEY;
    const fetcher = vi.fn(async () => 1);
    const res = await getResource({ key: "t:6", ttl: 600, priority: "critical", fetcher });
    expect(res.error?.kind).toBe("not_configured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("applies the merge function (e.g. no status regression)", async () => {
    const opts = { key: "t:7", ttl: 600, priority: "critical" as const, force: true, merge: (prev: number | null, next: number) => Math.max(prev ?? 0, next) };
    await getResource({ ...opts, fetcher: async () => 5 });
    const res = await getResource({ ...opts, fetcher: async () => 3 });
    expect(res.data).toBe(5);
  });
});
