/**
 * Date helpers pinned to the Africa/Cairo time zone.
 *
 * Every "day" on the site is a Cairo calendar day, regardless of the server's
 * or the visitor's device time zone. Dates are exchanged as `YYYY-MM-DD`
 * strings; instants are exchanged as ISO-8601 UTC strings or epoch values.
 * Egypt observes DST (last Friday of April → last Thursday of October); the
 * IANA database shipped with Node.js/browsers handles the offset changes.
 */

export const CAIRO_TZ = "Africa/Cairo";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const cairoPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CAIRO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface CairoParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Wall-clock parts of an instant in Cairo. */
export function cairoParts(instant: Date | number): CairoParts {
  const date = typeof instant === "number" ? new Date(instant) : instant;
  const parts = cairoPartsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** Cairo calendar date (`YYYY-MM-DD`) of the given instant. */
export function cairoDateString(instant: Date | number): string {
  const p = cairoParts(instant);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** Strictly validates a `YYYY-MM-DD` string that represents a real calendar date. */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function toUtcNoon(dateStr: string): Date {
  const m = DATE_RE.exec(dateStr);
  if (!m) throw new RangeError(`Invalid date string: ${dateStr}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

/** Adds (or subtracts) whole calendar days to a `YYYY-MM-DD` string. */
export function addDays(dateStr: string, days: number): string {
  const d = toUtcNoon(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Number of calendar days from `from` to `to` (both `YYYY-MM-DD`). */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtcNoon(to).getTime() - toUtcNoon(from).getTime()) / 86_400_000);
}

export type RelativeDay = "yesterday" | "today" | "tomorrow";

export function relativeDay(dateStr: string, today: string): RelativeDay | null {
  const diff = diffDays(today, dateStr);
  if (diff === -1) return "yesterday";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return null;
}

/** UTC offset of Cairo (in minutes) at the given instant, e.g. 180 in summer, 120 in winter. */
export function cairoOffsetMinutes(instant: Date | number): number {
  const date = typeof instant === "number" ? new Date(instant) : instant;
  const p = cairoParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const actual = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - actual) / 60_000);
}

/** The UTC instants bounding a Cairo calendar day: [start, end). */
export function cairoDayBoundsUtc(dateStr: string): { start: Date; end: Date } {
  const noon = toUtcNoon(dateStr);
  const offset = cairoOffsetMinutes(noon);
  const startGuess = Date.UTC(noon.getUTCFullYear(), noon.getUTCMonth(), noon.getUTCDate()) - offset * 60_000;
  // Re-check the offset at the computed midnight (DST switches happen at night).
  const startOffset = cairoOffsetMinutes(startGuess);
  const start = Date.UTC(noon.getUTCFullYear(), noon.getUTCMonth(), noon.getUTCDate()) - startOffset * 60_000;
  const next = toUtcNoon(addDays(dateStr, 1));
  const endOffset = cairoOffsetMinutes(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()) - startOffset * 60_000);
  const end = Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()) - endOffset * 60_000;
  return { start: new Date(start), end: new Date(end) };
}

/** Year of the given Cairo date string. */
export function yearOf(dateStr: string): number {
  return Number(dateStr.slice(0, 4));
}
