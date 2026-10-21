import { CalendarClock, History, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StandingsTable } from "@/components/league/StandingsTable";
import { MatchRow } from "@/components/matches/MatchRow";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DataStatus, LastUpdated } from "@/components/ui/DataStatus";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntityHero } from "@/components/ui/EntityHero";
import { JsonLd } from "@/components/ui/JsonLd";
import { Section } from "@/components/ui/Section";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { siteUrl } from "@/lib/env";
import { positionLabelAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import { currentSeasonOf, qSquad, qStandings, qTeam, qTeamCompetitions, qTeamFixtures } from "@/lib/football/queries";
import type { League, Match, SquadPlayer, Team } from "@/lib/football/types";
import { sportsTeamJsonLd } from "@/lib/seo/jsonld";
import { NOINDEX, pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatSeason } from "@/lib/utils/format";
import { parseEntitySlug } from "@/lib/utils/slug";

export async function teamMetadata(slug: string): Promise<Metadata> {
  const id = parseEntitySlug(slug);
  if (!id) return { title: "فريق غير موجود", robots: NOINDEX };
  const res = await qTeam(id);
  const t = res.data;
  if (!t) return { title: res.error && res.error.kind !== "not_found" ? "بيانات الفريق غير متاحة حاليًا" : "فريق غير موجود", robots: NOINDEX };
  const name = displayName(t);
  const country = t.countryAr ?? t.country ?? "";
  return pageMetadata({
    title: `${name}: المباريات والنتائج والترتيب`,
    description: `${t.national ? "منتخب" : "نادي"} ${name}${t.nameAr ? ` (${t.name})` : ""}${country ? ` من ${country}` : ""}: المباريات القادمة بتوقيت القاهرة، آخر النتائج، ترتيبه في الدوري، والبطولات التي يشارك فيها وقائمة اللاعبين.`,
    path: `/teams/${t.slug}`,
  });
}

/** The competition used for "season" context: domestic league first. */
function primaryCompetition(team: Team, comps: readonly League[]): { league: League; season: number } | null {
  const withSeason = comps
    .map((league) => ({ league, season: currentSeasonOf(league) }))
    .filter((x): x is { league: League; season: number } => x.season !== null);
  const domestic = withSeason.find((x) => x.league.type === "league" && x.league.country.name === team.country);
  return domestic ?? withSeason.find((x) => x.league.type === "league") ?? withSeason[0] ?? null;
}

function resultBadge(m: Match, teamId: number) {
  if (m.goals.home === null || m.goals.away === null) return null;
  const mine = m.home.id === teamId ? m.goals.home : m.goals.away;
  const theirs = m.home.id === teamId ? m.goals.away : m.goals.home;
  const r = mine > theirs ? "W" : mine < theirs ? "L" : "D";
  const map = { W: ["فوز", "bg-emerald-600"], D: ["تعادل", "bg-slate-400"], L: ["خسارة", "bg-rose-600"] } as const;
  return map[r];
}

async function FixturesSection({ team, season }: { team: Team; season: number }) {
  const res = await qTeamFixtures(team.id, season);
  const all = res.data ?? [];
  const last = all.filter((m) => m.status.group === "finished").sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
  const next = all.filter((m) => m.status.group === "upcoming" || m.status.group === "live").sort((a, b) => a.timestamp - b.timestamp).slice(0, 8);
  if (res.data === null) {
    return (
      <Section id="fixtures" title="المباريات">
        <div className="p-3">
          <DataStatus result={res} subject="مباريات الفريق" />
        </div>
      </Section>
    );
  }
  return (
    <>
      <DataStatus result={res} subject="مباريات الفريق" />
      <Section id="fixtures" title="المباريات القادمة">
        {next.length ? (
          <ul className="ys-matches ys-block-body ys-block-body--flush">
            {next.map((m) => (
              <MatchRow key={m.id} match={m} showDate highlightTeamId={team.id} size="sm" />
            ))}
          </ul>
        ) : (
          <EmptyState icon={CalendarClock} title="لا توجد مباريات قادمة مسجلة">لم يعلن مزود البيانات عن مباريات قادمة لهذا الفريق في الموسم الحالي.</EmptyState>
        )}
      </Section>
      <Section id="results" title="آخر النتائج">
        {last.length ? (
          <>
            <ul className="flex gap-1.5 px-3 pt-3" aria-label="ملخص آخر النتائج">
              {last.slice(0, 5).map((m) => {
                const badge = resultBadge(m, team.id);
                return badge ? (
                  <li key={m.id} className={cn("rounded-md px-2 py-0.5 text-xs text-white", badge[1])}>
                    {badge[0]}
                  </li>
                ) : null;
              })}
            </ul>
            <ul className="ys-matches ys-block-body ys-block-body--flush">
              {last.map((m) => (
                <MatchRow key={m.id} match={m} showDate highlightTeamId={team.id} size="sm" />
              ))}
            </ul>
          </>
        ) : (
          <EmptyState icon={History} title="لا توجد نتائج بعد">لم يلعب الفريق مباريات مسجلة في هذا الموسم حتى الآن.</EmptyState>
        )}
      </Section>
      <LastUpdated fetchedAt={res.fetchedAt} className="-mt-2" />
    </>
  );
}

async function StandingSection({ team, league, season }: { team: Team; league: League; season: number }) {
  if (league.type !== "league") return null;
  const res = await qStandings(league.id, season);
  const group = res.data?.groups.find((g) => g.rows.some((r) => r.team.id === team.id));
  if (!group) return null;
  return (
    <Section id="standing" title={`الترتيب في ${displayName(league)}`} action={{ href: `/leagues/${league.slug}#standings`, label: "الجدول كاملًا" }}>
      <StandingsTable group={group} compact highlightTeamIds={[team.id]} caption={`ترتيب ${displayName(league)}`} />
    </Section>
  );
}

const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];

