import { COMPETITIONS, REGION_LABELS_AR, REGION_ORDER, type CompetitionEntry, type Region } from "@/data/competitions";
import { TEAM_NAMES } from "@/data/teams";
import { entitySlug } from "@/lib/utils/slug";

export const EGYPT_PREMIER_LEAGUE_ID = 233;

export function competitionPath(c: Pick<CompetitionEntry, "slug" | "id">): string {
  return `/leagues/${c.slug}-${c.id}`;
}

/** Featured competitions grouped by region (Egypt first) for quick links. */
export function featuredCompetitionsByRegion(): Array<{ region: Region; label: string; items: CompetitionEntry[] }> {
  return REGION_ORDER.map((region) => ({
    region,
    label: REGION_LABELS_AR[region],
    items: COMPETITIONS.filter((c) => c.region === region && c.featured).sort((a, b) => a.priority - b.priority),
  })).filter((g) => g.items.length > 0);
}

export interface NotableTeamLink {
  id: number;
  name: string;
  href: string;
  country: string;
  logo: string;
}

/** Notable clubs/national teams from the curated dictionary (Egypt first). */
export function notableTeams(): NotableTeamLink[] {
  return TEAM_NAMES.filter((t) => t.notable && !t.legacy)
    .map((t) => ({
      id: t.id,
      name: t.ar,
      href: `/teams/${entitySlug(t.api[0] ?? String(t.id), t.id)}`,
      country: t.country,
      logo: `https://media.api-sports.io/football/teams/${t.id}.png`,
    }))
    .sort((a, b) => (a.country === "Egypt" ? 0 : 1) - (b.country === "Egypt" ? 0 : 1));
}
