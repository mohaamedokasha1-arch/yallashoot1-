import "server-only";
import { footballConfig } from "@/lib/env";
import { recordError } from "@/lib/monitoring";
import { getStore } from "@/lib/store";
import { checkBudget, currentTtlScale, type Priority } from "./budget";
import { dataError, ProviderError, toDataError } from "./errors";
import type { DataErrorKind, DataResult } from "./types";

/**
 * Shared resource cache in front of the provider.
 *
 *  1. Fresh copy in the KV store → returned without calling the provider.
 *  2. Otherwise the request is checked against the quota guard, de-duplicated
 *     in-process and across instances (short lock), then fetched.
 *  3. Failures, quota exhaustion and suspicious empty responses fall back to
 *     the last known good copy (flagged `stale`), never to an empty result.
 */

interface CacheEntry<T> {
  v: 1;
  data: T;
  fetchedAt: string;
  freshUntil: number;
  emptyStreak?: number;
  /** Negative cache: the provider refused this resource (plan/not found/auth). */
  negative?: DataErrorKind;
}

/** Errors worth remembering for a while to avoid wasting quota on retries. */
const NEGATIVE_TTL_MS: Partial<Record<DataErrorKind, number>> = {
  plan_restricted: 6 * 3600_000,
  not_found: 3600_000,
  auth: 10 * 60_000,
  invalid_response: 10 * 60_000,
  // Short per-resource back-off for transient failures, so repeated visits to
  // one failing page cannot hammer the provider (or trip the global breaker).
  server: 60_000,
  network: 60_000,
  timeout: 60_000,
};

export interface ResourceOptions<T> {
  key: string;
  /** Freshness in seconds (before plan scaling). May depend on the data. */
  ttl: number | ((data: T) => number);
  priority: Priority;
  fetcher: () => Promise<T>;
  /** How long to keep the last known good copy (seconds). Default 21 days. */
  keepSeconds?: number;
  /** Detects "empty" payloads for the suspicious-empty guard. */
  isEmpty?: (data: T) => boolean;
  /** Merges the previous copy into the new one (e.g. no status regression). */
  merge?: (prev: T | null, next: T) => T;
  /** Bypass freshness (admin retry / cron). Still subject to the quota guard. */
  force?: boolean;
}

const LOCK_SECONDS = 15;
const LOCK_WAIT_MS = 2500;
const EMPTY_ACCEPT_AFTER = 3;
const MIN_TTL_SECONDS = 15;

const inflight = new Map<string, Promise<DataResult<unknown>>>();

function testDataFlag(): boolean {
  return !footballConfig().isOfficial;
}

function ok<T>(entry: CacheEntry<T>, source: DataResult<T>["source"]): DataResult<T> {
  return { data: entry.data, fetchedAt: entry.fetchedAt, stale: false, source, error: null, testData: testDataFlag() };
}

function staleResult<T>(entry: CacheEntry<T>, kind: DataErrorKind): DataResult<T> {
  return {
    data: entry.data,
    fetchedAt: entry.fetchedAt,
    stale: true,
    source: "fallback",
    error: dataError(kind),
    testData: testDataFlag(),
  };
}

function failure<T>(kind: DataErrorKind): DataResult<T> {
  return { data: null, fetchedAt: null, stale: false, source: "none", error: dataError(kind), testData: testDataFlag() };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const entry = await getStore().get<CacheEntry<T>>(`res:${key}`);
    return entry && entry.v === 1 ? entry : null;
  } catch {
    return null;
  }
}

async function writeEntry<T>(key: string, entry: CacheEntry<T>, keepSeconds: number) {
  try {
    await getStore().set(`res:${key}`, entry, keepSeconds);
  } catch (err) {
    await recordError({ source: "store", kind: "write_failed", message: err instanceof Error ? err.message : String(err), key });
  }
}

async function resolveTtl<T>(opts: ResourceOptions<T>, data: T): Promise<number> {
  const base = typeof opts.ttl === "function" ? opts.ttl(data) : opts.ttl;
  const scale = await currentTtlScale();
  return Math.max(MIN_TTL_SECONDS, Math.round(base * scale));
}