async function SquadSection({ team }: { team: Team }) {
  const res = await qSquad(team.id);
  const players = res.data ?? [];
  const groups = new Map<string, SquadPlayer[]>();
  for (const p of players) {
    const key = p.position ?? "Other";
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  const ordered = [...groups.entries()].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a[0]);
    const ib = POSITION_ORDER.indexOf(b[0]);
    return (ia === -1 ? 9 : ia) - (ib === -1 ? 9 : ib);
  });
  if (res.data !== null && players.length === 0) {
    return (
      <Section id="squad" title="قائمة اللاعبين">
        <EmptyState icon={Users} title="قائمة اللاعبين غير متاحة">لا يوفر مزود البيانات قائمة لاعبين لهذا الفريق حاليًا.</EmptyState>
      </Section>
    );
  }
  return (
    <Section id="squad" title="قائمة اللاعبين" subtitle="حسب مزود البيانات وقد لا تعكس آخر الانتقالات">
      {players.length ? (
        <div className="ys-block-body space-y-3">
          {ordered.map(([pos, list]) => (
            <div key={pos}>
              <h3 className="ys-league-bar">{positionLabelAr(pos) ?? pos}</h3>
              <ul className="ys-grid [--ys-item:220px]">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link href={`/players/${p.slug}`} prefetch={false} className="ys-tile">
                      <TeamLogo src={p.photo} name={p.name} size={32} rounded />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{p.name}</span>
                        <span className="block text-xs text-slate-500">
                          {p.number !== null ? `رقم ${p.number}` : ""}
                          {p.number !== null && p.age !== null ? " · " : ""}
                          {p.age !== null ? `${p.age} عامًا` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3">
          <DataStatus result={res} subject="قائمة اللاعبين" />
        </div>
      )}
    </Section>
  );
}

export async function TeamView({ slug }: { slug: string }) {
  const id = parseEntitySlug(slug);
  if (!id) notFound();
  const res = await qTeam(id);
  const team = res.data;
  if (!team) {
    if (!res.error || res.error.kind === "not_found") notFound();
    return (
      <section className="ys-block">
        <div className="ys-entry-head">
          <h1 className="ys-entry-title">بيانات الفريق</h1>
        </div>
        <div className="ys-block-body">
          <DataStatus result={res} subject="بيانات الفريق" />
        </div>
      </section>
    );
  }
  const compsRes = await qTeamCompetitions(team.id);
  const comps = compsRes.data ?? [];
  const primary = primaryCompetition(team, comps);
  const name = displayName(team);

  const facts = [
    team.country ? `الدولة: ${team.countryAr ?? team.country}` : null,
    team.founded ? `التأسيس: ${team.founded}` : null,
    team.venue?.name
      ? `الملعب: ${team.venue.name}${team.venue.city ? ` — ${team.venue.city}` : ""}${team.venue.capacity ? ` (${formatNumber(team.venue.capacity)} متفرج)` : ""}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <Breadcrumbs items={[{ name, path: `/teams/${team.slug}` }]} />
      <EntityHero
        label="بطاقة الفريق"
        logo={team.logo}
        logoName={team.name}
        title={name}
        subtitle={
          team.nameAr ? (
            <span lang="en" dir="ltr">
              {team.name}
            </span>
          ) : undefined
        }
        meta={facts.length ? facts.map((f) => <span key={f}>{f}</span>) : undefined}
      />
      <DataStatus result={res} subject="بيانات الفريق" />

      {comps.length ? (
        <Section id="competitions" title="البطولات هذا الموسم">
          <ul className="flex flex-wrap gap-2 p-3">
            {comps.map((l) => (
              <li key={l.id}>
                <Link href={`/leagues/${l.slug}`} prefetch={false} className="ys-chip">
                  <TeamLogo src={l.logo} name={l.name} size={18} />
                  {displayName(l)}
                  {currentSeasonOf(l) ? <span className="text-xs text-slate-500">{formatSeason(currentSeasonOf(l) as number)}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : (
        <DataStatus result={compsRes} subject="بطولات الفريق" />
      )}

      {primary ? (
        <>
          <Suspense fallback={<ListSkeleton rows={6} label="جارٍ تحميل المباريات…" />}>
            <FixturesSection team={team} season={primary.season} />
          </Suspense>
          <Suspense fallback={<ListSkeleton rows={6} label="جارٍ تحميل الترتيب…" />}>
            <StandingSection team={team} league={primary.league} season={primary.season} />
          </Suspense>
        </>
      ) : compsRes.data !== null ? (
        <div className="ys-block">
          <EmptyState icon={CalendarClock} title="لا توجد بطولات جارية">لا يشارك الفريق حاليًا في بطولات جارية لدى مزود البيانات.</EmptyState>
        </div>
      ) : null}

      <Suspense fallback={<ListSkeleton rows={6} label="جارٍ تحميل قائمة اللاعبين…" />}>
        <SquadSection team={team} />
      </Suspense>
      <JsonLd data={sportsTeamJsonLd(siteUrl(), team)} />
    </>
  );
}
