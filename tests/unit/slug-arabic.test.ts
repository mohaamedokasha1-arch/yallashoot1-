import { describe, expect, it } from "vitest";
import { compactKey, isArabic, matchScore, normalizeText, searchTokens } from "@/lib/utils/arabic";
import { entitySlug, matchSlug, parseEntitySlug, parseSeason, slugify } from "@/lib/utils/slug";

describe("slugs", () => {
  it("builds stable ASCII slugs ending with the provider id", () => {
    expect(slugify("Atlético Madrid")).toBe("atletico-madrid");
    expect(entitySlug("Al Ahly", 1577)).toBe("al-ahly-1577");
    expect(entitySlug("الأهلي", 1577)).toBe("1577");
    expect(matchSlug("Al Ahly", "Zamalek SC", 123)).toBe("al-ahly-vs-zamalek-sc-123");
  });

  it("parses ids and rejects malformed or hostile input", () => {
    expect(parseEntitySlug("al-ahly-1577")).toBe(1577);
    expect(parseEntitySlug("1577")).toBe(1577);
    expect(parseEntitySlug("al-ahly")).toBeNull();
    expect(parseEntitySlug("..%2F..%2Fetc-1")).toBeNull();
    expect(parseEntitySlug("<script>-1")).toBeNull();
    expect(parseEntitySlug("a-0")).toBeNull();
    expect(parseEntitySlug("a-99999999999")).toBeNull();
    expect(parseSeason("2026")).toBe(2026);
    expect(parseSeason("26")).toBeNull();
    expect(parseSeason("0000")).toBeNull();
  });
});

describe("Arabic search normalisation", () => {
  it("normalises hamza, taa marbuta, alef maqsura, diacritics and tatweel", () => {
    expect(normalizeText("الأهلي")).toBe(normalizeText("الاهلي"));
    expect(normalizeText("الإسماعيلي")).toBe(normalizeText("الاسماعيلى"));
    expect(normalizeText("مُبَارَاة")).toBe(normalizeText("مباراه"));
    expect(normalizeText("الزمـــالك")).toBe(normalizeText("الزمالك"));
    expect(isArabic("الأهلي")).toBe(true);
    expect(isArabic("Al Ahly")).toBe(false);
    expect(compactKey("Al-Ahly SC")).toBe(compactKey("al ahly sc"));
    expect(searchTokens("  الأهلي   المصري ").length).toBeGreaterThan(0);
  });

  it("scores Arabic and English variants and tolerates small typos", () => {
    expect(matchScore("الاهلي", ["الأهلي"])).toBeGreaterThan(80);
    expect(matchScore("zamalek", ["Zamalek SC"])).toBeGreaterThan(50);
    expect(matchScore("الزملك", ["الزمالك"])).toBeGreaterThan(0);
    expect(matchScore("برشلونة", ["الأهلي"])).toBe(0);
  });
});
