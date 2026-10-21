import "server-only";
import { getStore } from "@/lib/store";

/**
 * Lightweight request/error monitoring stored in the KV store and shown in the
 * admin panel. Never stores secrets (API keys, cookies, passwords).
 * All functions swallow their own errors: monitoring must never break pages.
 */

export interface RequestLogEntry {
  at: string;
  endpoint: string;
  params: string;
  status: number | null;
  ok: boolean;
  ms: number;
  errorKind?: string;
  /** Provider-side detail for failures (e.g. "HTTP 401"). Never contains secrets. */
  errorDetail?: string;
  dailyRemaining?: number | null;
  minuteRemaining?: number | null;
  results?: number | null;
}

export interface ErrorLogEntry {
  at: string;
  source: string;
  kind: string;
  message: string;
  key?: string;
}

export interface CronRunEntry {
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  tasks: Array<{ name: string; ok: boolean; detail: string }>;
}

const REQUESTS_KEY = "mon:requests";
const ERRORS_KEY = "mon:errors";
const LAST_SUCCESS_KEY = "mon:last-success";
const LAST_ERROR_KEY = "mon:last-error";
const CRON_KEY = "mon:cron";

function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function recordProviderRequest(entry: RequestLogEntry): Promise<void> {
  try {
    const store = getStore();
    const day = utcDay();
    await Promise.all([
      store.pushCapped(REQUESTS_KEY, entry, 200),
      store.incr(`mon:count:${day}:${entry.ok ? "ok" : "error"}`, 8 * 86400),
      entry.ok
        ? store.set(LAST_SUCCESS_KEY, { at: entry.at, endpoint: entry.endpoint })
        : store.set(LAST_ERROR_KEY, {
            at: entry.at,
            endpoint: entry.endpoint,
            kind: entry.errorKind ?? "unknown",
            detail: entry.errorDetail ?? null,
          }),
    ]);
  } catch (err) {
    console.warn("[monitoring] failed to record request", err instanceof Error ? err.message : err);
  }
}

export async function recordError(entry: Omit<ErrorLogEntry, "at">): Promise<void> {
  try {
    await getStore().pushCapped(ERRORS_KEY, { ...entry, at: new Date().toISOString() }, 100);
  } catch {
    // ignore
  }
}

export async function recordCronRun(entry: CronRunEntry): Promise<void> {
  try {
    const store = getStore();
    await Promise.all([store.set(CRON_KEY, entry), store.pushCapped(`${CRON_KEY}:history`, entry, 30)]);
  } catch {
    // ignore
  }
}

export async function clearErrorLog(): Promise<void> {
  try {
    await getStore().del(ERRORS_KEY);
  } catch {
    // ignore
  }
}

export interface MonitoringSnapshot {
  requests: RequestLogEntry[];
  errors: ErrorLogEntry[];
  lastSuccess: { at: string; endpoint: string } | null;
  lastError: { at: string; endpoint: string; kind: string; detail?: string | null } | null;
  lastCron: CronRunEntry | null;
  cronHistory: CronRunEntry[];
  dailyCounts: Array<{ day: string; ok: number; error: number }>;
}

export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const store = getStore();
  const days = Array.from({ length: 7 }, (_, i) => utcDay(new Date(Date.now() - i * 86400_000)));
  try {
    const [requests, errors, lastSuccess, lastError, lastCron, cronHistory, ...counts] = await Promise.all([
      store.list<RequestLogEntry>(REQUESTS_KEY, 60),
      store.list<ErrorLogEntry>(ERRORS_KEY, 60),
      store.get<{ at: string; endpoint: string }>(LAST_SUCCESS_KEY),
      store.get<{ at: string; endpoint: string; kind: string; detail?: string | null }>(LAST_ERROR_KEY),
      store.get<CronRunEntry>(CRON_KEY),
      store.list<CronRunEntry>(`${CRON_KEY}:history`, 10),
      ...days.flatMap((day) => [
        store.get<number>(`mon:count:${day}:ok`),
        store.get<number>(`mon:count:${day}:error`),
      ]),
    ]);
    return {
      requests,
      errors,
      lastSuccess,
      lastError,
      lastCron,
      cronHistory,
      dailyCounts: days.map((day, i) => ({
        day,
        ok: Number(counts[i * 2] ?? 0) || 0,
        error: Number(counts[i * 2 + 1] ?? 0) || 0,
      })),
    };
  } catch {
    return { requests: [], errors: [], lastSuccess: null, lastError: null, lastCron: null, cronHistory: [], dailyCounts: [] };
  }
}
