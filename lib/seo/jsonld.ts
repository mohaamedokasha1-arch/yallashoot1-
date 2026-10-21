import { SITE } from "@/lib/site";
import type { Match, Team } from "@/lib/football/types";
import { displayName } from "@/lib/football/names";

/**
 * Structured data builders. Only confirmed facts are included (no guessed
 * venues, broadcasters or scores).
 */

type Json = Record<string, unknown>;

export function websiteJsonLd(siteUrl: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: siteUrl,
    inLanguage: "ar",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(siteUrl: string, items: ReadonlyArray<{ name: string; path: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

function eventStatus(m: Match): string {
  if (m.status.group === "postponed") return "https://schema.org/EventPostponed";
  if (m.status.group === "cancelled") return "https://schema.org/EventCancelled";
  return "https://schema.org/EventScheduled";
}

export function sportsEventJsonLd(siteUrl: string, m: Match): Json | null {
  if (m.status.code === "TBD") return null;
  const home = displayName(m.home);
  const away = displayName(m.away);
  const data: Json = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${home} ضد ${away}`,
    sport: "Soccer",
    startDate: m.kickoff,
    eventStatus: eventStatus(m),
    url: `${siteUrl}/matches/${m.slug}`,
    homeTeam: { "@type": "SportsTeam", name: home },
    awayTeam: { "@type": "SportsTeam", name: away },
    superEvent: { "@type": "SportsEvent", name: displayName(m.league) },
  };
  if (m.venue?.name) {
    data.location = {
      "@type": "Place",
      name: m.venue.name,
      ...(m.venue.city ? { address: { "@type": "PostalAddress", addressLocality: m.venue.city } } : {}),
    };
  }
  return data;
}

export function sportsTeamJsonLd(siteUrl: string, t: Team): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: displayName(t),
    alternateName: t.nameAr ? t.name : undefined,
    sport: "Soccer",
    url: `${siteUrl}/teams/${t.slug}`,
    ...(t.logo ? { logo: t.logo } : {}),
    ...(t.founded ? { foundingDate: String(t.founded) } : {}),
  };
}

export function newsArticleJsonLd(
  siteUrl: string,
  a: { title: string; excerpt: string; slug: string; publishedAt: string | null; updatedAt: string; author: string; imageUrl: string | null },
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description: a.excerpt,
    inLanguage: "ar",
    mainEntityOfPage: `${siteUrl}/news/${a.slug}`,
    ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
    dateModified: a.updatedAt,
    author: { "@type": "Organization", name: `فريق تحرير ${SITE.name}` },
    publisher: { "@type": "Organization", name: SITE.name },
    ...(a.imageUrl ? { image: [a.imageUrl] } : {}),
  };
}

/** Serialises JSON-LD safely for inline <script> tags. */
export function serializeJsonLd(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
