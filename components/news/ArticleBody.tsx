import { Fragment } from "react";
import { parseMarkup, type Inline } from "@/lib/content/markup";

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) =>
        n.type === "bold" ? (
          <strong key={i}>{n.value}</strong>
        ) : n.type === "link" ? (
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow">
            {n.value}
          </a>
        ) : (
          <Fragment key={i}>{n.value}</Fragment>
        ),
      )}
    </>
  );
}

/** Renders editorial markup as React elements (no raw HTML → XSS-safe). */
export function ArticleBody({ source }: { source: string }) {
  const blocks = parseMarkup(source);
  return (
    <div className="prose-ar">
      {blocks.map((b, i) => {
        if (b.type === "h2") return <h2 key={i}><InlineNodes nodes={b.content} /></h2>;
        if (b.type === "h3") return <h3 key={i}><InlineNodes nodes={b.content} /></h3>;
        if (b.type === "ul")
          return (
            <ul key={i}>
              {b.items.map((item, j) => (
                <li key={j}>
                  <InlineNodes nodes={item} />
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            <InlineNodes nodes={b.content} />
          </p>
        );
      })}
    </div>
  );
}
