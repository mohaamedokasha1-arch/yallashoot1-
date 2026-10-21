import { CalendarDays, ListOrdered, MapPin, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { roundLabelAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import type { Match } from "@/lib/football/types";
import { cn } from "@/lib/utils/cn";
import { formatCairoTime, formatDateShort, formatSeason } from "@/lib/utils/format";
import { MatchCenter, scoreSummary, stateClass } from "./MatchCenter";

/** Hover mask icon (stats bars in a white circle): the card opens the match details. */
function MaskIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="24" fill="#fff" />
      <path d="M15 32v-9M24 32V15M33 32v-6" stroke="#273340" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function leagueLine(m: Match): string {
  const league = displayName(m.league);
  const country = m.league.country && m.league.country !== "World" ? (m.league.countryAr ?? m.league.country) : null;
  return country ? `${country}، ${league}` : league;
}

/**
 * Match card: home team (logo + name), kick-off time or score with the status
 * pill, away team, then an info strip (venue or date · round · competition).
 */
export function MatchRow({
  match: m,
  showDate = false,
  highlightTeamId,
  size = "md",
}: {
  match: Match;
  showDate?: boolean;
  /** Kept for API compatibility: the competition is always shown in the info strip. */
  showLeague?: boolean;
  highlightTeamId?: number;
  size?: "md" | "sm";
}) {
  const home = displayName(m.home);
  const away = displayName(m.away);
  const round = roundLabelAr(m.league.round);
  const info: Array<{ Icon: LucideIcon; cls: string; text: string }> = [
    showDate
      ? {
          Icon: CalendarDays,
          cls: "i-venue",
          text: m.status.code === "TBD" ? formatDateShort(m.cairoDate) : `${formatDateShort(m.cairoDate)} ${formatCairoTime(m.kickoff)}`,
        }
      : { Icon: MapPin, cls: "i-venue", text: m.venue?.name ?? "الملعب غير محدد" },
    { Icon: ListOrdered, cls: "i-round", text: round ?? (m.league.season ? `موسم ${formatSeason(m.league.season)}` : "—") },
    { Icon: Trophy, cls: "i-league", text: leagueLine(m) },
  ];

  return (
    <li>
      <Link
        href={`/matches/${m.slug}`}
        prefetch={false}
        data-group={m.status.group}
        data-match-id={m.id}
        aria-label={scoreSummary(m)}
        className={cn("match-row ys-match", stateClass(m), size === "sm" && "ys-match--sm")}
      >
        <span className="ys-match-inner">
          <span className="ys-team ys-team--home">
            <span className="ys-team-logo">
              <TeamLogo src={m.home.logo} name={m.home.name} size={70} />
            </span>
            <span className={cn("ys-team-name", highlightTeamId === m.home.id && "is-highlight")}>{home}</span>
          </span>
          <MatchCenter match={m} />
          <span className="ys-team ys-team--away">
            <span className="ys-team-logo">
              <TeamLogo src={m.away.logo} name={m.away.name} size={70} />
            </span>
            <span className={cn("ys-team-name", highlightTeamId === m.away.id && "is-highlight")}>{away}</span>
          </span>
        </span>
        <span className="ys-match-info">
          <ul>
            {info.map(({ Icon, cls, text }) => (
              <li key={cls}>
                <Icon aria-hidden="true" className={cls} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </span>
        <span className="ys-match-mask" aria-hidden="true">
          <MaskIcon />
        </span>
      </Link>
    </li>
  );
}
