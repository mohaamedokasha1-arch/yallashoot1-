import { buildStatus } from "@/lib/football/status";
import type { Match, StatusCode } from "@/lib/football/types";
import { cairoDateString } from "@/lib/utils/dates";

let seq = 1;

export function makeMatch(overrides: Partial<Match> & { code?: StatusCode; elapsed?: number | null; kickoffMs?: number } = {}): Match {
  const { code = "NS", elapsed = null, kickoffMs = Date.UTC(2026, 9, 21, 17, 0), ...rest } = overrides;
  const id = rest.id ?? seq++;
  const status = buildStatus(code, elapsed, null, null);
  const played = status.group === "live" || status.group === "finished";
  return {
    id,
    provider: "api-football",
    slug: `home-vs-away-${id}`,
    kickoff: new Date(kickoffMs).toISOString(),
    timestamp: Math.floor(kickoffMs / 1000),
    cairoDate: cairoDateString(kickoffMs),
    status,
    league: {
      id: 233,
      name: "Premier League",
      nameAr: "الدوري المصري الممتاز",
      country: "Egypt",
      countryAr: "مصر",
      logo: null,
      flag: null,
      season: 2026,
      round: "Regular Season - 10",
      slug: "egyptian-premier-league-233",
    },
    home: { id: 1577, name: "Al Ahly", nameAr: "الأهلي", logo: null, slug: "al-ahly-1577" },
    away: { id: 1040, name: "Zamalek SC", nameAr: "الزمالك", logo: null, slug: "zamalek-sc-1040" },
    goals: played ? { home: 2, away: 1 } : { home: null, away: null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
    winner: null,
    venue: null,
    referee: null,
    ...rest,
  };
}
