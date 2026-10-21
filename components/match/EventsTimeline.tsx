import { ArrowLeftRight, CircleDot, MonitorPlay, RectangleVertical, Volleyball } from "lucide-react";
import Link from "next/link";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { eventDetailAr } from "@/lib/football/labels";
import type { MatchEvent, PersonRef, TeamRef } from "@/lib/football/types";
import { displayName } from "@/lib/football/names";
import { entitySlug } from "@/lib/utils/slug";
import { cn } from "@/lib/utils/cn";

function minuteLabel(e: MatchEvent): string {
  if (e.minute === null) return "—";
  return e.extra ? `${e.minute}+${e.extra}'` : `${e.minute}'`;
}

function PlayerName({ person }: { person: PersonRef | null }) {
  if (!person) return null;
  if (person.id) {
    return (
      <Link href={`/players/${entitySlug(person.name, person.id)}`} prefetch={false}>
        {person.name}
      </Link>
    );
  }
  return <span>{person.name}</span>;
}

function EventIcon({ e }: { e: MatchEvent }) {
  const d = e.detail.toLowerCase();
  if (e.type === "goal") {
    return <Volleyball aria-hidden="true" className={cn(d.includes("missed") ? "text-slate-400" : d.includes("own") ? "text-rose-600" : "text-emerald-700")} />;
  }
  if (e.type === "card") {
    const red = d.includes("red") || d.includes("second yellow");
    return <RectangleVertical aria-hidden="true" className={cn(red ? "fill-rose-600 text-rose-700" : "fill-amber-400 text-amber-500")} />;
  }
  if (e.type === "subst") return <ArrowLeftRight aria-hidden="true" className="text-sky-700" />;
  if (e.type === "var") return <MonitorPlay aria-hidden="true" className="text-violet-700" />;
  return <CircleDot aria-hidden="true" className="text-slate-400" />;
}

function EventText({ e }: { e: MatchEvent }) {
  if (e.type === "subst") {
    return (
      <div>
        <PlayerName person={e.player} />
        {e.assist ? (
          <>
            {" "}
            <span className="ys-event-txt">و</span> <PlayerName person={e.assist} />
          </>
        ) : null}
      </div>
    );
  }
  return (
    <div>
      <PlayerName person={e.player} />
      {e.type === "goal" && e.assist ? (
        <span className="ys-event-txt">
          {" "}
          (صناعة <PlayerName person={e.assist} />)
        </span>
      ) : null}
      {e.comments ? <span className="ys-event-txt"> — {e.comments}</span> : null}
    </div>
  );
}

/**
 * Two-sided timeline (home events on one side of the centre line, away on
 * the other), latest event first like the original design.
 */
export function EventsTimeline({ events, home, away }: { events: readonly MatchEvent[]; home: TeamRef; away: TeamRef }) {
  const homeName = displayName(home);
  const awayName = displayName(away);
  const list = [...events].reverse();
  return (
    <div className="ys-events">
      <div className="ys-events-teams">
        <div className="ys-title-bar">
          <TeamLogo src={home.logo} name={home.name} size={40} />
          <span className="min-w-0 truncate">{homeName}</span>
        </div>
        <div className="ys-title-bar is-away">
          <TeamLogo src={away.logo} name={away.name} size={40} />
          <span className="min-w-0 truncate">{awayName}</span>
        </div>
      </div>
      <div className="relative">
        <span className="ys-events-dot" aria-hidden="true" />
        <ol className="ys-events-list">
          {list.map((e, i) => {
            const side = e.side ?? "home";
            const team = side === "home" ? homeName : awayName;
            return (
              <li key={i} className={`ys-event ys-event--${side}`}>
                <span className="ys-event-icon" aria-hidden="true">
                  <EventIcon e={e} />
                </span>
                <div className="ys-event-box">
                  <div className="ys-event-card">
                    <div className="ys-event-head">
                      <span className="ys-event-minute">{minuteLabel(e)}</span>
                      <span className="ys-event-name">{eventDetailAr(e.type, e.detail)}</span>
                      <span className="ys-event-team" aria-hidden="true">
                        · {team}
                      </span>
                    </div>
                    <EventText e={e} />
                    <span className="sr-only"> — {team}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
