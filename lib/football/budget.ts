import "server-only";
import { footballConfig } from "@/lib/env";
import { getStore } from "@/lib/store";
import type { DataErrorKind } from "./types";

/**
 * Provider quota guard.
 *
 * API-Football reports quotas in response headers:
 *   x-ratelimit-requests-limit / x-ratelimit-requests-remaining  (per day, reset 00:00 UTC)
 *   X-RateLimit-Limit / X-RateLimit-Remaining                    (per minute)
 * We persist the latest values and refuse non-critical requests when the
 * remaining daily budget falls into the reserved share, so live/today data
 * keeps working until the quota resets. A circuit breaker pauses requests
 * after repeated server/network failures.
 */

export type Priority = "critical" | "high" | "low";

export interface RateLimitHeaders {
  dailyLimit: number | null;
  dailyRemaining: number | null;
  minuteLimit: number | null;
  minuteRemaining: number | null;
}

export interface QuotaState extends RateLimitHeaders {
  /** UTC day the daily numbers refer to. */
  day: string;
  updatedAt: string;
  /** Requests blocked until this epoch ms (after 429 / quota exhausted). */
  blockedUntil: number | null;
  blockedReason: "rate_limited" | "quota_exceeded" | null;
  failures: number;
  lastFailureAt?: number | null;
  circuitOpenUntil: number | null;
}

const STATE_KEY = "quota:state";
const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 2 * 60_000;
const CIRCUIT_OPEN_MS = 60_000;
const DEFAULT_MINUTE_LIMIT = 10;

