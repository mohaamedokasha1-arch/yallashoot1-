import { CalendarClock, Check, History, Trophy, Users, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageFreshness } from "@/components/client/PageFreshness";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DataStatus, LastUpdated } from "@/components/ui/DataStatus";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntityHero } from "@/components/ui/EntityHero";
import { Notice } from "@/components/ui/Notice";
import { Section } from "@/components/ui/Section";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { competitionById } from "@/data/competitions";
import { qSettings } from "@/lib/admin/settings";
import { displayName } from "@/lib/football/names";
import { currentSeasonOf, qLeague, qLeagueFixtures, qStandings, qTopScorers } from "@/lib/football/queries";
import type { League, LeagueSeason, TeamRef } from "@/lib/football/types";
import { NOINDEX, pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils/cn";
import { formatDateLong, formatSeason, teamsCount } from "@/lib/utils/format";
import { parseEntitySlug } from "@/lib/utils/slug";
import { MatchesByDate, TeamsGrid, TopScorersTable } from "./LeagueParts";
import { StandingsTable } from "./StandingsTable";

function seasonLabel(league: League, year: number): string {
  const s = league.seasons.find((x) => x.year === year);
  return formatSeason(year, s?.start, s?.end);
}

export function leaguePath(league: Pick<League, "slug">, season?: number | null, current?: number | null): string {
  return season && season !== current ? `/leagues/${league.slug}/${season}` : `/leagues/${league.slug}`;
}

export async function leagueMetadata(slug: string, seasonParam?: number | null): Promise<Metadata> {
  const id = parseEntitySlug(slug);
  if (!id) return { title: "بطولة غير موجودة", robots: NOINDEX };
  const res = await qLeague(id);
  const league = res.data;
  if (!league) return { title: res.error && res.error.kind !== "not_found" ? "البطولة غير متاحة حاليًا" : "بطولة غير موجودة", robots: NOINDEX };
  const current = currentSeasonOf(league);
  const season = seasonParam ?? current;
  if (seasonParam && !league.seasons.some((s) => s.year === seasonParam)) return { title: "موسم غير موجود", robots: NOINDEX };
  const name = displayName(league);
  const label = season ? seasonLabel(league, season) : "";
  const where = league.country.name === "World" ? "" : ` (${league.country.nameAr ?? league.country.name})`;
  return pageMetadata({
    title: `${name}${where} ${label ? `موسم ${label}` : ""}: الترتيب والنتائج والمواعيد`,
    description: `${name}${where}${label ? ` موسم ${label}` : ""}: جدول الترتيب، نتائج آخر المباريات، المباريات القادمة بتوقيت القاهرة، الهدافون والفرق المشاركة من مزود بيانات رياضي.`,
    path: leaguePath(league, season, current),
  });
}

function CoverageList({ season }: { season: LeagueSeason }) {
  const items: Array<[string, boolean]> = [
    ["جدول الترتيب", season.coverage.standings],
    ["أحداث المباريات", season.coverage.events],
    ["التشكيلات", season.coverage.lineups],
    ["إحصائيات المباريات", season.coverage.statistics],
    ["الهدافون", season.coverage.topScorers],
  ];
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map(([label, ok]) => (
        <li key={label} className={cn("ys-chip", ok ? "text-emerald-800" : "text-slate-500")}>
          {ok ? <Check aria-hidden="true" className="size-3.5" /> : <X aria-hidden="true" className="size-3.5" />}
          <span>
            {label}
            <span className="sr-only">{ok ? " (متاح)" : " (غير متاح)"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

async function StandingsBlock({ league, season, past }: { league: League; season: number; past: boolean }) {
  const res = await qStandings(league.id, season, past);
  const groups = res.data?.groups ?? [];
  return (
    <Section id="standings" title="جدول الترتيب" subtitle={`موسم ${seasonLabel(league, season)}`}>
      {groups.length ? (
        <div>
          {groups.map((g, i) => (
            <div key={g.name ?? i}>
              {groups.length > 1 && g.name ? <h3 className="ys-league-bar m-3 mb-0">{g.name}</h3> : null}
              <StandingsTable group={g} caption={`ترتيب ${displayName(league)}${g.name ? ` - ${g.name}` : ""}`} />
            </div>
          ))}
          <div className="px-3 pt-3">
            <LastUpdated fetchedAt={res.fetchedAt} />
          </div>
        </div>
      ) : res.error ? (
        <div className="p-3">
          <DataStatus result={res} subject="جدول الترتيب" />
        </div>
      ) : (
        <EmptyState icon={Trophy} title="لا يوجد جدول ترتيب">
          لا يوفر مزود البيانات جدول ترتيب لهذا الموسم (قد تكون البطولة بنظام خروج المغلوب أو لم تبدأ بعد).
        </EmptyState>
      )}
    </Section>
  );
}

async function FixturesBlocks({ league, season, past }: { league: League; season: number; past: boolean }) {
  const [res, settings] = await Promise.all([qLeagueFixtures(league.id, season, past), qSettings()]);
  const all = res.data ?? [];
  const upcoming = all.filter((m) => m.status.group === "upcoming" || m.status.group === "live").sort((a, b) => a.timestamp - b.timestamp).slice(0, 12);
  const results = all.filter((m) => m.status.group === "finished").sort((a, b) => b.timestamp - a.timestamp).slice(0, 12);
  const other = all.filter((m) => m.status.group === "postponed" || m.status.group === "cancelled" || m.status.group === "interrupted").slice(0, 10);
  const teams = new Map<number, TeamRef>();
  for (const m of all) {
    teams.set(m.home.id, m.home);
    teams.set(m.away.id, m.away);
  }
  const teamList = [...teams.values()].sort((a, b) => displayName(a).localeCompare(displayName(b), "ar"));
  const hasLive = all.some((m) => m.status.group === "live");

  if (res.data === null) {
    return (
      <Section id="fixtures" title="المباريات">
        <div className="p-3">
          <DataStatus result={res} subject="مباريات البطولة" />
        </div>
      </Section>
    );
  }
  return (
    <>
      <PageFreshness hasLive={hasLive} pollSeconds={settings.livePollSeconds} />
      <DataStatus result={res} subject="مباريات البطولة" />
      <Section id="fixtures" title="المباريات القادمة">
        {upcoming.length ? (
          <MatchesByDate matches={upcoming} />
        ) : (
          <EmptyState icon={CalendarClock} title="لا توجد مباريات قادمة">
            {past ? "هذا موسم منتهٍ." : "لم يعلن مزود البيانات عن مباريات قادمة لهذه البطولة حاليًا."}
          </EmptyState>
        )}
      </Section>
      <Section id="results" title="أحدث النتائج">
        {results.length ? (
          <MatchesByDate matches={results} />
        ) : (
          <EmptyState icon={History} title="لا توجد نتائج بعد">لم تُلعب أي مباراة في هذا الموسم حتى الآن.</EmptyState>
        )}
      </Section>
      {other.length ? (
        <Section id="changes" title="مباريات مؤجلة أو ملغاة أو متوقفة">
          <MatchesByDate matches={other} />
        </Section>
      ) : null}
      <Section id="teams" title="الفرق المشاركة" subtitle={teamList.length ? teamsCount(teamList.length) : undefined}>
        {teamList.length ? (
          <TeamsGrid teams={teamList} />
        ) : (
          <EmptyState icon={Users} title="لا تتوفر قائمة الفرق">ستظهر الفرق عند توفر مباريات الموسم لدى مزود البيانات.</EmptyState>
        )}
      </Section>
      <LastUpdated fetchedAt={res.fetchedAt} className="-mt-2" />
    </>
  );
}

async function ScorersBlock({ league, season, past }: { league: League; season: number; past: boolean }) {
  const res = await qTopScorers(league.id, season, past);
  const list = (res.data ?? []).slice(0, 15);
  if (res.data !== null && list.length === 0) return null;
  return (
    <Section id="scorers" title="ترتيب الهدافين">
      {list.length ? (
        <TopScorersTable scorers={list} />
      ) : (
        <div className="p-3">
          <DataStatus result={res} subject="قائمة الهدافين" />
        </div>
      )}
    </Section>
  );
}

export async function LeagueView({ slug, seasonParam }: { slug: string; seasonParam?: number | null }) {
  const id = parseEntitySlug(slug);
  if (!id) notFound();
  const res = await qLeague(id);
  const league = res.data;
  if (!league) {
    if (!res.error || res.error.kind === "not_found") notFound();
    const entry = competitionById(id);
    return (
      <section className="ys-block">
        <div className="ys-entry-head">
          <h1 className="ys-entry-title">{entry?.nameAr ?? "البطولة"}</h1>
        </div>
        <div className="ys-block-body">
          <DataStatus result={res} subject="بيانات البطولة" />
        </div>
      </section>
    );
  }
  const current = currentSeasonOf(league);
  if (seasonParam && !league.seasons.some((s) => s.year === seasonParam)) notFound();
  const season = seasonParam ?? current;
  const seasonInfo = league.seasons.find((s) => s.year === season) ?? null;
  const past = season !== null && current !== null && season < current;
  const name = displayName(league);
  const country = league.country.name === "World" ? "بطولة دولية/قارية" : (league.country.nameAr ?? league.country.name);
  const entry = competitionById(league.id);

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "البطولات", path: "/leagues" },
          { name, path: leaguePath(league, season, current) },
        ]}
      />
      <EntityHero
        label="بطاقة البطولة"
        logo={league.logo}
        logoName={league.name}
        title={name}
        subtitle={season ? `موسم ${seasonLabel(league, season)}` : undefined}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {league.country.flag ? <TeamLogo src={league.country.flag} name={league.country.name} size={16} /> : null}
              {country}
            </span>
            {league.nameAr ? (
              <span lang="en" dir="ltr">
                {league.name}
              </span>
            ) : null}
            <span>{league.type === "cup" ? "كأس" : league.type === "league" ? "دوري" : "بطولة"}</span>
          </>
        }
      />

      <Section id="about-league" title="نبذة عن البطولة" bodyClassName="ys-block-body space-y-3 text-sm leading-7">
        <p>
          {name}
          {league.nameAr ? ` (${league.name})` : ""} {league.type === "cup" ? "بطولة كأس" : "مسابقة دوري"}{" "}
          {league.country.name === "World" ? "دولية أو قارية" : `في ${league.country.nameAr ?? league.country.name}`}.
          {seasonInfo?.start && seasonInfo?.end
            ? ` يمتد موسم ${seasonLabel(league, seasonInfo.year)} من ${formatDateLong(seasonInfo.start)} إلى ${formatDateLong(seasonInfo.end)} وفق مزود البيانات.`
            : ""}{" "}
          تعرض هذه الصفحة الترتيب والنتائج والمواعيد بتوقيت القاهرة كما يوفرها مزود البيانات، دون أي تعديل يدوي على النتائج.
        </p>
        {seasonInfo ? (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500">التغطية المتاحة لهذا الموسم لدى مزود البيانات:</p>
            <CoverageList season={seasonInfo} />
          </div>
        ) : null}
        {entry?.idSource === "unverified" ? (
          <Notice variant="info">تُطابَق هذه البطولة مع سجل البطولات الداخلي، ويتم التحقق من بياناتها عبر لوحة الإدارة.</Notice>
        ) : null}
        {league.seasons.length > 1 ? (
          <nav aria-label="مواسم البطولة" className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">المواسم:</span>
            {league.seasons.slice(0, 8).map((s) => (
              <Link
                key={s.year}
                href={leaguePath(league, s.year, current)}
                aria-current={s.year === season ? "page" : undefined}
                className={cn("ys-pill ys-pill--sm", s.year === season && "ys-pill--main")}
              >
                {formatSeason(s.year, s.start, s.end)}
              </Link>
            ))}
          </nav>
        ) : null}
      </Section>

      <DataStatus result={res} subject="بيانات البطولة" />

      {season ? (
        <>
          <Suspense fallback={<ListSkeleton rows={8} label="جارٍ تحميل جدول الترتيب…" />}>
            <StandingsBlock league={league} season={season} past={past} />
          </Suspense>
          <Suspense fallback={<ListSkeleton rows={8} label="جارٍ تحميل المباريات…" />}>
            <FixturesBlocks league={league} season={season} past={past} />
          </Suspense>
          <Suspense fallback={<ListSkeleton rows={5} label="جارٍ تحميل الهدافين…" />}>
            <ScorersBlock league={league} season={season} past={past} />
          </Suspense>
        </>
      ) : (
        <Notice variant="info">لا تتوفر مواسم لهذه البطولة لدى مزود البيانات.</Notice>
      )}
    </>
  );
}
