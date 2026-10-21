import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export interface PageMetaInput {
  title: string;
  description: string;
  /** Canonical path (no query string), e.g. "/matches/today". */
  path: string;
  noindex?: boolean;
  type?: "website" | "article";
  /** Absolute title (skips the "| يلا شوت" template). */
  absoluteTitle?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}

export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const description = clampDescription(input.description);
  const fullTitle = input.absoluteTitle ? input.title : `${input.title} | ${SITE.name}`;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: { canonical: input.path },
    robots: input.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url: input.path,
      siteName: SITE.name,
      locale: SITE.locale,
      type: input.type ?? "website",
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

export const NOINDEX: Metadata["robots"] = { index: false, follow: true };
