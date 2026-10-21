import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SearchBox } from "@/components/client/SearchBox";
import { MatchRow } from "@/components/matches/MatchRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { displayName } from "@/lib/football/names";
import { sanitizeQuery, searchFootball } from "@/lib/football/search";

export const metadata: Metadata = {
  title: "البحث عن فريق أو بطولة أو لاعب",
  description: "ابحث بالعربية أو الإنجليزية عن الأندية والمنتخبات والبطولات واللاعبين ومباريات اليوم.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

const SUGGESTED = ["الأهلي", "الزمالك", "بيراميدز", "الإسماعيلي", "المصري", "الاتحاد السكندري", "سيراميكا كليوباترا", "الدوري المصري", "كأس مصر"];

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  // Search results are per request (never prerendered or prefetched).
  await connection();
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = sanitizeQuery(raw);
  if (!q) {
    return (
      <Section id="suggested" title="عمليات بحث مقترحة" bodyClassName="ys-block-body">
        <ul className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <li key={s}>
              <Link href={`/search?q=${encodeURIComponent(s)}`} className="ys-chip">
                {s}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    );
  }
  if (q.length < 2) {
    return <p className="ys-block p-4 text-sm text-slate-600">اكتب حرفين على الأقل للبحث.</p>;
  }
  const r = await searchFootball(q, { allowProvider: true });
  const total = r.teams.length + r.leagues.length + r.players.length + r.matches.length;
  if (total === 0) {
    return (
      <div className="ys-block">
        <EmptyState icon={SearchX} title={`لا توجد نتائج لـ «${q}»`}>
          <p>جرّب كتابة الاسم بطريقة أخرى (مثل «الاهلي» أو «Al Ahly»)، أو ابحث باسم البطولة أو الدولة.</p>
          {!r.providerSearched ? <p className="mt-1">البحث في قاعدة مزود البيانات متاح للأسماء اللاتينية (3 أحرف فأكثر).</p> : null}
        </EmptyState>
      </div>
    );
  }
  return (
    <>
      <p className="mb-3 text-sm text-slate-600" aria-live="polite">
        نتائج البحث عن «{q}»: {total}
      </p>
      {r.teams.length ? (
        <Section id="teams" title="الأندية والمنتخبات">
          <ul className="ys-grid ys-block-body [--ys-item:260px]">
            {r.teams.map((t) => (
              <li key={t.id}>
                <Link href={`/teams/${t.slug}`} className="ys-tile">
                  <TeamLogo src={t.logo} name={t.name} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate">{displayName(t)}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {t.nameAr ? `${t.name} · ` : ""}
                      {t.countryAr ?? t.country ?? ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {r.leagues.length ? (
        <Section id="leagues" title="البطولات">
          <ul className="ys-grid ys-block-body [--ys-item:260px]">
            {r.leagues.map((l) => (
              <li key={l.id}>
                <Link href={`/leagues/${l.slug}`} className="ys-tile">
                  <TeamLogo src={l.logo} name={l.name} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate">{displayName(l)}</span>
                    <span className="block truncate text-xs text-slate-500">{l.countryAr ?? l.country ?? ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {r.matches.length ? (
        <Section id="matches" title="مباريات قريبة (أمس واليوم وغدًا)">
          <ul className="ys-matches ys-block-body ys-block-body--flush">
            {r.matches.map((m) => (
              <MatchRow key={m.id} match={m} showDate size="sm" />
            ))}
          </ul>
        </Section>
      ) : null}
      {r.players.length ? (
        <Section id="players" title="اللاعبون">
          <ul className="ys-grid ys-block-body [--ys-item:260px]">
            {r.players.map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.slug}`} className="ys-tile">
                  <TeamLogo src={p.photo} name={p.name} size={30} rounded />
                  <span className="min-w-0">
                    <span className="block truncate">{p.name}</span>
                    {p.teamName ? <span className="block truncate text-xs text-slate-500">{p.teamName}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

async function SearchContent({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (
    <>
      <section className="ys-block" aria-labelledby="search-title">
        <div className="ys-block-head">
          <h1 id="search-title" className="ys-pill ys-pill--main">
            البحث
          </h1>
        </div>
        <div className="ys-block-body">
          <SearchBox defaultValue={sanitizeQuery(raw)} />
        </div>
      </section>
      <Suspense fallback={<ListSkeleton rows={5} label="جارٍ البحث…" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} label="جارٍ تحميل البحث…" />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}
