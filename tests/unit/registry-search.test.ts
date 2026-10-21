import { describe, expect, it } from "vitest";
import { COMPETITIONS, competitionById } from "@/data/competitions";
import { TEAM_NAMES } from "@/data/teams";
import { searchFootball } from "@/lib/football/search";

describe("competition registry", () => {
  it("has unique ids and slugs", () => {
    expect(new Set(COMPETITIONS.map((c) => c.id)).size).toBe(COMPETITIONS.length);
    expect(new Set(COMPETITIONS.map((c) => c.slug)).size).toBe(COMPETITIONS.length);
    expect(new Set(TEAM_NAMES.map((t) => t.id)).size).toBe(TEAM_NAMES.length);
  });

  it("covers the Egyptian and African competitions with Egypt first", () => {
    for (const id of [233, 714, 539, 895, 887]) expect(competitionById(id)?.region).toBe("egypt");
    for (const id of [12, 20]) expect(competitionById(id)?.region).toBe("africa");
    expect(competitionById(233)?.priority).toBe(1);
  });
});

describe("search", () => {
  const cases: Array<[string, number]> = [
    ["الأهلي", 1577],
    ["الاهلي", 1577],
    ["الزمالك", 1040],
    ["بيراميدز", 1036],
    ["الإسماعيلي", 1030],
    ["المصري", 1031],
    ["الاتحاد السكندري", 1035],
    ["سيراميكا كليوباترا", 14651],
    ["Al Ahly", 1577],
    ["zamalek", 1040],
  ];
  it.each(cases)("finds %s", async (query, id) => {
    const res = await searchFootball(query);
    expect(res.teams[0]?.id).toBe(id);
  });

  it("finds Egyptian competitions in Arabic", async () => {
    const res = await searchFootball("الدوري المصري");
    expect(res.leagues[0]?.id).toBe(233);
    const cup = await searchFootball("كأس مصر");
    expect(cup.leagues.map((l) => l.id)).toContain(714);
  });

  it("returns an empty result for nonsense or hostile input", async () => {
    const res = await searchFootball("<script>zzzzqqq</script>");
    expect(res.teams).toHaveLength(0);
    expect(res.query).not.toContain("<");
    expect((await searchFootball("")).teams).toHaveLength(0);
  });
});
