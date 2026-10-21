import "server-only";
import { footballConfig } from "@/lib/env";
import { apiFootballProvider } from "./api-football";
import type { FootballProvider } from "./types";

export type { FootballProvider, ProviderAccountStatus } from "./types";

const globalForProvider = globalThis as unknown as { __ysProviderOverride?: FootballProvider };

/** Returns the configured provider (FOOTBALL_API_PROVIDER, default api-football). */
export function getProvider(): FootballProvider {
  if (globalForProvider.__ysProviderOverride) return globalForProvider.__ysProviderOverride;
  const cfg = footballConfig();
  switch (cfg.provider) {
    case "api-football":
    default:
      return apiFootballProvider;
  }
}

/** Test hook: inject a fake provider (pass undefined to reset). */
export function setProviderForTests(provider: FootballProvider | undefined) {
  globalForProvider.__ysProviderOverride = provider;
}
