import { isFinalStatus, statusRank } from "./status";
import type { Match } from "./types";

/**
 * Data-integrity helpers applied to every provider response before it is
 * stored or rendered:
 *  - de-duplication by provider id (and by date + teams as a safety net),
 *  - no regression of a finished/progressed match to an earlier state,
 *  - Cairo-day filtering and stable ordering.
 */

function progress(m: Match): number {
  return statusRank(m.status.code) * 1000 + (m.status.elapsed ?? 0) * 10 + (m.status.extra ?? 0);
}

/** Of two copies of the same fixture, returns the one that should win. */
export function pickNewer(a: Match, b: Match): Match {
  return progress(b) >= progress(a) ? b : a;
}

export function dedupeMatches(matches: readonly Match[]): Match[] {
  const byId = new Map<number, Match>();
  for (const m of matches) {
    const prev = byId.get(m.id);
    byId.set(m.id, prev ? pickNewer(prev, m) : m);
  }
  const byFixtureKey = new Map<string, Match>();
  for (const m of byId.values()) {
    const key = `${m.cairoDate}|${m.home.id}|${m.away.id}`;
    const prev = byFixtureKey.get(key);
    byFixtureKey.set(key, prev ? pickNewer(prev, m) : m);
  }
  return [...byFixtureKey.values()];
}

/**
 * Merges a fresh copy of a fixture with the previously stored one.
 * A match that already progressed (e.g. finished) is never moved back to an
 * earlier state by a stale upstream copy. Equal-rank updates (e.g. a score
 * correction after a disallowed goal) are accepted.
 */
export function mergeMatchUpdate<T extends Match>(prev: T | null | undefined, next: T): T {
  if (!prev || prev.id !== next.id) return next;
  const prevRank = statusRank(prev.status.code);
  const nextRank = statusRank(next.status.code);
  if (isFinalStatus(prev.status.code) && !isFinalStatus(next.status.code)) return prev;
  if (nextRank < prevRank && prev.status.group === "live") return prev;
  if (
    prev.status.group === "live" &&
    next.status.group === "live" &&
    nextRank === prevRank &&
    (next.status.elapsed ?? 0) < (prev.status.elapsed ?? 0)
  ) {
    return prev;
  }
  return next;
}

export function mergeMatchLists(prev: readonly Match[] | null | undefined, next: readonly Match[]): Match[] {
  const prevById = new Map((prev ?? []).map((m) => [m.id, m]));
  return dedupeMatches(next.map((m) => mergeMatchUpdate(prevById.get(m.id), m)));
}

export function filterByCairoDate(matches: readonly Match[], date: string): Match[] {
  return matches.filter((m) => m.cairoDate === date);
}

export function sortByKickoff(matches: readonly Match[]): Match[] {
  return [...matches].sort((a, b) => a.timestamp - b.timestamp || a.league.id - b.league.id || a.id - b.id);
}

/** Normalises a provider list for a Cairo day: filter, dedupe, sort. */
export function normalizeDayFixtures(matches: readonly Match[], date: string): Match[] {
  return sortByKickoff(dedupeMatches(filterByCairoDate(matches, date)));
}
