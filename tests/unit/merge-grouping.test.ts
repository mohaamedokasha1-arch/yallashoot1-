import { describe, expect, it } from "vitest";
import { groupByLeague, groupByRegion, isEgyptianMatch } from "@/lib/football/grouping";
import { dedupeMatches, mergeMatchLists, mergeMatchUpdate, normalizeDayFixtures } from "@/lib/football/merge";
import { makeMatch } from "./helpers/factories";

describe("de-duplication and integrity", () => {
  it("keeps one copy per fixture id, preferring the most progressed state", () => {
    const stale = makeMatch({ id: 10, code: "NS" });
    const finished = makeMatch({ id: 10, code: "FT" });
    expect(dedupeMatches([finished, stale])).toEqual([finished]);
    expect(dedupeMatches([stale, finished])).toEqual([finished]);
  });

  it("merges duplicates coming from different ids for the same teams and day", () => {
    const a = makeMatch({ id: 11, code: "NS" });
    const b = makeMatch({ id: 12, code: "1H", elapsed: 10 });
    expect(dedupeMatches([a, b]).map((m) => m.id)).toEqual([12]);
  });

  it("never regresses a finished match to an earlier state", () => {
    const ft = makeMatch({ id: 20, code: "FT", goals: { home: 2, away: 1 } });
    const staleLive = makeMatch({ id: 20, code: "2H", elapsed: 80, goals: { home: 1, away: 1 } });
    const staleNs = makeMatch({ id: 20, code: "NS" });
    expect(mergeMatchUpdate(ft, staleLive)).toBe(ft);
    expect(mergeMatchUpdate(ft, staleNs)).toBe(ft);
  });

  it("accepts score corrections at the same status and normal progress", () => {
    const ft = makeMatch({ id: 21, code: "FT", goals: { home: 2, away: 1 } });
    const corrected = makeMatch({ id: 21, code: "FT", goals: { home: 1, away: 1 } });
    expect(mergeMatchUpdate(ft, corrected)).toBe(corrected);
    const live = makeMatch({ id: 22, code: "1H", elapsed: 30 });
    const later = makeMatch({ id: 22, code: "2H", elapsed: 50 });
    expect(mergeMatchUpdate(live, later)).toBe(later);
    const earlier = makeMatch({ id: 22, code: "1H", elapsed: 20 });
    expect(mergeMatchUpdate(live, earlier)).toBe(live);
  });

  it("merges lists without swapping home/away or scores", () => {
    const prev = [makeMatch({ id: 30, code: "FT", goals: { home: 3, away: 0 } })];
    const next = [makeMatch({ id: 30, code: "NS" }), makeMatch({ id: 31, code: "NS" })];
    const merged = mergeMatchLists(prev, next);
    const m30 = merged.find((m) => m.id === 30)!;
    expect(m30.status.code).toBe("FT");
    expect(m30.goals).toEqual({ home: 3, away: 0 });
    expect(m30.home.id).toBe(1577);
  });

  it("keeps only fixtures of the requested Cairo day, sorted by kick-off", () => {
    const late = makeMatch({ id: 40, kickoffMs: Date.UTC(2026, 9, 21, 20, 30) }); // 23:30 Cairo, 21st
    const afterMidnight = makeMatch({ id: 41, kickoffMs: Date.UTC(2026, 9, 21, 21, 30), away: { id: 1036, name: "Pyramids FC", nameAr: "بيراميدز", logo: null, slug: "p-1036" } }); // 00:30 Cairo, 22nd
    const early = makeMatch({ id: 42, kickoffMs: Date.UTC(2026, 9, 21, 9, 0), away: { id: 1030, name: "Ismaily SC", nameAr: "الإسماعيلي", logo: null, slug: "i-1030" } });
    const day = normalizeDayFixtures([late, afterMidnight, early], "2026-10-21");
    expect(day.map((m) => m.id)).toEqual([42, 40]);
    expect(normalizeDayFixtures([late, afterMidnight], "2026-10-22").map((m) => m.id)).toEqual([41]);
  });
});

describe("grouping", () => {
  it("puts Egyptian football first, including Egypt national team matches", () => {
    const egyptLeague = makeMatch({ id: 50 });
    const england = makeMatch({
      id: 51,
      league: { ...makeMatch().league, id: 39, name: "Premier League", nameAr: "الدوري الإنجليزي الممتاز", country: "England", slug: "premier-league-39" },
      home: { id: 42, name: "Arsenal", nameAr: null, logo: null, slug: "arsenal-42" },
      away: { id: 49, name: "Chelsea", nameAr: null, logo: null, slug: "chelsea-49" },
    });
    const egyptNational = makeMatch({
      id: 52,
      league: { ...makeMatch().league, id: 29, name: "World Cup - Qualification Africa", nameAr: null, country: "World", slug: "wcq-29" },
      home: { id: 32, name: "Egypt", nameAr: "منتخب مصر", logo: null, slug: "egypt-32" },
      away: { id: 1500, name: "Ghana", nameAr: null, logo: null, slug: "ghana-1500" },
    });
    expect(isEgyptianMatch(egyptNational)).toBe(true);
    const regions = groupByRegion([england, egyptLeague, egyptNational]);
    expect(regions[0]!.region).toBe("egypt");
    expect(regions[0]!.count).toBe(2);
    expect(regions[1]!.region).toBe("england");
    const leagues = groupByLeague([england, egyptLeague]);
    expect(leagues[0]!.league.id).toBe(233);
  });
});
