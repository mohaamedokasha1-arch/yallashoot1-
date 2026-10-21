import Link from "next/link";
import { MatchRow } from "@/components/matches/MatchRow";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { displayName } from "@/lib/football/names";
import type { Match, TeamRef, TopScorer } from "@/lib/football/types";
import { formatDateLong, formatNumber } from "@/lib/utils/format";

/** Match cards grouped under Cairo date bars. */
export function MatchesByDate({ matches }: { matches: readonly Match[] }) {
  const byDate = new Map<string, Match[]>();
  for (const m of matches) {
    const list = byDate.get(m.cairoDate) ?? [];
    list.push(m);
    byDate.set(m.cairoDate, list);
  }
  return (
    <div className="ys-block-body ys-block-body--flush">
      {[...byDate.entries()].map(([date, list]) => (
        <div key={date}>
          <h3 className="ys-league-bar">
            <Link href={`/matches/date/${date}`} prefetch={false}>
              {formatDateLong(date)}
            </Link>
          </h3>
          <ul className="ys-matches">
            {list.map((m) => (
              <MatchRow key={m.id} match={m} size="sm" />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function TopScorersTable({ scorers }: { scorers: readonly TopScorer[] }) {
  return (
    <div className="ys-table-wrap">
      <table className="ys-table">
        <caption className="sr-only">ترتيب الهدافين</caption>
        <thead>
          <tr>
            <th scope="col" className="w-8 text-center">#</th>
            <th scope="col" className="text-start">اللاعب</th>
            <th scope="col" className="hidden text-start sm:table-cell">الفريق</th>
            <th scope="col" className="text-center">الأهداف</th>
            <th scope="col" className="text-center">صناعة</th>
            <th scope="col" className="hidden text-center sm:table-cell">مباريات</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, i) => (
            <tr key={s.player.id}>
              <td className="text-center tabular-nums">{i + 1}</td>
              <td>
                <Link href={`/players/${s.player.slug}`} prefetch={false} className="flex items-center gap-2">
                  <TeamLogo src={s.player.photo} name={s.player.name} size={28} rounded />
                  <span className="min-w-0">
                    <span className="block truncate">{s.player.name}</span>
                    {s.team ? <span className="block truncate text-xs text-slate-500 sm:hidden">{displayName(s.team)}</span> : null}
                  </span>
                </Link>
              </td>
              <td className="hidden sm:table-cell">
                {s.team ? (
                  <Link href={`/teams/${s.team.slug}`} prefetch={false} className="flex items-center gap-2">
                    <TeamLogo src={s.team.logo} name={s.team.name} size={20} />
                    <span className="truncate">{displayName(s.team)}</span>
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="text-center font-bold tabular-nums">{formatNumber(s.goals)}</td>
              <td className="text-center tabular-nums">{formatNumber(s.assists)}</td>
              <td className="hidden text-center tabular-nums sm:table-cell">{formatNumber(s.appearances)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeamsGrid({ teams }: { teams: readonly TeamRef[] }) {
  return (
    <ul className="ys-grid ys-block-body [--ys-item:170px]">
      {teams.map((t) => (
        <li key={t.id}>
          <Link href={`/teams/${t.slug}`} prefetch={false} className="ys-tile">
            <TeamLogo src={t.logo} name={t.name} size={26} />
            <span className="name">{displayName(t)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
