import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeagueView, leagueMetadata } from "@/components/league/LeagueView";
import { NOINDEX } from "@/lib/seo/metadata";
import { parseSeason } from "@/lib/utils/slug";

/**
 * Unlisted params are rendered completely on their first request (then cached),
 * so crawlers always get full HTML and unknown ids return a real 404 status.
 */
export const ensureStatic = "navigation";

/** Placeholder sample (required by Cache Components). */
export function generateStaticParams() {
  return [{ slug: "league-0", season: "0000" }];
}

export async function generateMetadata({ params }: PageProps<"/leagues/[slug]/[season]">): Promise<Metadata> {
  const { slug, season } = await params;
  const year = parseSeason(season);
  if (!year) return { title: "موسم غير موجود", robots: NOINDEX };
  return leagueMetadata(slug, year);
}

export default async function LeagueSeasonPage({ params }: PageProps<"/leagues/[slug]/[season]">) {
  const { slug, season } = await params;
  const year = parseSeason(season);
  if (!year) notFound();
  return <LeagueView slug={slug} seasonParam={year} />;
}
