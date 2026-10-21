import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addDays, relativeDay } from "@/lib/utils/dates";
import { formatDateLong, formatDateShort } from "@/lib/utils/format";

const DAYS = [
  { key: "yesterday", label: "مباريات الأمس", offset: -1 },
  { key: "today", label: "مباريات اليوم", offset: 0 },
  { key: "tomorrow", label: "مباريات الغد", offset: 1 },
] as const;

export function dayPath(date: string, today: string): string {
  const rel = relativeDay(date, today);
  return rel ? `/matches/${rel}` : `/matches/date/${date}`;
}

/** Yesterday / today / tomorrow tabs (blue / maroon / orange pills, Cairo days). */
export function DayTabs({ today, active }: { today: string; active: string | null }) {
  return (
    <nav aria-label="اختيار اليوم" className="max-[500px]:w-full">
      <ul className="ys-daytabs">
        {DAYS.map((d) => {
          const date = addDays(today, d.offset);
          const isActive = active === date;
          return (
            <li key={d.key} className={d.key}>
              <Link
                href={`/matches/${d.key}`}
                aria-current={isActive ? "page" : undefined}
                title={formatDateLong(date)}
                className="ys-pill"
              >
                {d.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Previous/next day links plus a no-JS date picker. */
export function DateNavigator({ date, today }: { date: string; today: string }) {
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  return (
    <div className="ys-datenav">
      <div className="flex items-center gap-2">
        <Link href={dayPath(prev, today)} className="ys-btn-soft" aria-label={`اليوم السابق: ${formatDateLong(prev)}`}>
          <ChevronRight aria-hidden="true" className="size-4" />
          السابق
        </Link>
        <span className="text-sm text-slate-600">{formatDateShort(date)}</span>
        <Link href={dayPath(next, today)} className="ys-btn-soft" aria-label={`اليوم التالي: ${formatDateLong(next)}`}>
          التالي
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <form action="/matches/go" method="get">
        <label htmlFor="match-date" className="text-sm">
          اختر تاريخًا
        </label>
        <input
          id="match-date"
          type="date"
          name="d"
          required
          defaultValue={date}
          min="2015-01-01"
          max="2035-12-31"
          className="ys-input"
        />
        <button type="submit" className="ys-pill ys-pill--main ys-pill--sm">
          عرض
        </button>
      </form>
    </div>
  );
}
