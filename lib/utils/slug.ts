/**
 * Stable, ASCII-only URL slugs. Entity URLs always end with the provider id,
 * e.g. `/teams/al-ahly-1577`, `/matches/al-ahly-vs-zamalek-sc-1234567`.
 * The id is the source of truth; the text part only exists for readability,
 * and pages redirect to the canonical text when it differs.
 */

const MAX_TEXT_LENGTH = 80;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TEXT_LENGTH)
    .replace(/-+$/g, "");
}

export function entitySlug(name: string | null | undefined, id: number): string {
  const text = slugify(name ?? "");
  return text ? `${text}-${id}` : String(id);
}

export function matchSlug(homeName: string, awayName: string, id: number): string {
  const home = slugify(homeName) || "home";
  const away = slugify(awayName) || "away";
  return `${home}-vs-${away}-${id}`;
}

const ENTITY_SLUG_RE = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*-)?(\d{1,10})$/;

/** Returns the numeric id at the end of an entity slug, or null when malformed. */
export function parseEntitySlug(slug: string | undefined | null): number | null {
  if (!slug || slug.length > 200) return null;
  const decoded = safeDecode(slug).toLowerCase();
  const m = ENTITY_SLUG_RE.exec(decoded);
  if (!m) return null;
  const id = Number(m[1]);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2_147_483_647) return null;
  return id;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Valid season segment (a 4-digit start year). */
export function parseSeason(value: string | undefined | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 1990 && year <= 2100 ? year : null;
}
