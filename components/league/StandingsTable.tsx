import Link from "next/link";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { standingDescriptionAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import type { StandingRow, StandingsGroup } from "@/lib/football/types";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

function zoneColor(description: string | null): string | null {
  if (!description) return null;
  const d = description.toLowerCase();
  if (d.includes("relegation")) return "bg-rose-500";
  if (d.includes("champions league") || d.includes("championship round") || d.includes("promotion")) return "bg-emerald-500";
  if (d.includes("europa") || d.includes("confederation") || d.includes("conference")) return "bg-sky-500";
  if (d.includes("play")) return "bg-amber-500";
  return "bg-slate-400";
}

function FormBadges({ form }: { form: string | null }) {
  if (!form) return <span className="text-slate-400">—</span>;
  const letters = form.slice(-5).split("");
  const map: Record<string, { label: string; cls: string; text: string }> = {
    W: { label: "فوز", cls: "bg-emerald-600", text: "ف" },
    D: { label: "تعادل", cls: "bg-slate-500", text: "ت" },
    L: { label: "خسارة", cls: "bg-rose-600", text: "خ" },
  };
  return (
    <span className="inline-flex gap-0.5" aria-label={`آخر النتائج: ${letters.map((l) => map[l]?.label ?? l).join("، ")}`}>
      {letters.map((l, i) => (
        <span key={i} aria-hidden="true" className={cn("flex size-5 items-center justify-center rounded text-[10px] font-bold text-white", map[l]?.cls ?? "bg-slate-400")}>
          {map[l]?.text ?? l}
        </span>
      ))}
    </span>
  );
}

export function StandingsTable({
  group,
  highlightTeamIds = [],
  compact = false,
  limit,
  caption,
}: {
  group: StandingsGroup;
  highlightTeamIds?: readonly number[];
  compact?: boolean;
  limit?: number;
  caption?: string;
}) {
  const highlight = new Set(highlightTeamIds);
  const rows: StandingRow[] = limit ? group.rows.slice(0, limit) : group.rows;
  const zones = [...new Map(group.rows.filter((r) => r.description).map((r) => [standingDescriptionAr(r.description), zoneColor(r.description)])).entries()];

  return (
    <div>
      <div className="ys-table-wrap">
        <table className="ys-table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              <th scope="col" className="w-8 text-center">#</th>
              <th scope="col" className="text-start">الفريق</th>
              <th scope="col" className="text-center" title="لعب">لعب</th>
              {!compact ? (
                <>
                  <th scope="col" className="hidden text-center sm:table-cell">فاز</th>
                  <th scope="col" className="hidden text-center sm:table-cell">تعادل</th>
                  <th scope="col" className="hidden text-center sm:table-cell">خسر</th>
                  <th scope="col" className="hidden text-center md:table-cell">له:عليه</th>
                </>
              ) : null}
              <th scope="col" className="text-center" title="فارق الأهداف">الفارق</th>
              <th scope="col" className="text-center">النقاط</th>
              {!compact ? <th scope="col" className="hidden text-center lg:table-cell">آخر 5</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const zone = zoneColor(r.description);
              const isHighlighted = highlight.has(r.team.id);
              return (
                <tr key={r.team.id} aria-current={isHighlighted ? "true" : undefined}>
                  <td className="relative text-center tabular-nums">
                    {zone ? <span aria-hidden="true" className={cn("absolute inset-y-1.5 start-0 w-1 rounded-full", zone)} /> : null}
                    {r.rank}
                  </td>
                  <td>
                    <Link href={`/teams/${r.team.slug}`} prefetch={false} className="flex min-w-0 items-center gap-2">
                      <TeamLogo src={r.team.logo} name={r.team.name} size={22} />
                      <span className={cn("truncate", compact ? "max-w-[10rem]" : "max-w-[11rem] sm:max-w-none")}>{displayName(r.team)}</span>
                    </Link>
                  </td>
                  <td className="text-center tabular-nums">{formatNumber(r.all.played)}</td>
                  {!compact ? (
                    <>
                      <td className="hidden text-center tabular-nums sm:table-cell">{formatNumber(r.all.win)}</td>
                      <td className="hidden text-center tabular-nums sm:table-cell">{formatNumber(r.all.draw)}</td>
                      <td className="hidden text-center tabular-nums sm:table-cell">{formatNumber(r.all.lose)}</td>
                      <td className="ltr-nums hidden text-center tabular-nums md:table-cell">
                        {r.all.goalsFor === null || r.all.goalsAgainst === null ? "—" : `${r.all.goalsFor}:${r.all.goalsAgainst}`}
                      </td>
                    </>
                  ) : null}
                  <td className="ltr-nums text-center tabular-nums">
                    {r.goalsDiff === null ? "—" : r.goalsDiff > 0 ? `+${r.goalsDiff}` : String(r.goalsDiff)}
                  </td>
                  <td className="text-center font-bold tabular-nums">{formatNumber(r.points)}</td>
                  {!compact ? (
                    <td className="hidden text-center lg:table-cell">
                      <FormBadges form={r.form} />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!compact && zones.length ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-xs text-slate-600">
          {zones.map(([label, color]) => (
            <li key={label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-2.5 rounded-full", color)} />
              {label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
