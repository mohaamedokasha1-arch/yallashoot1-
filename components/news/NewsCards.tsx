import Link from "next/link";
import { ARTICLE_CATEGORIES, type Article } from "@/lib/content/articles";
import type { FeedItem } from "@/lib/content/feeds";
import { SITE } from "@/lib/site";
import { formatCairoDateTime } from "@/lib/utils/format";

function Placeholder({ label }: { label: string }) {
  return (
    <span className="ys-news-img ys-news-img--placeholder" aria-hidden="true">
      {label}
    </span>
  );
}

/** Editorial article card (image only when the editor attached a licensed one). */
export function ArticleCard({ article: a }: { article: Article }) {
  return (
    <Link href={`/news/${a.slug}`} className="ys-news-card">
      {a.imageUrl ? (
        <span className="ys-news-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="size-full object-cover" />
        </span>
      ) : (
        <Placeholder label={SITE.name} />
      )}
      <span className="ys-news-info">
        <h3>{a.title}</h3>
        <span className="src">
          {ARTICLE_CATEGORIES[a.category]}
          {a.publishedAt ? ` · ${formatCairoDateTime(a.publishedAt)}` : ""}
        </span>
      </span>
    </Link>
  );
}

/** Licensed headline: title + link to the original publisher only. */
export function HeadlineCard({ item: h }: { item: FeedItem }) {
  return (
    <a href={h.link} target="_blank" rel="noopener noreferrer nofollow" className="ys-news-card">
      <Placeholder label={h.sourceName} />
      <span className="ys-news-info">
        <h3>
          {h.title}
          <span className="sr-only"> (يفتح موقع الناشر في نافذة جديدة)</span>
        </h3>
        <span className="src">
          المصدر: {h.sourceName}
          {h.publishedAt ? ` · ${formatCairoDateTime(h.publishedAt)}` : ""}
        </span>
      </span>
    </a>
  );
}
