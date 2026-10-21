import Link from "next/link";
import { ScorePair, stateClass, StatusPill } from "@/components/matches/MatchCenter";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { roundLabelAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import { hasScore } from "@/lib/football/status";
import type { Match } from "@/lib/football/types";
import { cn } from "@/lib/utils/cn";
import { formatCairoTime, formatSeason } from "@/lib/utils/format";

function TeamSide({ team, side }: { team: Match["home"]; side: "home" | "away" }) {
  return (
    <div className="ys-hero-team">
      <Link href={`/teams/${team.slug}`}>
        <TeamLogo src={team.logo} name={team.name} size={90} className="ys-hero-flag" />
        <span className="ys-hero-name">{displayName(team)}</span>
        <span className="ys-hero-side">{side === "home" ? "صاحب الأرض" : "الضيف"}</span>
      </Link>
    </div>
  );
}

/** Stadium banner of the match page: both teams, VS / score and the status pill. */
export function MatchHeader({ match: m }: { match: Match }) {
  const round = roundLabelAr(m.league.round);
  const ht = m.score.halftime;
  const et = m.score.extratime;
  const showHt = ht.home !== null && ht.away !== null && m.status.group !== "upcoming";
  const showEt = et.home !== null && et.away !== null;
  return (
    <section className={cn("ys-hero", stateClass(m))} aria-label="ملخص المباراة">
      <div className="ys-hero-bg">
        <div className="ys-hero-overlay">
          <p className="ys-hero-league">
            <Link href={`/leagues/${m.league.slug}`} className="inline-flex items-center gap-2">
              <TeamLogo src={m.league.logo} name={m.league.name} size={22} />
              {displayName(m.league)}
            </Link>
            {m.league.season ? <span>موسم {formatSeason(m.league.season)}</span> : null}
            {round ? <span>{round}</span> : null}
          </p>
          <div className="ys-hero-row">
            <TeamSide team={m.home} side="home" />
            <div className="ys-hero-center">
              {hasScore(m) ? (
                <ScorePair home={m.goals.home} away={m.goals.away} className="ys-hero-score" />
              ) : (
                <span className="ys-hero-vs" aria-hidden="true">
                  VS
                </span>
              )}
              <StatusPill match={m} />
              {m.status.group === "upcoming" && m.status.code !== "TBD" ? (
                <time dateTime={m.kickoff} className="ys-hero-time ltr-nums">
                  {formatCairoTime(m.kickoff)}
                </time>
              ) : null}
              {m.status.code === "PEN" && m.score.penalty.home !== null && m.score.penalty.away !== null ? (
                <span className="text-sm">
                  ترجيح <ScorePair home={m.score.penalty.home} away={m.score.penalty.away} />
                </span>
              ) : null}
            </div>
            <TeamSide team={m.away} side="away" />
          </div>
          {showHt || showEt ? (
            <p className="ys-hero-meta">
              {showHt ? (
                <span>
                  الشوط الأول: <ScorePair home={ht.home} away={ht.away} />
                </span>
              ) : null}
              {showEt ? (
                <span>
                  الأشواط الإضافية: <ScorePair home={et.home} away={et.away} />
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
