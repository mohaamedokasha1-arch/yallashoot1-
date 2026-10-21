import { BarChart3, ListOrdered, Shirt } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageFreshness } from "@/components/client/PageFreshness";
import { EventsTimeline } from "@/components/match/EventsTimeline";
import { Lineups } from "@/components/match/Lineups";
import { MatchInfoTable, matchParagraphs } from "@/components/match/MatchInfo";
import { MatchTabs } from "@/components/match/MatchTabs";
import { MatchHeader } from "@/components/match/MatchHeader";
import { BroadcastSection, HeadToHeadSection, MatchStandingsSection, TeamsFormSection } from "@/components/match/MatchSections";
import { StatsBars } from "@/components/match/StatsBars";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DataStatus, LastUpdated } from "@/components/ui/DataStatus";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/ui/JsonLd";
import { Section } from "@/components/ui/Section";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { qSettings } from "@/lib/admin/settings";
import { siteUrl } from "@/lib/env";
import { roundLabelAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import { qMatch } from "@/lib/football/queries";
import { hasScore, statusLabel } from "@/lib/football/status";
import type { MatchDetails } from "@/lib/football/types";
import { sportsEventJsonLd } from "@/lib/seo/jsonld";
import { NOINDEX, pageMetadata } from "@/lib/seo/metadata";
import { formatCairoTime, formatDateLong } from "@/lib/utils/format";
import { parseEntitySlug } from "@/lib/utils/slug";

/**
 * Unlisted params are rendered completely on their first request (then cached),
 * so crawlers always get full HTML and unknown ids return a real 404 status.
 */
export const ensureStatic = "navigation";

/**
 * Cache Components requires at least one sample param. A placeholder keeps
 * builds from spending provider requests; real match pages are rendered on
 * their first request and then cached/revalidated (ISR-style).
 */
export function generateStaticParams() {
  return [{ slug: "match-0" }];
}

function describe(m: MatchDetails): { title: string; description: string } {
  const home = displayName(m.home);
  const away = displayName(m.away);
  const league = displayName(m.league);
  const date = formatDateLong(m.cairoDate);
  const round = roundLabelAr(m.league.round);
  const venue = m.venue?.name ? ` على ${m.venue.name}${m.venue.city ? ` في ${m.venue.city}` : ""}` : "";
  if (m.status.group === "finished" && hasScore(m)) {
    return {
      title: `نتيجة مباراة ${home} و${away} - ${league}`,
      description: `انتهت مباراة ${home} و${away} بنتيجة ${m.goals.home}-${m.goals.away} في ${league}${round ? ` (${round})` : ""} يوم ${date}${venue}. الأهداف والبطاقات والتشكيل والإحصائيات.`,
    };
  }
  if (m.status.group === "live") {
    return {
      title: `${home} ضد ${away} مباشر - ${league}`,
      description: `متابعة نتيجة مباراة ${home} و${away} لحظة بلحظة في ${league}${round ? ` (${round})` : ""} يوم ${date}${venue}: الأحداث والتشكيل والإحصائيات دون بث مباشر.`,
    };
  }
  if (m.status.group === "upcoming") {
    const time = m.status.code === "TBD" ? "" : ` الساعة ${formatCairoTime(m.kickoff)} بتوقيت القاهرة`;
    return {
      title: `موعد مباراة ${home} و${away} - ${league}`,
      description: `موعد مباراة ${home} ضد ${away} في ${league}${round ? ` (${round})` : ""} يوم ${date}${time}${venue}، مع المواجهات السابقة وترتيب الفريقين.`,
    };
  }
  return {
    title: `مباراة ${home} و${away} - ${league}`,
    description: `مباراة ${home} و${away} في ${league} يوم ${date}: الحالة الحالية ${statusLabel(m.status)} حسب مزود البيانات.`,
  };
}

export async function generateMetadata({ params }: PageProps<"/matches/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const id = parseEntitySlug(slug);
  if (!id) return { title: "مباراة غير موجودة", robots: NOINDEX };
  const res = await qMatch(id);
  const m = res.data;
  if (!m) return { title: res.error && res.error.kind !== "not_found" ? "تفاصيل المباراة غير متاحة حاليًا" : "مباراة غير موجودة", robots: NOINDEX };
  const { title, description } = describe(m);
  return pageMetadata({ title, description, path: `/matches/${m.slug}` });
}

export default async function MatchPage({ params }: PageProps<"/matches/[slug]">) {
  const { slug } = await params;
  const id = parseEntitySlug(slug);
  if (!id) notFound();
  const [res, settings] = await Promise.all([qMatch(id), qSettings()]);
  const m = res.data;
  if (!m) {
    if (!res.error || res.error.kind === "not_found") notFound();
    return (
      <section className="ys-block">
        <div className="ys-entry-head">
          <h1 className="ys-entry-title">تفاصيل المباراة</h1>
        </div>
        <div className="ys-block-body">
          <DataStatus result={res} subject="تفاصيل المباراة" />
        </div>
      </section>
    );
  }

  const home = displayName(m.home);
  const away = displayName(m.away);
  const started = m.status.group === "live" || m.status.group === "finished" || m.status.group === "interrupted";

  const details = (
    <div className="ys-details">
      {matchParagraphs(m).map((text, i) => (
        <p key={i}>{text}</p>
      ))}
    </div>
  );

  const lineups =
    m.lineups && m.lineups.length ? (
      <Lineups lineups={m.lineups} home={m.home} away={m.away} />
    ) : (
      <EmptyState icon={Shirt} title="التشكيل غير متاح">
        {started
          ? "لم يوفر مزود البيانات التشكيلة لهذه المباراة."
          : "يُعلن التشكيل عادةً قبل انطلاق المباراة بنحو ساعة، وسيظهر هنا عند توفره من مزود البيانات."}
      </EmptyState>
    );

  const events =
    m.events && m.events.length ? (
      <EventsTimeline events={m.events} home={m.home} away={m.away} />
    ) : (
      <EmptyState icon={ListOrdered} title={started ? "لا توجد أحداث مسجلة" : "لم تبدأ المباراة بعد"}>
        {started
          ? "لم يُرسل مزود البيانات أحداثًا (أهداف/بطاقات/تبديلات) لهذه المباراة، أو أن التغطية لا تشمل الأحداث لهذه البطولة."
          : "تظهر الأهداف والبطاقات والتبديلات هنا عند انطلاق المباراة إذا كانت التغطية متاحة."}
      </EmptyState>
    );

  return (
    <>
      <PageFreshness hasLive={m.status.group === "live" || m.status.group === "interrupted"} pollSeconds={settings.livePollSeconds} />
      <Breadcrumbs
        items={[
          { name: displayName(m.league), path: `/leagues/${m.league.slug}` },
          { name: `${home} ضد ${away}`, path: `/matches/${m.slug}` },
        ]}
      />
      <MatchHeader match={m} />
      <DataStatus result={res} subject="تفاصيل المباراة" />

      <article className="ys-block" aria-labelledby="match-title">
        <header className="ys-entry-head">
          <h1 id="match-title" className="ys-entry-title">
            {home} ضد {away}
          </h1>
          <p className="ys-entry-meta">
            {displayName(m.league)} — {formatDateLong(m.cairoDate)}
            {m.status.code !== "TBD" ? ` — ${formatCairoTime(m.kickoff)} بتوقيت القاهرة` : ""}
          </p>
        </header>
        <div className="ys-block-body">
          <MatchTabs details={details} lineups={lineups} events={events} />
          <MatchInfoTable match={m} />
          <LastUpdated fetchedAt={res.fetchedAt} className="mt-3 mb-0" />
        </div>
      </article>

      <Section id="stats" title="إحصائيات المباراة">
        {m.statistics && m.statistics.length ? (
          <StatsBars stats={m.statistics} />
        ) : (
          <EmptyState icon={BarChart3} title="الإحصائيات غير متاحة">
            {started ? "لا تتوفر إحصائيات لهذه المباراة لدى مزود البيانات." : "تظهر الإحصائيات بعد انطلاق المباراة إذا كانت التغطية متاحة."}
          </EmptyState>
        )}
      </Section>

      <Suspense fallback={null}>
        <BroadcastSection match={m} />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={4} label="جارٍ تحميل المواجهات المباشرة…" />}>
        <HeadToHeadSection match={m} />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={4} label="جارٍ تحميل مباريات الفريقين…" />}>
        <TeamsFormSection match={m} />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={4} label="جارٍ تحميل الترتيب…" />}>
        <MatchStandingsSection match={m} />
      </Suspense>

      <JsonLd data={sportsEventJsonLd(siteUrl(), m)} />
    </>
  );
}
