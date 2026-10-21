import Link from "next/link";
import { displayName } from "@/lib/football/names";
import { liveMinute } from "@/lib/football/status";
import type { Match } from "@/lib/football/types";
import { scoreSummary } from "./MatchCenter";

/** Strip of live matches (shown only while matches are live). */
export function LiveTicker({ matches }: { matches: readonly Match[] }) {
  if (matches.length === 0) return null;
  return (
    <section aria-labelledby="live-ticker-title" className="ys-block">
      <div className="ys-block-head">
        <h2 id="live-ticker-title" className="ys-pill ys-live-pill">
          <span className="live-dot" aria-hidden="true" />
          مباشر الآن ({matches.length})
        </h2>
      </div>
      <ul className="ys-live-strip">
        {matches.map((m) => (
          <li key={m.id} className="shrink-0">
            <Link href={`/matches/${m.slug}`} prefetch={false} aria-label={scoreSummary(m)} className="ys-live-item">
              <span className="row">
                <span className="truncate">{displayName(m.home)}</span>
                <span className="goals">{m.goals.home ?? "—"}</span>
              </span>
              <span className="row">
                <span className="truncate">{displayName(m.away)}</span>
                <span className="goals">{m.goals.away ?? "—"}</span>
              </span>
              <span className="ltr-nums self-center text-xs text-red-700 night:text-red-300">{liveMinute(m.status) ?? "مباشر"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
