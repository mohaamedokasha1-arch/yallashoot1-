import { STAT_ORDER, statLabelAr } from "@/lib/football/labels";
import type { MatchStatistic } from "@/lib/football/types";

function numeric(v: string | number | null): number | null {
  if (v === null) return null;
  if (typeof v === "number") return v;
  const n = Number(v.replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
}

/** Match statistics: home value · label · away value, with comparison bars. */
export function StatsBars({ stats }: { stats: readonly MatchStatistic[] }) {
  const order = (t: string) => {
    const i = STAT_ORDER.indexOf(t.toLowerCase());
    return i === -1 ? 999 : i;
  };
  const sorted = [...stats].sort((a, b) => order(a.type) - order(b.type));
  return (
    <ul className="ys-stats">
      {sorted.map((s) => {
        const h = numeric(s.home);
        const a = numeric(s.away);
        const total = (h ?? 0) + (a ?? 0);
        const hPct = total > 0 && h !== null ? Math.round(((h ?? 0) / total) * 100) : 0;
        const aPct = total > 0 && a !== null ? 100 - hPct : 0;
        return (
          <li key={s.type}>
            <div className="ys-stat-row">
              <span className="v ltr-nums">{s.home ?? "—"}</span>
              <span className="label">{statLabelAr(s.type)}</span>
              <span className="v ltr-nums">{s.away ?? "—"}</span>
            </div>
            {total > 0 ? (
              <div className="ys-stat-bars" aria-hidden="true">
                <span className="home">
                  <i style={{ width: `${hPct}%` }} />
                </span>
                <span className="away">
                  <i style={{ width: `${aPct}%` }} />
                </span>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
