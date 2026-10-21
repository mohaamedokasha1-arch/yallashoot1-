import Link from "next/link";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { positionLabelAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import type { Lineup, LineupPlayer, TeamRef } from "@/lib/football/types";
import { entitySlug } from "@/lib/utils/slug";

const HOME_COLOR = "#409fe1";
const AWAY_COLOR = "#e84c3d";
const POS_ROW: Record<string, number> = { G: 1, D: 2, M: 3, F: 4 };

/** Rows of the starting XI from the provider grid ("row:col"), goalkeeper first. */
export function formationRows(players: readonly LineupPlayer[]): LineupPlayer[][] {
  const parsed = players.map((p) => {
    const m = /^(\d+):(\d+)$/.exec(p.grid ?? "");
    return { p, row: m ? Number(m[1]) : null, col: m ? Number(m[2]) : null };
  });
  const useGrid = parsed.every((x) => x.row !== null);
  const rows = new Map<number, Array<{ p: LineupPlayer; col: number }>>();
  parsed.forEach((x, i) => {
    const row = useGrid ? (x.row as number) : (POS_ROW[(x.p.pos ?? "").toUpperCase()] ?? 3);
    const list = rows.get(row) ?? [];
    list.push({ p: x.p, col: useGrid ? (x.col as number) : i });
    rows.set(row, list);
  });
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, list]) => list.sort((a, b) => a.col - b.col).map((x) => x.p));
}

function Shirt({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 37 33" aria-hidden="true" focusable="false">
      <path
        d="M12 1 6 3 1 9l4 5 3-2v20h21V12l3 2 4-5-5-6-6-2c-1 3-3.5 5-6.5 5S13 4 12 1Z"
        fill={color}
        stroke="rgb(0 0 0 / 0.25)"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/** Vertical pitch drawing (own SVG). */
function PitchSvg() {
  const stripes = Array.from({ length: 10 }, (_, i) => i).filter((i) => i % 2 === 0);
  return (
    <svg viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect width="68" height="105" fill="#256c27" />
      {stripes.map((i) => (
        <rect key={i} x="0" y={i * 10.5} width="68" height="10.5" fill="#317433" />
      ))}
      <g fill="none" stroke="#99c297" strokeWidth="0.45">
        <rect x="2" y="2" width="64" height="101" />
        <line x1="2" y1="52.5" x2="66" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <rect x="13.85" y="2" width="40.3" height="16.5" />
        <rect x="24.85" y="2" width="18.3" height="5.5" />
        <rect x="13.85" y="86.5" width="40.3" height="16.5" />
        <rect x="24.85" y="97.5" width="18.3" height="5.5" />
        <path d="M26.7 18.5a9.15 9.15 0 0 0 14.6 0M26.7 86.5a9.15 9.15 0 0 1 14.6 0" />
      </g>
      <g fill="#99c297">
        <circle cx="34" cy="52.5" r="0.6" />
        <circle cx="34" cy="13" r="0.5" />
        <circle cx="34" cy="92" r="0.5" />
      </g>
    </svg>
  );
}

function Formation({ lineup, side }: { lineup: Lineup; side: "home" | "away" }) {
  const rows = formationRows(lineup.startXI);
  // Home attacks downwards (goalkeeper at the top); away attacks upwards.
  const ordered = side === "home" ? rows : [...rows].reverse();
  const color = side === "home" ? HOME_COLOR : AWAY_COLOR;
  return (
    <div className={`ys-form ys-form--${side}`}>
      {lineup.formation ? <span className="ys-form-plan">{lineup.formation}</span> : null}
      {ordered.map((row, i) => (
        <div key={i} className="ys-form-row">
          {(side === "home" ? row : [...row].reverse()).map((p, j) => (
            <span key={`${p.id ?? p.name}-${j}`} className="ys-player">
              <Shirt color={color} />
              <span className="num">{p.number ?? ""}</span>
              <span className="pname">{p.name}</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function PlayerLine({ p }: { p: LineupPlayer }) {
  const name = p.id ? (
    <Link href={`/players/${entitySlug(p.name, p.id)}`} prefetch={false}>
      {p.name}
    </Link>
  ) : (
    p.name
  );
  return (
    <li className="ys-lineup-player">
      <span className="num tabular-nums">{p.number ?? "—"}</span>
      <span className="min-w-0">
        <b>{name}</b>
        {positionLabelAr(p.pos) ?? ""}
      </span>
    </li>
  );
}

function TeamLists({ lineup, team }: { lineup: Lineup; team: TeamRef }) {
  return (
    <>
      <div className="ys-lineup">
        <h3 className="ys-title-bar">
          <TeamLogo src={team.logo} name={team.name} size={40} />
          <span className="min-w-0 flex-1 text-start">{displayName(team)}</span>
          {lineup.formation ? <span className="ltr-nums text-xs">{lineup.formation}</span> : null}
        </h3>
        {lineup.coach ? <p className="ys-coach">المدرب: {lineup.coach.name}</p> : null}
        <h4 className="sr-only">التشكيل الأساسي لفريق {displayName(team)}</h4>
        {lineup.startXI.length ? (
          <ul>
            {lineup.startXI.map((p, i) => (
              <PlayerLine key={`${p.id ?? p.name}-${i}`} p={p} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">التشكيل الأساسي غير متوفر.</p>
        )}
      </div>
      <div className="ys-lineup">
        <h4 className="ys-title-bar">قائمة البدلاء</h4>
        {lineup.substitutes.length ? (
          <ul>
            {lineup.substitutes.map((p, i) => (
              <PlayerLine key={`${p.id ?? p.name}-${i}`} p={p} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">غير متوفرة.</p>
        )}
      </div>
    </>
  );
}

/** Both line-ups: formation drawn on a pitch + starting XI and substitutes lists. */
export function Lineups({ lineups, home, away }: { lineups: readonly Lineup[]; home: TeamRef; away: TeamRef }) {
  const homeLineup = lineups.find((l) => l.side === "home");
  const awayLineup = lineups.find((l) => l.side === "away");
  const hasPitch = Boolean(homeLineup?.startXI.length || awayLineup?.startXI.length);
  return (
    <div className="ys-lineups">
      {hasPitch ? (
        <div className="ys-pitch-wrap">
          <div className="ys-pitch" aria-hidden="true">
            <PitchSvg />
            {homeLineup?.startXI.length ? <Formation lineup={homeLineup} side="home" /> : null}
            {awayLineup?.startXI.length ? <Formation lineup={awayLineup} side="away" /> : null}
          </div>
        </div>
      ) : null}
      <div className="side side--home">
        {homeLineup ? <TeamLists lineup={homeLineup} team={home} /> : <p className="text-sm text-slate-500">تشكيل {displayName(home)} غير متوفر.</p>}
      </div>
      <div className="side side--away">
        {awayLineup ? <TeamLists lineup={awayLineup} team={away} /> : <p className="text-sm text-slate-500">تشكيل {displayName(away)} غير متوفر.</p>}
      </div>
    </div>
  );
}