async function fetchAndStore<T>(opts: ResourceOptions<T>, previous: CacheEntry<T> | null): Promise<DataResult<T>> {
  const keep = opts.keepSeconds ?? 21 * 86400;
  try {
    const raw = await opts.fetcher();
    const now = Date.now();
    if (previous && opts.isEmpty?.(raw) && !opts.isEmpty(previous.data)) {
      const streak = (previous.emptyStreak ?? 0) + 1;
      if (streak < EMPTY_ACCEPT_AFTER) {
        await writeEntry(opts.key, { ...previous, freshUntil: now + 120_000, emptyStreak: streak }, keep);
        await recordError({ source: "provider", kind: "suspicious_empty", message: `empty response #${streak}`, key: opts.key });
        return staleResult(previous, "suspicious_empty");
      }
    }
    const data = opts.merge ? opts.merge(previous?.data ?? null, raw) : raw;
    const ttl = await resolveTtl(opts, data);
    const entry: CacheEntry<T> = { v: 1, data, fetchedAt: new Date(now).toISOString(), freshUntil: now + ttl * 1000, emptyStreak: 0 };
    await writeEntry(opts.key, entry, keep);
    return ok(entry, "provider");
  } catch (err) {
    const error = toDataError(err);
    if (!(err instanceof ProviderError)) {
      await recordError({ source: "data", kind: "exception", message: err instanceof Error ? err.message : String(err), key: opts.key });
    }
    if (previous) {
      // Back off briefly so every render doesn't retry a failing endpoint.
      const backoff = error.kind === "not_found" || error.kind === "plan_restricted" ? 600_000 : 60_000;
      await writeEntry(opts.key, { ...previous, freshUntil: Date.now() + backoff }, keep);
      return staleResult(previous, error.kind);
    }
    const negativeTtl = NEGATIVE_TTL_MS[error.kind];
    if (negativeTtl) {
      await writeEntry(
        opts.key,
        { v: 1, data: null, fetchedAt: new Date().toISOString(), freshUntil: Date.now() + negativeTtl, negative: error.kind },
        Math.ceil(negativeTtl / 1000) + 60,
      );
    }
    return failure(error.kind);
  }
}

export async function getResource<T>(opts: ResourceOptions<T>): Promise<DataResult<T>> {
  const cfg = footballConfig();
  const stored = await readEntry<T>(opts.key);
  if (stored?.negative) {
    if (!opts.force && Date.now() < stored.freshUntil) return failure(stored.negative);
  }
  const previous = stored && !stored.negative ? stored : null;
  if (previous && !opts.force && Date.now() < previous.freshUntil) return ok(previous, "cache");

  if (!cfg.apiKey) {
    return previous ? staleResult(previous, "not_configured") : failure("not_configured");
  }

  const budget = await checkBudget(opts.priority);
  if (!budget.ok) return previous ? staleResult(previous, budget.kind) : failure(budget.kind);

  const running = inflight.get(opts.key) as Promise<DataResult<T>> | undefined;
  if (running) return running;

  const task = (async (): Promise<DataResult<T>> => {
    const store = getStore();
    const lockKey = `lock:${opts.key}`;
    let locked = true;
    try {
      locked = await store.setIfAbsent(lockKey, 1, LOCK_SECONDS);
    } catch {
      locked = true; // store unavailable: proceed without a distributed lock
    }
    if (!locked) {
      // Another instance is refreshing this resource; wait briefly for it.
      const deadline = Date.now() + LOCK_WAIT_MS;
      while (Date.now() < deadline) {
        await sleep(250);
        const entry = await readEntry<T>(opts.key);
        if (entry && entry.freshUntil > Date.now()) return ok(entry, "cache");
      }
      if (previous) return ok(previous, "cache");
    }
    try {
      return await fetchAndStore(opts, previous);
    } finally {
      if (locked) {
        try {
          await store.del(lockKey);
        } catch {
          // lock expires on its own
        }
      }
    }
  })();

  inflight.set(opts.key, task as Promise<DataResult<unknown>>);
  try {
    return await task;
  } finally {
    inflight.delete(opts.key);
  }
}

/** Reads the stored copy without ever calling the provider. */
export async function peekResource<T>(key: string): Promise<{ data: T; fetchedAt: string } | null> {
  const entry = await readEntry<T>(key);
  return entry && !entry.negative ? { data: entry.data, fetchedAt: entry.fetchedAt } : null;
}

/** Marks a cached resource as expired so the next read refreshes it. */
export async function expireResource(key: string): Promise<void> {
  const entry = await readEntry(key);
  if (entry) await writeEntry(key, { ...entry, freshUntil: 0 }, 21 * 86400);
}

export function emptyResult<T>(kind: DataErrorKind): DataResult<T> {
  return failure(kind);
}
