import { PageFreshness } from "@/components/client/PageFreshness";
import { EgyptSpotlight } from "@/components/home/EgyptSpotlight";
import { DataStatus, LastUpdated } from "@/components/ui/DataStatus";
import { qSettings } from "@/lib/admin/settings";
import { isEgyptianMatch } from "@/lib/football/grouping";
import { qFixturesByDate } from "@/lib/football/queries";
import { formatDateLong } from "@/lib/utils/format";
import { DateNavigator, DayTabs } from "./DayTabs";
import { LiveTicker } from "./LiveTicker";
import { MatchBoard } from "./MatchBoard";

/**
 * "جدول المباريات" block of one Cairo day: Cairo-time tab, grey head with the
 * title pill and the yesterday/today/tomorrow tabs, then the match cards
 * grouped by section and competition. Used by the home and /matches/* pages.
 */
export async function DayMatches({
  date,
  today,
  relativeTo,
  boardId,
  title,
  srTitle,
  headingLevel = 1,
  showDateNav = false,
  showTicker = false,
  showEgyptSpotlight = false,
  showOthers = true,
}: {
  date: string;
  /** Cairo "today" (for the day tabs). */
  today: string;
  /** Cairo "today" when the page is relative (today/yesterday/tomorrow). */
  relativeTo?: string;
  boardId: string;
  title: string;
  /** Extra text for screen readers / search engines appended to the title. */
  srTitle?: string;
  headingLevel?: 1 | 2;
  showDateNav?: boolean;
  showTicker?: boolean;
  showEgyptSpotlight?: boolean;
  showOthers?: boolean;
}) {
  const [result, settings] = await Promise.all([qFixturesByDate(date), qSettings()]);
  const matches = result.data ?? [];
  const live = matches.filter((m) => m.status.group === "live" || m.status.group === "interrupted");
  const hasEgyptian = matches.some(isEgyptianMatch);
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <>
      <PageFreshness hasLive={live.length > 0} pollSeconds={settings.livePollSeconds} pageDate={relativeTo} />
      {showTicker ? <LiveTicker matches={live.filter((m) => m.status.group === "live")} /> : null}
      <div className="ys-tz">
        <span>
          بتوقيت القاهرة · <time dateTime={date}>{formatDateLong(date)}</time>
        </span>
      </div>
      <section className="ys-block ys-fixture" aria-labelledby={`${boardId}-title`}>
        <div className="ys-block-head">
          <div className="ys-title-wrap">
            <Heading id={`${boardId}-title`} className="ys-pill ys-title">
              {title}
              {srTitle ? <span className="sr-only"> — {srTitle}</span> : null}
            </Heading>
          </div>
          <DayTabs today={today} active={date} />
        </div>
        {showDateNav ? <DateNavigator date={date} today={today} /> : null}
        <div className="ys-block-body ys-block-body--flush">
          <DataStatus result={result} subject="مباريات هذا اليوم" />
          {result.data !== null ? (
            <MatchBoard
              matches={matches}
              options={{
                id: boardId,
                showOthers: showOthers && settings.showOtherLeagues,
                hiddenLeagueIds: settings.hiddenLeagueIds,
                extraFeaturedLeagueIds: settings.extraFeaturedLeagueIds,
              }}
            />
          ) : null}
          <LastUpdated fetchedAt={result.fetchedAt} />
        </div>
      </section>
      {showEgyptSpotlight && !hasEgyptian && result.error?.kind !== "not_configured" ? <EgyptSpotlight /> : null}
    </>
  );
}
