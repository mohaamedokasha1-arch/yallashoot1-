import { CAIRO_TZ, isValidDateString } from "./dates";

/**
 * Arabic (Egypt) formatting with Latin digits, always in Cairo time.
 * Formatting happens on the server so the visitor's device time zone never
 * changes what is displayed.
 */
const LOCALE = "ar-EG-u-nu-latn";

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: CAIRO_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});

const weekdayFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", weekday: "long" });

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: CAIRO_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

function utcNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
}

/** "9:00 م" — kick-off time in Cairo. */
export function formatCairoTime(isoOrMs: string | number): string {
  const d = new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return "—";
  return timeFormatter.format(d);
}

/** "الأربعاء 21 أكتوبر 2026" for a Cairo `YYYY-MM-DD` date. */
export function formatDateLong(dateStr: string): string {
  if (!isValidDateString(dateStr)) return dateStr;
  return longDateFormatter.format(utcNoon(dateStr));
}

/** "21 أكتوبر" */
export function formatDateShort(dateStr: string): string {
  if (!isValidDateString(dateStr)) return dateStr;
  return shortDateFormatter.format(utcNoon(dateStr));
}

export function formatWeekday(dateStr: string): string {
  if (!isValidDateString(dateStr)) return "";
  return weekdayFormatter.format(utcNoon(dateStr));
}

/** Full date and time in Cairo for an instant. */
export function formatCairoDateTime(isoOrMs: string | number): string {
  const d = new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return "—";
  return dateTimeFormatter.format(d);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return numberFormatter.format(n);
}

/**
 * Season label. Seasons spanning two calendar years render as "2025/2026",
 * calendar-year seasons as "2026".
 */
export function formatSeason(year: number, start?: string | null, end?: string | null): string {
  if (start && end && start.slice(0, 4) === end.slice(0, 4)) return String(year);
  if (start && end) return `${start.slice(0, 4)}/${end.slice(0, 4)}`;
  return `${year}/${year + 1}`;
}

/** Arabic plural helper for counts of matches. */
export function matchesCount(n: number): string {
  if (n === 0) return "لا توجد مباريات";
  if (n === 1) return "مباراة واحدة";
  if (n === 2) return "مباراتان";
  if (n >= 3 && n <= 10) return `${n} مباريات`;
  return `${n} مباراة`;
}

export function teamsCount(n: number): string {
  if (n === 1) return "فريق واحد";
  if (n === 2) return "فريقان";
  if (n >= 3 && n <= 10) return `${n} فرق`;
  return `${n} فريقًا`;
}

export function pointsLabel(n: number): string {
  if (n === 1) return "نقطة واحدة";
  if (n === 2) return "نقطتان";
  if (n >= 3 && n <= 10) return `${n} نقاط`;
  return `${n} نقطة`;
}
