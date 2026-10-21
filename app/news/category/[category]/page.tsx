import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleList, CategoryNav } from "@/components/news/NewsLists";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ARTICLE_CATEGORIES, qPublishedArticles, type ArticleCategory } from "@/lib/content/articles";
import { pageMetadata } from "@/lib/seo/metadata";

function isCategory(value: string): value is ArticleCategory {
  return Object.hasOwn(ARTICLE_CATEGORIES, value);
}

/**
 * Unlisted params are rendered completely on their first request (then cached),
 * so crawlers always get full HTML and unknown ids return a real 404 status.
 */
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return Object.keys(ARTICLE_CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/news/category/[category]">): Promise<Metadata> {
  const { category } = await params;
  if (!isCategory(category)) return { title: "تصنيف غير موجود", robots: { index: false, follow: true } };
  const label = ARTICLE_CATEGORIES[category];
  const articles = (await qPublishedArticles()).filter((a) => a.category === category);
  return {
    ...pageMetadata({
      title: `${label} — أخبار يلا شوت`,
      description: `${label} من فريق تحرير يلا شوت حول الكرة المصرية والعربية والعالمية.`,
      path: `/news/category/${category}`,
    }),
    ...(articles.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CategoryPage({ params }: PageProps<"/news/category/[category]">) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const label = ARTICLE_CATEGORIES[category];
  const articles = (await qPublishedArticles()).filter((a) => a.category === category);
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "الأخبار", path: "/news" },
          { name: label, path: `/news/category/${category}` },
        ]}
      />
      <section className="ys-block" aria-labelledby="category-title">
        <div className="ys-block-head">
          <h1 id="category-title" className="ys-pill ys-pill--main">
            {label}
          </h1>
          <CategoryNav active={category} />
        </div>
        {articles.length ? null : <EmptyState icon={Newspaper} title="لا توجد مقالات في هذا التصنيف بعد" />}
      </section>
      {articles.length ? <ArticleList articles={articles} title={label} /> : null}
    </>
  );
}
