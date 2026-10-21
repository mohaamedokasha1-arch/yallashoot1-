import { competitionById } from "@/data/competitions";
import { countryNameAr } from "@/data/countries";
import { TEAM_NAMES, TEAM_NAME_RULES, type TeamNameEntry } from "@/data/teams";

const TEAMS_BY_ID = new Map<number, TeamNameEntry>(TEAM_NAMES.map((t) => [t.id, t]));

function loose(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|sc|cf|afc|club|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

function apiNameMatches(apiName: string, expected: readonly string[]): boolean {
  const a = loose(apiName);
  if (!a) return false;
  return expected.some((e) => {
    const b = loose(e);
    return b.length > 0 && (a === b || a.includes(b) || b.includes(a));
  });
}

/**
 * Arabic name for a team, or null when unknown. `country` (the team's or the
 * domestic league's country) enables the pattern rules for unverified clubs.
 */
export function teamNameAr(id: number, apiName: string, country?: string | null): string | null {
  const entry = TEAMS_BY_ID.get(id);
  if (entry) return apiNameMatches(apiName, entry.api) ? entry.ar : null;
  if (country) {
    for (const rule of TEAM_NAME_RULES) {
      if (rule.country === country && rule.pattern.test(apiName)) return rule.ar;
    }
  }
  return null;
}

export function teamAliases(id: number): readonly string[] {
  return TEAMS_BY_ID.get(id)?.aliases ?? [];
}

export function teamEntry(id: number): TeamNameEntry | undefined {
  return TEAMS_BY_ID.get(id);
}

/** Arabic league name, applied only when id and country match the registry. */
export function leagueNameAr(id: number, country: string | null | undefined): string | null {
  const entry = competitionById(id);
  if (!entry) return null;
  if (country && entry.apiCountry !== country) return null;
  return entry.nameAr;
}

export { countryNameAr };

/** Display helpers: Arabic when known, provider name otherwise. */
export function displayName(entity: { name: string; nameAr: string | null }): string {
  return entity.nameAr ?? entity.name;
}
