import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DataStatus, LastUpdated } from "@/components/ui/DataStatus";
import { EntityHero } from "@/components/ui/EntityHero";
import { Section } from "@/components/ui/Section";
import { countryNameAr } from "@/data/countries";
import { positionLabelAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import { qPlayer, qPlayerSeasons } from "@/lib/football/queries";
import type { DataResult, PlayerProfile } from "@/lib/football/types";
import { NOINDEX, pageMetadata } from "@/lib/seo/metadata";
import { formatDateLong, formatNumber, formatSeason } from "@/lib/utils/format";
import { parseEntitySlug } from "@/lib/utils/slug";

async function loadPlayer(id: number): Promise<{ result: DataResult<PlayerProfile | null>; season: number | null }> {
  const seasons = await qPlayerSeasons(id);
  const season = seasons.data?.[0] ?? null;
  if (season === null) {
    return { result: { ...seasons, data: null }, season: null };
  }
  return { result: await qPlayer(id, season), season };
}

export async function generateMetadata({ params }: PageProps<"/players/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const id = parseEntitySlug(slug);
  if (!id) return { title: "لاعب غير موجود", robots: NOINDEX };
  const { result } = await loadPlayer(id);
  const p = result.data;
  if (!p) return { title: result.error && result.error.kind !== "not_found" ? "بيانات اللاعب غير متاحة حاليًا" : "لاعب غير موجود", robots: NOINDEX };
  const team = p.statistics[0]?.team;
  return pageMetadata({
    title: `${p.name}: الإحصائيات والمسيرة`,
    description: `بيانات اللاعب ${p.name}${p.nationality ? ` (${countryNameAr(p.nationality) ?? p.nationality})` : ""}${team ? ` لاعب ${displayName(team)}` : ""}: المباريات والأهداف والتمريرات الحاسمة والبطاقات في موسم ${p.season ? formatSeason(p.season) : ""} حسب مزود البيانات.`,
    path: `/players/${p.slug}`,
  });
}

/**
 * Unlisted params are rendered completely on their first request (then cached),
 * so crawlers always get full HTML and unknown ids return a real 404 status.
 */
export const ensureStatic = "navigation";

/** Placeholder sample (required by Cache Components). */
export function generateStaticParams() {
  return [{ slug: "player-0" }];
}

export default async function PlayerPage({ params }: PageProps<"/players/[slug]">) {
  const { slug } = await params;
  const id = parseEntitySlug(slug);
  if (!id) notFound();
  const { result, season } = await loadPlayer(id);
  const p = result.data;
  if (!p) {
    // No profile data → no empty page.
    if (!result.error || result.error.kind === "not_found") notFound();
    return (
      <section className="ys-block">
        <div className="ys-entry-head">
          <h1 className="ys-entry-title">بيانات اللاعب</h1>
        </div>
        <div className="ys-block-body">
          <DataStatus result={result} subject="بيانات اللاعب" />
        </div>
      </section>
    );
  }
  const facts: Array<[string, string | null]> = [
    ["الجنسية", p.nationality ? (countryNameAr(p.nationality) ?? p.nationality) : null],
    ["العمر", p.age !== null ? `${p.age} عامًا` : null],
    ["تاريخ الميلاد", p.birthDate ? formatDateLong(p.birthDate) : null],
    ["مكان الميلاد", [p.birthPlace, p.birthCountry ? (countryNameAr(p.birthCountry) ?? p.birthCountry) : null].filter(Boolean).join("، ") || null],
    ["الطول", p.height],
    ["الوزن", p.weight],
    ["المركز", positionLabelAr(p.statistics[0]?.position ?? null)],
  ];
  const shownFacts = facts.filter((f): f is [string, string] => Boolean(f[1]));
  return (
    <>
      <Breadcrumbs items={[{ name: p.name, path: `/players/${p.slug}` }]} />
      <EntityHero
        label="بطاقة اللاعب"
        logo={p.photo}
        logoName={p.name}
        rounded
        title={p.name}
        subtitle={p.injured ? <span className="rounded bg-rose-700 px-2 py-0.5 text-xs text-white">مصاب حسب مزود البيانات</span> : undefined}
      />
      {shownFacts.length ? (
        <Section id="profile" title="معلومات اللاعب" bodyClassName="ys-block-body">
          <div className="ys-info-table-wrap">
            <table className="ys-info-table">
              <tbody>
                {shownFacts.map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
      <DataStatus result={result} subject="بيانات اللاعب" />
      <Section id="stats" title={`إحصائيات موسم ${season ? formatSeason(season) : ""}`} subtitle="حسب مزود البيانات">
        {p.statistics.length ? (
          <div className="ys-table-wrap">
            <table className="ys-table">
              <caption className="sr-only">إحصائيات اللاعب حسب البطولة</caption>
              <thead>
                <tr>
                  <th scope="col" className="text-start">البطولة / الفريق</th>
                  <th scope="col" className="text-center">مباريات</th>
                  <th scope="col" className="hidden text-center sm:table-cell">دقائق</th>
                  <th scope="col" className="text-center">أهداف</th>
                  <th scope="col" className="text-center">صناعة</th>
                  <th scope="col" className="hidden text-center sm:table-cell">إنذارات</th>
                  <th scope="col" className="hidden text-center sm:table-cell">طرد</th>
                </tr>
              </thead>
              <tbody>
                {p.statistics.map((s, i) => (
                  <tr key={i}>
                    <td>
                      <span className="block">
                        {s.league ? (
                          <Link href={`/leagues/${s.league.slug}`} prefetch={false} className="hover:text-pitch-700">
                            {displayName(s.league)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </span>
                      {s.team ? (
                        <Link href={`/teams/${s.team.slug}`} prefetch={false} className="text-xs text-slate-500 hover:text-pitch-700">
                          {displayName(s.team)}
                        </Link>
                      ) : null}
                    </td>
                    <td className="text-center tabular-nums">{formatNumber(s.appearances)}</td>
                    <td className="hidden text-center tabular-nums sm:table-cell">{formatNumber(s.minutes)}</td>
                    <td className="text-center font-bold tabular-nums">{formatNumber(s.goals)}</td>
                    <td className="text-center tabular-nums">{formatNumber(s.assists)}</td>
                    <td className="hidden text-center tabular-nums sm:table-cell">{formatNumber(s.yellow)}</td>
                    <td className="hidden text-center tabular-nums sm:table-cell">{formatNumber(s.red)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-600">لا تتوفر إحصائيات لهذا الموسم.</p>
        )}
      </Section>
      <LastUpdated fetchedAt={result.fetchedAt} />
    </>
  );
}
