import "server-only";

/**
 * Server-side configuration. Secrets are only ever read here (never exposed
 * through NEXT_PUBLIC_* variables or passed to Client Components).
 */

const OFFICIAL_API_FOOTBALL_HOST = "v3.football.api-sports.io";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function str(name: string): string | null {
  const value = process.env[name];
  if (value === undefined) return null;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  return trimmed.length ? trimmed : null;
}

function num(name: string): number | null {
  const value = str(name);
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** Public canonical origin of the site, without trailing slash. */
export function siteUrl(): string {
  const explicit = str("NEXT_PUBLIC_SITE_URL");
  if (explicit) {
    const normalized = normalizeUrl(explicit);
    if (normalized) return normalized;
  }
  const production = str("VERCEL_PROJECT_PRODUCTION_URL");
  if (production) return `https://${production}`;
  const deployment = str("VERCEL_URL");
  if (deployment) return `https://${deployment}`;
  return `http://localhost:${str("PORT") ?? "3000"}`;
}

export interface FootballConfig {
  provider: "api-football";
  apiKey: string | null;
  baseUrl: string;
  /** False when pointing at a mock/test server: pages then show a test banner. */
  isOfficial: boolean;
  /** Base URL problems (invalid or insecure) — reported in the admin panel. */
  baseUrlError: string | null;
  timeoutMs: number;
  dailyLimitOverride: number | null;
  minuteLimitOverride: number | null;
  reservePercent: number;
  ttlScaleOverride: number | null;
}

export function footballConfig(): FootballConfig {
  const rawBase = str("FOOTBALL_API_BASE_URL") ?? `https://${OFFICIAL_API_FOOTBALL_HOST}`;
  let baseUrl = `https://${OFFICIAL_API_FOOTBALL_HOST}`;
  let baseUrlError: string | null = null;
  let isOfficial = true;
  const normalized = normalizeUrl(rawBase);
  if (!normalized) {
    baseUrlError = "FOOTBALL_API_BASE_URL is not a valid URL; using the official endpoint.";
  } else {
    const url = new URL(normalized);
    if (url.protocol === "http:" && !LOCAL_HOSTS.has(url.hostname)) {
      baseUrlError = "FOOTBALL_API_BASE_URL must use HTTPS (HTTP is only allowed for localhost test servers).";
    } else {
      baseUrl = normalized;
      isOfficial = url.hostname === OFFICIAL_API_FOOTBALL_HOST;
    }
  }
  const timeout = num("FOOTBALL_API_TIMEOUT_MS");
  const reserve = num("FOOTBALL_API_RESERVE_PERCENT");
  const scale = num("FOOTBALL_TTL_SCALE");
  return {
    provider: "api-football",
    apiKey: str("FOOTBALL_API_KEY"),
    baseUrl,
    isOfficial,
    baseUrlError,
    timeoutMs: timeout && timeout >= 1000 && timeout <= 30000 ? timeout : 8000,
    dailyLimitOverride: num("FOOTBALL_API_DAILY_LIMIT"),
    minuteLimitOverride: num("FOOTBALL_API_MINUTE_LIMIT"),
    reservePercent: reserve !== null && reserve <= 50 ? reserve : 10,
    ttlScaleOverride: scale && scale >= 0.1 && scale <= 50 ? scale : null,
  };
}

export function redisConfig(): { url: string; token: string } | null {
  const url = str("UPSTASH_REDIS_REST_URL") ?? str("KV_REST_API_URL");
  const token = str("UPSTASH_REDIS_REST_TOKEN") ?? str("KV_REST_API_TOKEN");
  if (!url || !token) return null;
  const normalized = normalizeUrl(url);
  return normalized ? { url: normalized, token } : null;
}

export interface AdminAccount {
  username: string;
  passwordHash: string;
  role: "admin" | "editor";
}

export interface AdminConfig {
  enabled: boolean;
  accounts: AdminAccount[];
  sessionSecret: string | null;
  problems: string[];
}

export function adminConfig(): AdminConfig {
  const problems: string[] = [];
  const username = str("ADMIN_USERNAME");
  const passwordHash = str("ADMIN_PASSWORD_HASH");
  const sessionSecret = str("ADMIN_SESSION_SECRET");
  if (!username) problems.push("ADMIN_USERNAME غير مضبوط");
  if (!passwordHash) problems.push("ADMIN_PASSWORD_HASH غير مضبوط");
  else if (!passwordHash.startsWith("scrypt$")) problems.push("ADMIN_PASSWORD_HASH بصيغة غير صحيحة (استخدم npm run admin:hash)");
  if (!sessionSecret) problems.push("ADMIN_SESSION_SECRET غير مضبوط");
  else if (sessionSecret.length < 32) problems.push("ADMIN_SESSION_SECRET يجب ألا يقل عن 32 حرفًا");

  const accounts: AdminAccount[] = [];
  if (username && passwordHash?.startsWith("scrypt$")) accounts.push({ username, passwordHash, role: "admin" });
  const editorUser = str("EDITOR_USERNAME");
  const editorHash = str("EDITOR_PASSWORD_HASH");
  if (editorUser && editorHash?.startsWith("scrypt$") && editorUser !== username) {
    accounts.push({ username: editorUser, passwordHash: editorHash, role: "editor" });
  }
  return {
    enabled: problems.length === 0 && accounts.length > 0,
    accounts,
    sessionSecret: sessionSecret && sessionSecret.length >= 32 ? sessionSecret : null,
    problems,
  };
}

export function cronSecret(): string | null {
  const secret = str("CRON_SECRET");
  return secret && secret.length >= 16 ? secret : null;
}

export function newsAllowedHosts(): string[] {
  return (str("NEWS_FEED_ALLOWED_HOSTS") ?? "")
    .split(/[\s,]+/)
    .map((h) => h.trim().toLowerCase())
    .filter((h) => /^[a-z0-9.-]+$/.test(h));
}

export function contactEmail(): string | null {
  const email = str("SITE_CONTACT_EMAIL");
  return email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
