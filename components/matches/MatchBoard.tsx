import { CalendarX2, ChevronDown } from "lucide-react";
import { REGION_LABELS_AR, type Region } from "@/data/competitions";
import { EmptyState } from "@/components/ui/EmptyState";
import { countByGroup, groupByLeague, type LeagueGroup } from "@/lib/football/grouping";
import type { Match } from "@/lib/football/types";
import { matchesCount } from "@/lib/utils/format";
import { LeagueBlock } from "./LeagueBlock";

const FILTERS = [
  { value: "all", label: "الكل" },
  { value: "live", label: "مباشر" },
  { value: "upcoming", label: "قادمة" },
  { value: "finished", label: "منتهية" },
] as const;

const FILTER_EMPTY: Record<string, string> = {
  live: "لا توجد مباريات جارية الآن في هذا اليوم.",
  upcoming: "لا توجد مباريات قادمة متبقية في هذا اليوم.",
  finished: "لا توجد مباريات منتهية في هذا اليوم حتى الآن.",
};

export interface BoardOptions {
  id: string;
  showFilters?: boolean;
  /** Show non-featured leagues in a collapsed section. */
  showOthers?: boolean;
  hiddenLeagueIds?: readonly number[];
  extraFeaturedLeagueIds?: readonly number[];
  emptyTitle?: string;
  emptyText?: string;
}

function groupRegions(groups: LeagueGroup[]) {
  const featured = new Map<Region, LeagueGroup[]>();
  const others: LeagueGroup[] = [];
  for (const g of groups) {
    if (g.featured) {
      const list = featured.get(g.region) ?? [];
      list.push(g);
      featured.set(g.region, list);
    } else {
      others.push(g);
    }
  }
  return { featured, others };
}

/**
 * Matches of a day: status filters, then sections (Egyptian football first),
 * each competition with its own title bar, then the other competitions folded.
 */
export function MatchBoard({ matches, options }: { matches: readonly Match[]; options: BoardOptions }) {
  const hidden = new Set(options.hiddenLeagueIds ?? []);
  const extra = new Set(options.extraFeaturedLeagueIds ?? []);
  const visible = matches.filter((m) => !hidden.has(m.league.id));
  const groups = groupByLeague(visible).map((g) => (extra.has(g.league.id) ? { ...g, featured: true } : g));
  const { featured, others } = groupRegions(groups);
  const shownOthers = options.showOthers === false ? [] : others;
  const counts = countByGroup(visible);
  const othersCounts = countByGroup(shownOthers.flatMap((g) => g.matches));

  if (visible.length === 0) {
    return (
      <EmptyState icon={CalendarX2} title={options.emptyTitle ?? "لا توجد مباريات في هذا اليوم"}>
        {options.emptyText ?? "لم يُرجع مزود البيانات أي مباريات لهذا التاريخ ضمن البطولات المتاحة في الباقة الحالية."}
      </EmptyState>
    );
  }

  return (
    <div className="match-board">
      {options.showFilters !== false ? (
        <fieldset className="ys-filters">
          <legend className="sr-only">تصفية المباريات حسب الحالة</legend>
          {FILTERS.map((f) => {
            const count = f.value === "all" ? counts.total : counts[f.value];
            return (
              <span key={f.value} className="min-w-0">
                <input
                  type="radio"
                  name={`${options.id}-filter`}
                  id={`${options.id}-filter-${f.value}`}
                  value={f.value}
                  defaultChecked={f.value === "all"}
                  className="flt sr-only"
                />
                <label htmlFor={`${options.id}-filter-${f.value}`} className="flt-label">
                  {f.value === "live" && count > 0 ? <span className="live-dot live-dot--red" aria-hidden="true" /> : null}
                  {f.label}
                  <span className="count">({count})</span>
                </label>
              </span>
            );
          })}
        </fieldset>
      ) : null}

      {[...featured.entries()].map(([region, list]) => (
        <section key={region} className="region-block ys-region" aria-labelledby={`${options.id}-${region}`}>
          <h2 id={`${options.id}-${region}`} className="ys-region-title">
            <span className="ys-pill">{REGION_LABELS_AR[region]}</span>
            <span className="count">({matchesCount(list.reduce((n, g) => n + g.matches.length, 0))})</span>
          </h2>
          {list.map((g) => (
            <LeagueBlock key={g.key} league={g.league} matches={g.matches} />
          ))}
        </section>
      ))}

      {shownOthers.length > 0 ? (
        <details className="others-block region-block ys-others" open={featured.size === 0}>
          <summary>
            <span>
              بطولات أخرى
              <span className="ms-2 text-sm text-slate-500">
                ({shownOthers.length} بطولة، {matchesCount(othersCounts.total)}
                {othersCounts.live > 0 ? `، ${othersCounts.live} مباشر` : ""})
              </span>
            </span>
            <ChevronDown aria-hidden="true" className="chevron size-5 shrink-0 transition-transform" />
          </summary>
          <div className="ys-others-body">
            {shownOthers.map((g) => (
              <LeagueBlock key={g.key} league={g.league} matches={g.matches} headingLevel={3} />
            ))}
          </div>
        </details>
      ) : null}

      {Object.entries(FILTER_EMPTY).map(([key, text]) => (
        <p key={key} data-for={key} className="filter-empty ys-empty">
          {text}
        </p>
      ))}
    </div>
  );
}
