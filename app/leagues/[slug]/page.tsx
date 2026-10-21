import type { Metadata } from "next";
import { LeagueView, leagueMetadata } from "@/components/league/LeagueView";

/**
 * Unlisted params are rendered completely on their first request (then cached),
 * so crawlers always get full HTML and unknown ids return a real 404 status.
 */
export const ensureStatic = "navigation";

/** Placeholder sample (required by Cache Components); leagues render on first request, then stay cached. */
export function generateStaticParams() {
  return [{ slug: "league-0" }];
}

export async function generateMetadata({ params }: PageProps<"/leagues/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return leagueMetadata(slug);
}

export default async function LeaguePage({ params }: PageProps<"/leagues/[slug]">) {
  const { slug } = await params;
  return <LeagueView slug={slug} />;
}
