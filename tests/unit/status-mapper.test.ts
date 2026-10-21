import { describe, expect, it } from "vitest";
import { mapFixture, mapLeague, mapStandings } from "@/lib/football/providers/api-football/mapper";
import { hasScore, isFinalStatus, liveMinute, statusRank } from "@/lib/football/status";
import { makeMatch } from "./helpers/factories";

/** Shape copied from a real API-Football /fixtures response (trimmed). */
function rawFixture(overrides: Record<string, unknown> = {}) {
  return {
    fixture: {
      id: 1331228,
      referee: "B. Amiconi",
      timezone: "UTC",
      date: "2026-10-21T21:30:00+00:00",
      timestamp: Date.UTC(2026, 9, 21, 21, 30) / 1000,
      venue: { id: 55, name: "Cairo International Stadium", city: "Cairo" },
      status: { long: "Not Started", short: "NS", elapsed: null, extra: null },
    },
    league: { id: 233, name: "Premier League", country: "Egypt", logo: "https://media.api-sports.io/football/leagues/233.png", flag: null, season: 2026, round: "Regular Season - 10" },
    teams: {
      home: { id: 1577, name: "Al Ahly", logo: "https://media.api-sports.io/football/teams/1577.png", winner: null },
      away: { id: 1040, name: "Zamalek SC", logo: "https://media.api-sports.io/football/teams/1040.png", winner: null },
    },
    goals: { home: 0, away: 0 },
    score: { halftime: { home: 0, away: 0 }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
    ...overrides,
  };
}

describe("status helpers", () => {
  it("never shows a score for a match that has not started", () => {
    const m = makeMatch({ code: "NS", goals: { home: 0, away: 0 } });
    expect(hasScore(m)).toBe(false);
    expect(hasScore(makeMatch({ code: "FT" }))).toBe(true);
    expect(hasScore(makeMatch({ code: "PST", goals: { home: 0, away: 0 } }))).toBe(false);
  });

  it("formats live minutes and ranks progress", () => {
    expect(liveMinute(makeMatch({ code: "2H", elapsed: 67 }).status)).toBe("67'");
    expect(liveMinute(makeMatch({ code: "HT", elapsed: 45 }).status)).toBe("استراحة");
    expect(statusRank("NS")).toBeLessThan(statusRank("1H"));
    expect(statusRank("2H")).toBeLessThan(statusRank("FT"));
    expect(isFinalStatus("PEN")).toBe(true);
    expect(isFinalStatus("PST")).toBe(false);
  });
});

describe("API-Football mapper", () => {
  it("keeps home/away exactly as provided and forces null goals before kick-off", () => {
    const m = mapFixture(rawFixture());
    expect(m).not.toBeNull();
    expect(m!.home.id).toBe(1577);
    expect(m!.away.id).toBe(1040);
    expect(m!.goals).toEqual({ home: null, away: null });
    expect(m!.home.nameAr).toBe("الأهلي");
    expect(m!.away.nameAr).toBe("الزمالك");
    expect(m!.league.slug).toBe("egyptian-premier-league-233");
    // 21:30 UTC is 00:30 the next day in Cairo
    expect(m!.cairoDate).toBe("2026-10-22");
    expect(m!.slug).toBe("al-ahly-vs-zamalek-sc-1331228");
  });

  it("maps finished scores and winners, including penalty shoot-outs", () => {
    const ft = mapFixture(
      rawFixture({
        fixture: { ...rawFixture().fixture, status: { long: "Match Finished", short: "FT", elapsed: 90, extra: 4 } },
        goals: { home: 1, away: 3 },
        teams: { home: { id: 1577, name: "Al Ahly", logo: null, winner: false }, away: { id: 1040, name: "Zamalek SC", logo: null, winner: true } },
      }),
    );
    expect(ft!.goals).toEqual({ home: 1, away: 3 });
    expect(ft!.winner).toBe("away");

    const pen = mapFixture(
      rawFixture({
        fixture: { ...rawFixture().fixture, status: { long: "Match Finished", short: "PEN", elapsed: 120, extra: null } },
        goals: { home: 2, away: 2 },
        teams: { home: { id: 1577, name: "Al Ahly", logo: null, winner: null }, away: { id: 1040, name: "Zamalek SC", logo: null, winner: null } },
        score: { halftime: { home: 1, away: 1 }, fulltime: { home: 2, away: 2 }, extratime: { home: 0, away: 0 }, penalty: { home: 4, away: 3 } },
      }),
    );
    expect(pen!.winner).toBe("home");
    expect(pen!.score.penalty).toEqual({ home: 4, away: 3 });
  });

  it("does not guess Arabic names when the provider name does not match the id", () => {
    const m = mapFixture(rawFixture({ teams: { home: { id: 1577, name: "Totally Different FC", logo: null }, away: { id: 1040, name: "Zamalek SC", logo: null } } }));
    expect(m!.home.nameAr).toBeNull();
  });

  it("drops records without essential fields", () => {
    expect(mapFixture({})).toBeNull();
    expect(mapFixture(rawFixture({ teams: { home: { id: 1577, name: "Al Ahly" }, away: { id: null, name: "X" } } }))).toBeNull();
    expect(mapFixture(rawFixture({ teams: { home: { id: 5, name: "A" }, away: { id: 5, name: "A" } } }))).toBeNull();
  });

  it("maps standings and leagues", () => {
    const standings = mapStandings([
      {
        league: {
          id: 233, name: "Premier League", country: "Egypt", logo: null, flag: null, season: 2026,
          standings: [[
            { rank: 2, team: { id: 1040, name: "Zamalek SC", logo: null }, points: 18, goalsDiff: 5, group: "Premier League", form: "WWDLW", description: null, all: { played: 9, win: 5, draw: 3, lose: 1, goals: { for: 14, against: 9 } } },
            { rank: 1, team: { id: 1577, name: "Al Ahly", logo: null }, points: 24, goalsDiff: 12, group: "Premier League", form: "WWWWL", description: "Promotion - CAF Champions League", all: { played: 10, win: 8, draw: 0, lose: 2, goals: { for: 20, against: 8 } } },
          ]],
        },
      },
    ]);
    expect(standings!.groups[0]!.rows.map((r) => r.team.id)).toEqual([1577, 1040]);
    expect(standings!.groups[0]!.rows[0]!.team.nameAr).toBe("الأهلي");

    const league = mapLeague({
      league: { id: 233, name: "Premier League", type: "League", logo: null },
      country: { name: "Egypt", code: "EG", flag: null },
      seasons: [
        { year: 2025, start: "2025-08-01", end: "2026-05-31", current: false, coverage: {} },
        { year: 2026, start: "2026-08-01", end: "2027-05-31", current: true, coverage: { standings: true, fixtures: { events: true } } },
      ],
    });
    expect(league!.nameAr).toBe("الدوري المصري الممتاز");
    expect(league!.seasons[0]!.year).toBe(2026);
    expect(league!.seasons[0]!.coverage.standings).toBe(true);
  });
});