function utcDay(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function nextUtcMidnight(ms = Date.now()): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

function emptyState(): QuotaState {
  return {
    day: utcDay(),
    updatedAt: new Date().toISOString(),
    dailyLimit: null,
    dailyRemaining: null,
    minuteLimit: null,
    minuteRemaining: null,
    blockedUntil: null,
    blockedReason: null,
    failures: 0,
    circuitOpenUntil: null,
  };
}

export async function getQuotaState(): Promise<QuotaState> {
  try {
    const state = await getStore().get<QuotaState>(STATE_KEY);
    return state ? { ...emptyState(), ...state } : emptyState();
  } catch {
    return emptyState();
  }
}

async function saveState(state: QuotaState) {
  try {
    await getStore().set(STATE_KEY, state, 3 * 86400);
  } catch {
    // advisory only
  }
}

export function parseRateLimitHeaders(headers: Headers): RateLimitHeaders {
  const n = (name: string) => {
    const v = headers.get(name);
    if (v === null || v.trim() === "") return null;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    dailyLimit: n("x-ratelimit-requests-limit"),
    dailyRemaining: n("x-ratelimit-requests-remaining"),
    minuteLimit: n("x-ratelimit-limit"),
    minuteRemaining: n("x-ratelimit-remaining"),
  };
}

export async function recordResponse(info: RateLimitHeaders): Promise<void> {
  const state = await getQuotaState();
  const next: QuotaState = {
    ...state,
    day: utcDay(),
    updatedAt: new Date().toISOString(),
    dailyLimit: info.dailyLimit ?? state.dailyLimit,
    dailyRemaining: info.dailyRemaining ?? (state.day === utcDay() ? state.dailyRemaining : null),
    minuteLimit: info.minuteLimit ?? state.minuteLimit,
    minuteRemaining: info.minuteRemaining ?? state.minuteRemaining,
    failures: 0,
    circuitOpenUntil: null,
  };
  if (next.blockedReason === "rate_limited" && (next.blockedUntil ?? 0) <= Date.now()) {
    next.blockedUntil = null;
    next.blockedReason = null;
  }
  await saveState(next);
}

export async function recordFailure(kind: DataErrorKind): Promise<void> {
  const state = await getQuotaState();
  const now = Date.now();
  if (kind === "rate_limited") {
    state.blockedUntil = now + 60_000;
    state.blockedReason = "rate_limited";
  } else if (kind === "quota_exceeded") {
    state.blockedUntil = nextUtcMidnight(now);
    state.blockedReason = "quota_exceeded";
    state.dailyRemaining = 0;
    state.day = utcDay(now);
  } else if (kind === "server" || kind === "network" || kind === "timeout") {
    // Only consecutive failures within a short window count towards opening the circuit.
    const recent = state.lastFailureAt && now - state.lastFailureAt < FAILURE_WINDOW_MS;
    state.failures = (recent ? (state.failures ?? 0) : 0) + 1;
    state.lastFailureAt = now;
    if (state.failures >= FAILURE_THRESHOLD) state.circuitOpenUntil = now + CIRCUIT_OPEN_MS;
  }
  state.updatedAt = new Date(now).toISOString();
  await saveState(state);
}

export type BudgetDecision = { ok: true } | { ok: false; kind: DataErrorKind };

/** Pure decision function (unit-tested). */
export function decideBudget(
  state: QuotaState,
  priority: Priority,
  options: { now: number; reservePercent: number; dailyLimitOverride: number | null },
): BudgetDecision {
  const { now } = options;
  if (state.circuitOpenUntil && state.circuitOpenUntil > now) return { ok: false, kind: "circuit_open" };
  if (state.blockedUntil && state.blockedUntil > now && state.blockedReason) {
    return { ok: false, kind: state.blockedReason };
  }
  const sameDay = state.day === utcDay(now);
  const limit = options.dailyLimitOverride ?? state.dailyLimit;
  const remaining = sameDay ? state.dailyRemaining : null;
  if (remaining === null) return { ok: true };
  if (remaining <= 0) return { ok: false, kind: "quota_exceeded" };
  const reserve = limit ? Math.ceil((limit * options.reservePercent) / 100) : 0;
  if (priority === "high" && remaining <= reserve) return { ok: false, kind: "budget_guard" };
  if (priority === "low" && remaining <= reserve * 2) return { ok: false, kind: "budget_guard" };
  return { ok: true };
}

/**
 * Checks the daily budget, circuit breaker and per-minute window. Reserves a
 * minute slot when allowed.
 */
export async function checkBudget(priority: Priority): Promise<BudgetDecision> {
  const cfg = footballConfig();
  const state = await getQuotaState();
  const now = Date.now();
  const decision = decideBudget(state, priority, {
    now,
    reservePercent: cfg.reservePercent,
    dailyLimitOverride: cfg.dailyLimitOverride,
  });
  if (!decision.ok) return decision;
  const minuteLimit = cfg.minuteLimitOverride ?? state.minuteLimit ?? DEFAULT_MINUTE_LIMIT;
  try {
    const bucket = new Date(now).toISOString().slice(0, 16);
    const used = await getStore().incr(`quota:minute:${bucket}`, 90);
    // Keep one slot per minute free for critical requests.
    const allowed = priority === "critical" ? minuteLimit : Math.max(1, minuteLimit - 1);
    if (used > allowed) return { ok: false, kind: "rate_limited" };
  } catch {
    // If the store fails we still allow the request; the provider enforces limits.
  }
  return { ok: true };
}

/**
 * Freshness multiplier based on the plan's daily quota. With the free plan
 * (100 requests/day) cached data is refreshed ~10x less often.
 */
export function ttlScaleFor(dailyLimit: number | null, override: number | null): number {
  if (override) return override;
  if (!dailyLimit) return 1;
  if (dailyLimit <= 150) return 10;
  if (dailyLimit <= 1500) return 3;
  if (dailyLimit >= 75_000) return 0.5;
  return 1;
}

export async function currentTtlScale(): Promise<number> {
  const cfg = footballConfig();
  if (cfg.ttlScaleOverride) return cfg.ttlScaleOverride;
  const state = await getQuotaState();
  return ttlScaleFor(cfg.dailyLimitOverride ?? state.dailyLimit, null);
}

/** Human-facing flags for the admin dashboard. */
export function quotaFlags(state: QuotaState, now = Date.now()): { circuitOpen: boolean; blocked: boolean } {
  return {
    circuitOpen: state.circuitOpenUntil !== null && state.circuitOpenUntil > now,
    blocked: state.blockedUntil !== null && state.blockedUntil > now,
  };
}
