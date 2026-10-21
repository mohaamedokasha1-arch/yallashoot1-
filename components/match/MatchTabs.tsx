import type { ReactNode } from "react";

const TABS = [
  { key: "details", id: "match-details", label: "تفاصيل المباراة" },
  { key: "lineups", id: "lineups", label: "التشكيلة" },
  { key: "events", id: "events", label: "أحداث المباراة" },
] as const;

/**
 * Match page tabs. Pure HTML/CSS (radio buttons + :has()), so they work
 * without JavaScript; browsers without :has() simply show all panels.
 */
export function MatchTabs({ details, lineups, events }: { details: ReactNode; lineups: ReactNode; events: ReactNode }) {
  const panels = { details, lineups, events };
  return (
    <div className="ys-tabs">
      <div className="ys-tablist" role="radiogroup" aria-label="أقسام صفحة المباراة">
        {TABS.map((t) => (
          <span key={t.key} className="contents">
            <input type="radio" name="match-tab" id={`tab-${t.key}`} className="ys-tab-input" defaultChecked={t.key === "details"} />
            <label htmlFor={`tab-${t.key}`} className="ys-tab">
              {t.label}
            </label>
          </span>
        ))}
      </div>
      {TABS.map((t) => (
        <section key={t.key} id={t.id} data-tab={t.key} className="ys-tabpanel" aria-labelledby={`${t.id}-h`}>
          <h2 id={`${t.id}-h`} className="sr-only">
            {t.label}
          </h2>
          {panels[t.key]}
        </section>
      ))}
    </div>
  );
}
