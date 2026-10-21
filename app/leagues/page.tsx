import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListFilter } from "@/components/client/ListFilter";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DataStatus, LastUpdated } from "@/components/ui/DataStatus";
import { Notice } from "@/components/ui/Notice";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { COMPETITIONS } from "@/data/competitions";
import { ARAB_COUNTRIES, countryNameAr } from "@/data/countries";
import { competitionPath, featuredCompetitionsByRegion } from "@/lib/football/featured";
import { qLeagues } from "@/lib/football/queries";
import type { League } from "@/lib/football/types";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = pageMetadata({
  title: "كل البطولات والدوريات",
  description:
    "دليل البطولات والدوريات المتاحة لدى مزود البيانات: الدوري المصري وكأس مصر والبطولات الإفريقية، والدوريات الأوروبية والعربية والدولية، مع البحث حسب الدولة والاسم.",
  path: "/leagues",
});

function countryRank(country: string): number {
  if (country === "Egypt") return 0;
  if (country === "World") return 1;
  if (ARAB_COUNTRIES.has(country)) return 2;
  if (country === "England") return 3;
  return 4;
}

function groupByCountry(leagues: readonly League[]) {
  const map = new Map<string, League[]>();
  for (const l of leagues) {
    const list = map.get(l.country.name) ?? [];
    list.push(l);
    map.set(l.country.name, list);
  }
  return [...map.entries()]
    .map(([country, list]) => ({
      country,
      countryAr: country === "World" ? "بطولات دولية وقارية" : (countryNameAr(country) ?? country),
      flag: list[0]?.country.flag ?? null,
      leagues: list.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "league" ? -1 : 1)),
    }))
    .sort((a, b) => countryRank(a.country) - countryRank(b.country) || a.countryAr.localeCompare(b.countryAr, "ar"));
}

export default async function LeaguesPage() {
  const res = await qLeagues();
  const featured = featuredCompetitionsByRegion();
  const groups = res.data ? groupByCountry(res.data) : [];
  const available = new Set((res.data ?? []).map((l) => l.id));

  return (
    <>
      <Breadcrumbs items={[{ name: "البطولات", path: "/leagues" }]} />
      <section className="ys-block" aria-labelledby="leagues-title">
        <div className="ys-block-head">
          <h1 id="leagues-title" className="ys-pill ys-pill--main">
            كل البطولات والدوريات
          </h1>
        </div>
        <div className="ys-block-body">
          <p className="mb-3 text-sm leading-7 text-slate-600">
            البطولات المصرية أولًا، ثم أهم البطولات حسب المنطقة، ثم كل البطولات الجارية التي يوفرها مزود البيانات مرتبة حسب الدولة.
          </p>
          <Notice variant="info">
            تعتمد التغطية على مزود البيانات وباقة الاشتراك: بعض البطولات لا تتوفر لها جداول ترتيب أو تشكيلات أو أحداث تفصيلية، ولا
            ندّعي تغطية كاملة لأي بطولة لا يوفرها المزود.
          </Notice>
          <ListFilter targetId="leagues-directory" label="ابحث عن بطولة أو دولة" placeholder="مثال: الدوري المصري، كأس مصر، Premier League" />
        </div>
      </section>

      <div id="leagues-directory">
        {featured.map((g) => (
          <section key={g.region} data-filter-group className="ys-block" aria-labelledby={`region-${g.region}`}>
            <div className="ys-block-head">
              <h2 id={`region-${g.region}`} className={cn("ys-pill", g.region === "egypt" && "ys-pill--main")}>
                {g.label}
              </h2>
            </div>
            <ul className="ys-grid ys-block-body [--ys-item:240px]">
              {g.items.map((c) => (
                <li key={c.id} data-filter-text={`${c.nameAr} ${c.apiName} ${c.apiCountry} ${countryNameAr(c.apiCountry) ?? ""}`}>
                  <Link href={competitionPath(c)} className="ys-tile">
                    <TeamLogo src={`https://media.api-sports.io/football/leagues/${c.id}.png`} name={c.apiName} size={26} />
                    <span className="name flex-1">{c.nameAr}</span>
                    {res.data && !available.has(c.id) ? <span className="shrink-0 text-[10px] text-slate-500">غير جارية حاليًا</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="all-leagues" className="ys-block">
          <div className="ys-block-head">
            <div className="ys-block-titles">
              <h2 id="all-leagues" className="ys-pill">
                كل البطولات الجارية لدى مزود البيانات
              </h2>
              {res.data ? <span className="ys-block-sub">({res.data.length} بطولة)</span> : null}
            </div>
          </div>
          <div className="ys-block-body">
            <DataStatus result={res} subject="قائمة البطولات" />
            {groups.map((g) => (
              <details key={g.country} data-filter-group className="ys-others" open={g.country === "Egypt"}>
                <summary>
                  <span className="flex min-w-0 items-center gap-2">
                    {g.flag ? <TeamLogo src={g.flag} name={g.country} size={20} /> : null}
                    <span className="truncate">{g.countryAr}</span>
                    <span className="text-xs text-slate-500">({g.leagues.length})</span>
                  </span>
                  <ChevronDown aria-hidden="true" className="chevron size-4 shrink-0 transition-transform" />
                </summary>
                <ul className="ys-grid p-3 [--ys-item:220px]">
                  {g.leagues.map((l) => (
                    <li key={l.id} data-filter-text={`${l.nameAr ?? ""} ${l.name} ${g.countryAr} ${g.country}`}>
                      <Link href={`/leagues/${l.slug}`} prefetch={false} className="ys-tile">
                        <TeamLogo src={l.logo} name={l.name} size={22} />
                        <span className="name">{l.nameAr ?? l.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            <LastUpdated fetchedAt={res.fetchedAt} />
            <p className="text-xs text-slate-500">عدد البطولات في السجل الداخلي ذي الأسماء العربية: {COMPETITIONS.length}.</p>
          </div>
        </section>
      </div>
    </>
  );
}
