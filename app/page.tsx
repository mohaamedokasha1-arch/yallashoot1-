import type { Metadata } from "next";
import { NewsWidget } from "@/components/home/NewsWidget";
import { NotableTeams, QuickLeagues } from "@/components/home/QuickLinks";
import { SiteGuide } from "@/components/home/SiteGuide";
import { StandingsWidget } from "@/components/home/StandingsWidget";
import { DayMatches } from "@/components/matches/DayMatches";
import { JsonLd } from "@/components/ui/JsonLd";
import { siteUrl } from "@/lib/env";
import { EGYPT_PREMIER_LEAGUE_ID } from "@/lib/football/featured";
import { qToday } from "@/lib/football/queries";
import { websiteJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { SITE } from "@/lib/site";
import { formatDateLong } from "@/lib/utils/format";

export const metadata: Metadata = pageMetadata({
  title: SITE.title,
  absoluteTitle: true,
  description: SITE.description,
  path: "/",
});

/**
 * Home: "جدول المباريات" (today's matches with the yesterday/today/tomorrow
 * tabs), latest news, the Egyptian league table, quick links and the site text.
 */
export default async function HomePage() {
  const today = await qToday();
  return (
    <>
      <DayMatches
        date={today}
        today={today}
        relativeTo={today}
        boardId="home"
        title="جدول المباريات"
        srTitle={`مباريات اليوم ${formatDateLong(today)} بتوقيت القاهرة`}
        showTicker
        showEgyptSpotlight
      />
      <NewsWidget />
      <StandingsWidget leagueId={EGYPT_PREMIER_LEAGUE_ID} />
      <QuickLeagues />
      <NotableTeams />
      <SiteGuide />
      <JsonLd data={websiteJsonLd(siteUrl())} />
    </>
  );
}
