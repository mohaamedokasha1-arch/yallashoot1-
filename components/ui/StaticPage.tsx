import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";

/** Article-style page (about, privacy, terms, contact). */
export function StaticPage({ title, path, updated, children }: { title: string; path: string; updated?: string; children: ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: title, path }]} />
      <article className="ys-block">
        <header className="ys-entry-head">
          <h1 className="ys-entry-title">{title}</h1>
          {updated ? <p className="ys-entry-meta">آخر تحديث لهذه الصفحة: {updated}</p> : null}
        </header>
        <div className="ys-entry">{children}</div>
      </article>
    </>
  );
}
