import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/news/ArticleBody";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/ui/JsonLd";
import { ARTICLE_CATEGORIES, qArticle } from "@/lib/content/articles";
import { siteUrl } from "@/lib/env";
import { newsArticleJsonLd } from "@/lib/seo/jsonld";
import { NOINDEX, pageMetadata } from "@/lib/seo/metadata";
import { formatCairoDateTime } from "@/lib/utils/format";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return { title: "مقال غير موجود", robots: NOINDEX };
  const a = await qArticle(slug);
  if (!a) return { title: "مقال غير موجود", robots: NOINDEX };
  return pageMetadata({
    title: a.title,
    description: a.excerpt,
    path: `/news/${a.slug}`,
    type: "article",
    publishedTime: a.publishedAt ?? undefined,
    modifiedTime: a.updatedAt,
  });
}

/**
 * Unlisted params are rendered completely on their first request (then cached),
 * so crawlers always get full HTML and unknown ids return a real 404 status.
 */
export const ensureStatic = "navigation";

/** Placeholder sample (required by Cache Components). */
export function generateStaticParams() {
  return [{ slug: "placeholder-article" }];
}

export default async function ArticlePage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();
  const a = await qArticle(slug);
  if (!a) notFound();
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "الأخبار", path: "/news" },
          { name: ARTICLE_CATEGORIES[a.category], path: `/news/category/${a.category}` },
          { name: a.title, path: `/news/${a.slug}` },
        ]}
      />
      <article className="ys-block">
        <header className="ys-entry-head">
          <Link href={`/news/category/${a.category}`} className="ys-pill ys-pill--main ys-pill--sm mb-2">
            {ARTICLE_CATEGORIES[a.category]}
          </Link>
          <h1 className="ys-entry-title">{a.title}</h1>
          <p className="ys-entry-meta">
            فريق تحرير يلا شوت
            {a.publishedAt ? (
              <>
                {" · "}نُشر <time dateTime={a.publishedAt}>{formatCairoDateTime(a.publishedAt)}</time>
              </>
            ) : null}
            {a.updatedAt !== a.publishedAt ? (
              <>
                {" · "}آخر تحديث <time dateTime={a.updatedAt}>{formatCairoDateTime(a.updatedAt)}</time>
              </>
            ) : null}
          </p>
        </header>
        <div className="ys-entry">
          <p className="text-lg text-slate-600">{a.excerpt}</p>
          {a.imageUrl ? (
            <figure className="my-4 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.imageUrl} alt="" className="h-auto w-full" loading="lazy" />
              {a.imageCredit ? <figcaption className="px-1 py-1 text-xs text-slate-500">الصورة: {a.imageCredit}</figcaption> : null}
            </figure>
          ) : null}
          <ArticleBody source={a.body} />
          {a.sourceUrl ? (
            <p className="mt-4 text-sm text-slate-600">
              المصدر:{" "}
              <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                {a.sourceName ?? a.sourceUrl}
              </a>
            </p>
          ) : null}
        </div>
      </article>
      <JsonLd data={newsArticleJsonLd(siteUrl(), a)} />
    </>
  );
}
