import { Section } from "@/components/ui/Section";
import { qFeedSources } from "@/lib/content/feeds";

/**
 * Attribution: the publishers whose free RSS headlines are listed, each linking
 * to its own site. Rendered under the headlines on /news.
 */
export async function SourceList() {
  const sources = await qFeedSources();
  if (!sources.length) return null;
  return (
    <Section
      id="news-sources"
      title="مصادر العناوين"
      subtitle="نعرض العنوان وتاريخ النشر ورابط الخبر الأصلي لدى ناشره، ولا ننسخ نص الخبر أو صوره."
      bodyClassName="ys-block-body"
    >
      <ul className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <li key={s.name}>
            {s.homepage ? (
              <a href={s.homepage} target="_blank" rel="noopener noreferrer nofollow" className="ys-pill ys-pill--sm">
                {s.name}
                <span className="sr-only"> (موقع الناشر، يفتح في نافذة جديدة)</span>
              </a>
            ) : (
              <span className="ys-pill ys-pill--sm">{s.name}</span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
