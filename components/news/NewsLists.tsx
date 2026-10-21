import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { ARTICLE_CATEGORIES, type Article } from "@/lib/content/articles";
import type { FeedItem } from "@/lib/content/feeds";
import { cn } from "@/lib/utils/cn";
import { ArticleCard, HeadlineCard } from "./NewsCards";

export function ArticleList({ articles, title = "من فريق التحرير" }: { articles: readonly Article[]; title?: string }) {
  return (
    <Section id="articles" title={title} bodyClassName="ys-block-body">
      <ul className="ys-grid ys-news-grid">
        {articles.map((a) => (
          <li key={a.id}>
            <ArticleCard article={a} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function HeadlineList({ items }: { items: readonly FeedItem[] }) {
  return (
    <Section
      id="headlines"
      title="عناوين الأخبار"
      subtitle="أحدث العناوين من مصادر الأخبار الرياضية — اقرأ الخبر كاملًا لدى ناشره"
      bodyClassName="ys-block-body"
    >
      <ul className="ys-grid ys-news-grid">
        {items.map((h) => (
          <li key={h.link}>
            <HeadlineCard item={h} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav aria-label="تصنيفات الأخبار">
      <ul className="flex flex-wrap gap-1.5">
        <li>
          <Link href="/news" aria-current={!active ? "page" : undefined} className={cn("ys-pill ys-pill--sm", !active && "ys-pill--main")}>
            الكل
          </Link>
        </li>
        {Object.entries(ARTICLE_CATEGORIES).map(([key, label]) => (
          <li key={key}>
            <Link
              href={`/news/category/${key}`}
              aria-current={active === key ? "page" : undefined}
              className={cn("ys-pill ys-pill--sm", active === key && "ys-pill--main")}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
