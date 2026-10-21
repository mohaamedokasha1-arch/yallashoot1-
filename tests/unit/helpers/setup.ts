import { afterEach, beforeEach } from "vitest";
import { setProviderForTests } from "@/lib/football/providers";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";

const ENV_KEYS = [
  "FOOTBALL_API_KEY",
  "FOOTBALL_API_BASE_URL",
  "FOOTBALL_API_DAILY_LIMIT",
  "FOOTBALL_API_MINUTE_LIMIT",
  "FOOTBALL_TTL_SCALE",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD_HASH",
  "ADMIN_SESSION_SECRET",
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  // Every test gets a fresh in-memory store and the real provider by default.
  setStoreForTests(new MemoryStore());
  setProviderForTests(undefined);
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  setStoreForTests(undefined);
  setProviderForTests(undefined);
});
