import type { Match, MatchStatus, StatusCode, StatusGroup } from "./types";

const KNOWN_CODES: ReadonlySet<StatusCode> = new Set<StatusCode>([
  "TBD", "NS", "1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE",
  "FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO",
]);

const GROUPS: Record<StatusCode, StatusGroup> = {
  TBD: "upcoming",
  NS: "upcoming",
  "1H": "live",
  HT: "live",
  "2H": "live",
  ET: "live",
  BT: "live",
  P: "live",
  LIVE: "live",
  SUSP: "interrupted",
  INT: "interrupted",
  FT: "finished",
  AET: "finished",
  PEN: "finished",
  AWD: "finished",
  WO: "finished",
  PST: "postponed",
  CANC: "cancelled",
  ABD: "cancelled",
  UNKNOWN: "upcoming",
};

export const STATUS_LABELS_AR: Record<StatusCode, string> = {
  TBD: "الموعد غير محدد",
  NS: "لم تبدأ",
  "1H": "الشوط الأول",
  HT: "استراحة بين الشوطين",
  "2H": "الشوط الثاني",
  ET: "الأشواط الإضافية",
  BT: "استراحة قبل الإضافي",
  P: "ركلات الترجيح",
  LIVE: "جارية الآن",
  SUSP: "موقوفة",
  INT: "متوقفة مؤقتًا",
  FT: "انتهت",
  AET: "انتهت بعد الأشواط الإضافية",
  PEN: "انتهت بركلات الترجيح",
  AWD: "نتيجة إدارية",
  WO: "انسحاب",
  PST: "مؤجلة",
  CANC: "ملغاة",
  ABD: "أُلغيت بعد انطلاقها",
  UNKNOWN: "حالة غير معروفة",
};

export const GROUP_LABELS_AR: Record<StatusGroup, string> = {
  upcoming: "لم تبدأ",
  live: "مباشر",
  finished: "انتهت",
  interrupted: "متوقفة",
  postponed: "مؤجلة",
  cancelled: "ملغاة",
};

export function normalizeStatusCode(code: string | null | undefined): StatusCode {
  const c = (code ?? "").toUpperCase() as StatusCode;
  return KNOWN_CODES.has(c) ? c : "UNKNOWN";
}

export function buildStatus(
  code: string | null | undefined,
  elapsed: number | null | undefined,
  extra: number | null | undefined,
  providerLong: string | null | undefined,
): MatchStatus {
  const normalized = normalizeStatusCode(code);
  const group = GROUPS[normalized];
  return {
    code: normalized,
    group,
    elapsed: group === "live" || group === "interrupted" ? (elapsed ?? null) : null,
    extra: group === "live" ? (extra ?? null) : null,
    providerLong: providerLong ?? null,
  };
}

/** Whether a score should be displayed for this status. */
export function hasScore(match: Pick<Match, "status" | "goals">): boolean {
  const { group, code } = match.status;
  if (match.goals.home === null || match.goals.away === null) return false;
  if (group === "live" || group === "finished" || group === "interrupted") return true;
  // Abandoned matches may carry the score at the time of abandonment.
  return code === "ABD";
}

export function statusLabel(status: MatchStatus): string {
  return STATUS_LABELS_AR[status.code];
}

/** "67'" / "45+2'" style minute indicator for live matches. */
export function liveMinute(status: MatchStatus): string | null {
  if (status.group !== "live") return null;
  if (status.code === "HT") return "استراحة";
  if (status.code === "BT") return "استراحة";
  if (status.code === "P") return "ترجيح";
  if (status.elapsed === null) return null;
  return status.extra ? `${status.elapsed}+${status.extra}'` : `${status.elapsed}'`;
}

/**
 * Progress rank used to prevent regressions: a finished match must never be
 * replaced by an older "live" or "not started" copy.
 */
export function statusRank(code: StatusCode): number {
  switch (code) {
    case "TBD":
    case "NS":
    case "UNKNOWN":
      return 0;
    case "PST":
      return 1;
    case "1H":
    case "LIVE":
      return 2;
    case "HT":
      return 3;
    case "2H":
      return 4;
    case "SUSP":
    case "INT":
      return 4;
    case "BT":
      return 5;
    case "ET":
      return 6;
    case "P":
      return 7;
    case "FT":
    case "AET":
    case "PEN":
    case "AWD":
    case "WO":
    case "CANC":
    case "ABD":
      return 10;
  }
}

export function isFinalStatus(code: StatusCode): boolean {
  return statusRank(code) === 10;
}
