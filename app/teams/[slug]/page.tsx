import type { Metadata } from "next";
import { TeamView, teamMetadata } from "@/components/team/TeamView";

/**
 * Unlisted params are rendered completely on their first request (then cached),
 * so crawlers always get full HTML and unknown ids return a real 404 status.
 */
export const ensureStatic = "navigation";

/** Placeholder sample (required by Cache Components); teams render on first request, then stay cached. */
export function generateStaticParams() {
  return [{ slug: "team-0" }];
}

export async function generateMetadata({ params }: PageProps<"/teams/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return teamMetadata(slug);
}

export default async function TeamPage({ params }: PageProps<"/teams/[slug]">) {
  const { slug } = await params;
  return <TeamView slug={slug} />;
}
