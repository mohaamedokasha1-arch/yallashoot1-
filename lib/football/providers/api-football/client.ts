import "server-only";
import { z } from "zod";
import { footballConfig } from "@/lib/env";
import { recordProviderRequest } from "@/lib/monitoring";
import { parseRateLimitHeaders, recordFailure, recordResponse } from "../../budget";
import { ProviderError } from "../../errors";
import type { DataErrorKind } from "../../types";

/** Endpoints we call (whitelist — nothing else can be requested). */
export type Endpoint =
  | "status"
  | "leagues"
  | "fixtures"
  | "fixtures/headtohead"
  | "standings"
  | "teams"
  | "players"
  | "players/squads"
  | "players/topscorers"
  | "players/seasons";

const ALLOWED_PARAMS = new Set([
  "id", "ids", "date", "from", "to", "league", "season", "team", "live", "timezone",
  "current", "country", "search", "h2h", "last", "next", "player", "status", "round", "type", "code", "page",
]);

const MAX_BODY_CHARS = 20_000_000;

const envelopeSchema = z.object({
  get: z.string().optional(),
  errors: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional(),
  results: z.number().optional(),
  paging: z.object({ current: z.number(), total: z.number() }).partial().optional(),
  response: z.unknown(),
});

export interface ApiResult {
  response: unknown;
  results: number;
  paging: { current: number; total: number } | null;
}

type ParamValue = string | number | boolean | undefined | null;

function sanitizeValue(key: string, value: string): string {
  if (key === "search") {
    return value.replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 40);
  }
  if (key === "timezone") return value.replace(/[^A-Za-z/_-]/g, "");
  return value.replace(/[^A-Za-z0-9_:.,-]/g, "").slice(0, 64);
}

export function buildQuery(params: Record<string, ParamValue>): string {
  const entries: Array<[string, string]> = [];
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null || raw === "") continue;
    if (!ALLOWED_PARAMS.has(key)) throw new ProviderError("invalid_response", `Parameter not allowed: ${key}`);
    const value = sanitizeValue(key, String(raw));
    if (value) entries.push([key, value]);
  }
  entries.sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(entries).toString();
}

function classifyBodyErrors(errors: unknown): { kind: DataErrorKind; message: string } | null {
  if (!errors) return null;
  if (Array.isArray(errors)) {
    return errors.length ? { kind: "invalid_response", message: JSON.stringify(errors).slice(0, 300) } : null;
  }
  if (typeof errors !== "object") return null;
  const record = errors as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return null;
  const message = keys.map((k) => `${k}: ${String(record[k])}`).join("; ").slice(0, 300);
  if ("token" in record || "access" in record) return { kind: "auth", message };
  if ("requests" in record) return { kind: "quota_exceeded", message };
  if ("rateLimit" in record) return { kind: "rate_limited", message };
  if ("plan" in record) return { kind: "plan_restricted", message };
  return { kind: "invalid_response", message };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs a GET request against API-Football with timeout, a single retry
 * for transient failures, error classification and quota bookkeeping.
 */
export async function apiFootballGet(endpoint: Endpoint, params: Record<string, ParamValue> = {}): Promise<ApiResult> {
  const cfg = footballConfig();
  if (!cfg.apiKey) throw new ProviderError("not_configured", "FOOTBALL_API_KEY is not set");
  const query = buildQuery(params);
  const url = `${cfg.baseUrl}/${endpoint}${query ? `?${query}` : ""}`;
  const maxAttempts = 2;
  let lastError: ProviderError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = performance.now();
    let status: number | null = null;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "x-apisports-key": cfg.apiKey },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
      status = res.status;
      const limits = parseRateLimitHeaders(res.headers);

      if (res.status === 429) throw new ProviderError("rate_limited", "HTTP 429", { status });
      if (res.status === 401 || res.status === 403) throw new ProviderError("auth", `HTTP ${res.status}`, { status });
      if (res.status >= 500) throw new ProviderError("server", `HTTP ${res.status}`, { status });
      if (!res.ok) throw new ProviderError("invalid_response", `HTTP ${res.status}`, { status });

      const text = await res.text();
      if (text.length > MAX_BODY_CHARS) throw new ProviderError("invalid_response", "Response too large", { status });
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch (cause) {
        throw new ProviderError("invalid_response", "Response is not JSON", { status, cause });
      }
      const parsed = envelopeSchema.safeParse(json);
      if (!parsed.success) throw new ProviderError("invalid_response", "Unexpected response envelope", { status });
      const bodyError = classifyBodyErrors(parsed.data.errors);
      if (bodyError) throw new ProviderError(bodyError.kind, bodyError.message, { status });
      if (!Array.isArray(parsed.data.response) && typeof parsed.data.response !== "object") {
        throw new ProviderError("invalid_response", "Missing response field", { status });
      }

      await recordResponse(limits);
      const results = parsed.data.results ?? (Array.isArray(parsed.data.response) ? parsed.data.response.length : 0);
      await recordProviderRequest({
        at: new Date().toISOString(),
        endpoint,
        params: query,
        status,
        ok: true,
        ms: Math.round(performance.now() - started),
        dailyRemaining: limits.dailyRemaining,
        minuteRemaining: limits.minuteRemaining,
        results,
      });
      const paging = parsed.data.paging;
      return {
        response: parsed.data.response,
        results,
        paging: paging?.current && paging?.total ? { current: paging.current, total: paging.total } : null,
      };
    } catch (err) {
      const error =
        err instanceof ProviderError
          ? err
          : err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
            ? new ProviderError("timeout", "Request timed out", { cause: err })
            : new ProviderError("network", err instanceof Error ? err.message : "Network error", { cause: err });
      lastError = error;
      await recordProviderRequest({
        at: new Date().toISOString(),
        endpoint,
        params: query,
        status,
        ok: false,
        ms: Math.round(performance.now() - started),
        errorKind: error.kind,
      });
      if (error.retryable && attempt < maxAttempts) {
        await sleep(300 + Math.floor(Math.random() * 500));
        continue;
      }
      await recordFailure(error.kind);
      throw error;
    }
  }
  throw lastError ?? new ProviderError("unknown", "Unknown provider failure");
}
