import type { NextRequest } from "next/server";
import { displayName } from "@/lib/football/names";
import { sanitizeQuery, searchFootball } from "@/lib/football/search";

/** Search suggestions from the local index (never calls the football provider). */
export async function GET(request: NextRequest) {
  const q = sanitizeQuery(request.nextUrl.searchParams.get("q"));
  if (q.length < 2) return Response.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  const results = await searchFootball(q, { allowProvider: false, limit: 5 });
  const suggestions = [
    ...results.teams.map((t) => ({ type: "team", id: t.id, title: displayName(t), subtitle: t.countryAr ?? t.country, href: `/teams/${t.slug}` })),
    ...results.leagues.map((l) => ({ type: "league", id: l.id, title: displayName(l), subtitle: l.countryAr ?? l.country, href: `/leagues/${l.slug}` })),
    ...results.matches.map((m) => ({
      type: "match",
      id: m.id,
      title: `${displayName(m.home)} ضد ${displayName(m.away)}`,
      subtitle: displayName(m.league),
      href: `/matches/${m.slug}`,
    })),
    ...results.players.map((p) => ({ type: "player", id: p.id, title: p.name, subtitle: p.teamName, href: `/players/${p.slug}` })),
  ].slice(0, 8);
  return Response.json(
    { suggestions },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300", "X-Robots-Tag": "noindex" } },
  );
}
