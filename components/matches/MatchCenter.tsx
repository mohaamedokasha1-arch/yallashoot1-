import { hasScore, liveMinute, statusLabel } from "@/lib/football/status";
import type { Match, StatusCode } from "@/lib/football/types";
import { formatCairoTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Score pair rendered as two cells so home always stays on the home side (RTL-safe). */
export function ScorePair({
  home,
  away,
  className,
  separator = "-",
}: {
  home: number | null;
  away: number | null;
  className?: string;
  separator?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}>
      <span data-side="home">{home ?? "—"}</span>
      <span aria-hidden="true">{separator}</span>
      <span data-side="away">{away ?? "—"}</span>
    </span>
  );
}

export function scoreSummary(m: Match): string {
  const home = m.home.nameAr ?? m.home.name;
  const away = m.away.nameAr ?? m.away.name;
  if (hasScore(m)) {
    const pen =
      m.status.code === "PEN" && m.score.penalty.home !== null && m.score.penalty.away !== null
        ? `، ركلات الترجيح ${home} ${m.score.penalty.home} و${away} ${m.score.penalty.away}`
        : "";
    return `${home} ${m.goals.home}، ${away} ${m.goals.away}${pen}، ${statusLabel(m.status)}`;
  }
  if (m.status.group === "upcoming" && m.status.code !== "TBD") {
    return `${home} ضد ${away}، تبدأ الساعة ${formatCairoTime(m.kickoff)} بتوقيت القاهرة`;
  }
  return `${home} ضد ${away}، ${statusLabel(m.status)}`;
}

/** CSS state class of a match card / header (drives the status pill color). */
export function stateClass(m: Match): string {
  switch (m.status.group) {
    case "live":
      return "is-live";
    case "finished":
      return "is-finished";
    case "postponed":
      return "is-postponed";
    case "cancelled":
      return "is-cancelled";
    case "interrupted":
      return "is-interrupted";
    default:
      return "is-upcoming";
  }
}

const SHORT_LABELS: Partial<Record<StatusCode, string>> = {
  NS: "لم تبدأ بعد",
  TBD: "لم يحدد",
  HT: "استراحة",
  BT: "استراحة",
  P: "ركلات الترجيح",
  FT: "انتهت",
  AET: "انتهت (إضافي)",
  PEN: "انتهت",
  AWD: "نتيجة إدارية",
  WO: "انسحاب",
  PST: "مؤجلة",
  CANC: "ملغاة",
  ABD: "أُلغيت",
  SUSP: "موقوفة",
  INT: "متوقفة",
};

/** Short text of the status pill ("لم تبدأ بعد", live minute, "انتهت"…). */
export function statusPillText(m: Match): string {
  if (m.status.group === "live") {
    const minute = liveMinute(m.status);
    return minute ?? "مباشر";
  }
  return SHORT_LABELS[m.status.code] ?? statusLabel(m.status);
}

export function StatusPill({ match: m, className }: { match: Match; className?: string }) {
  const text = statusPillText(m);
  const isMinute = m.status.group === "live" && /\d/.test(text);
  return (
    <span className={cn("ys-pill ys-match-stat", className)} title={statusLabel(m.status)}>
      {isMinute ? <span className="ltr-nums">{text}</span> : text}
    </span>
  );
}

/** Centre column of a match card: kick-off time or score, then the status pill. */
export function MatchCenter({ match: m }: { match: Match }) {
  const showScore = hasScore(m);
  const upcomingWithTime = m.status.group === "upcoming" && m.status.code !== "TBD";
  return (
    <span className="ys-match-data">
      {showScore ? (
        <ScorePair home={m.goals.home} away={m.goals.away} className="ys-match-result" />
      ) : upcomingWithTime ? (
        <time dateTime={m.kickoff} className="ys-match-time ltr-nums">
          {formatCairoTime(m.kickoff)}
        </time>
      ) : (
        <span className="ys-match-time" aria-hidden="true">
          —
        </span>
      )}
      <StatusPill match={m} />
      {m.status.code === "PEN" && m.score.penalty.home !== null && m.score.penalty.away !== null ? (
        <span className="ys-match-pen">
          ترجيح <ScorePair home={m.score.penalty.home} away={m.score.penalty.away} />
        </span>
      ) : null}
    </span>
  );
}
