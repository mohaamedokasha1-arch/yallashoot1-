import Link from "next/link";
import { ArticleCard, HeadlineCard } from "@/components/news/NewsCards";
import { Section } from "@/components/ui/Section";
import { qPublishedArticles } from "@/lib/content/articles";
import { qHeadlines } from "@/lib/content/feeds";

/** "آخر الأخبار": own editorial articles first, then licensed headline links. Hidden when there is none. */
export async function NewsWidget({ limit = 8 }: { limit?: number }) {
  const [articles, headlines] = await Promise.all([qPublishedArticles(), qHeadlines()]);
  if (articles.length === 0 && headlines.length === 0) return null;
  const own = articles.slice(0, limit);
  const external = headlines.slice(0, Math.max(0, limit - own.length));
  return (
    <Section id="latest-news" title="آخر الأخبار" bodyClassName="ys-block-body">
      <ul className="ys-grid ys-news-grid">
        {own.map((a) => (
          <li key={a.id}>
            <ArticleCard article={a} />
          </li>
        ))}
        {external.map((h) => (
          <li key={h.link}>
            <HeadlineCard item={h} />
          </li>
        ))}
      </ul>
      <div className="ys-more">
        <Link href="/news">عرض المزيد</Link>
      </div>
    </Section>
  );
}
