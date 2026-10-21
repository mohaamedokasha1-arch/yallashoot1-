import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { CategoryNav, ArticleList, HeadlineList } from "@/components/news/NewsLists";
import { SourceList } from "@/components/news/SourceList";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { qPublishedArticles } from "@/lib/content/articles";
import { qHeadlines } from "@/lib/content/feeds";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "أخبار الكرة المصرية والعالمية",
  description: "أخبار الكرة المصرية والعالمية: مقالات فريق تحرير يلا شوت، وعناوين محدّثة من مصادر الأخبار الرياضية المصرية والعربية مع رابط الخبر الأصلي لدى ناشره.",
  path: "/news",
});

export default async function NewsPage() {
  const [articles, headlines] = await Promise.all([qPublishedArticles(), qHeadlines()]);
  return (
    <>
      <Breadcrumbs items={[{ name: "الأخبار", path: "/news" }]} />
      <section className="ys-block" aria-labelledby="news-title">
        <div className="ys-block-head">
          <h1 id="news-title" className="ys-pill ys-pill--main">
            الأخبار
          </h1>
          <CategoryNav />
        </div>
        {!articles.length && !headlines.length ? (
          <EmptyState icon={Newspaper} title="لا توجد أخبار معروضة حاليًا">
            تعذّر جلب العناوين من مصادر الأخبار في هذه اللحظة، وستعود تلقائيًا عند نجاح الجلب التالي. ينشر فريق التحرير مقالاته من لوحة
            الإدارة، ويمكن متابعة المصادر أو تعطيلها من هناك.
          </EmptyState>
        ) : (
          <p className="ys-block-body text-sm text-slate-600">
            مقالات فريق التحرير أولًا، ثم أحدث العناوين من مصادر الأخبار الرياضية مع رابط الخبر الأصلي لدى ناشره.
          </p>
        )}
      </section>
      {articles.length ? <ArticleList articles={articles} /> : null}
      {headlines.length ? <HeadlineList items={headlines} /> : null}
      <SourceList />
    </>
  );
}
