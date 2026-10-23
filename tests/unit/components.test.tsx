import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MatchBoard } from "@/components/matches/MatchBoard";
import { MatchRow } from "@/components/matches/MatchRow";
import { DataStatus } from "@/components/ui/DataStatus";
import { dataError } from "@/lib/football/errors";
import { makeMatch } from "./helpers/factories";

vi.mock("next/link", () => ({
  default: ({ href, children, prefetch: _p, ...rest }: { href: string; children: React.ReactNode; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("match rendering", () => {
  it("shows the kick-off time (Cairo) and no 0-0 for a match that has not started", () => {
    const html = renderToStaticMarkup(
      <ul>
        <MatchRow match={makeMatch({ code: "NS", goals: { home: 0, away: 0 }, kickoffMs: Date.UTC(2026, 9, 21, 17, 0) })} />
      </ul>,
    );
    expect(html).toContain("8:00");
    expect(html).toContain("لم تبدأ");
    expect(html).not.toContain('data-side="home"');
  });

  it("renders home and away scores in their own cells", () => {
    const html = renderToStaticMarkup(
      <ul>
        <MatchRow match={makeMatch({ code: "FT", goals: { home: 3, away: 1 } })} />
      </ul>,
    );
    expect(html).toContain('<span data-side="home">3</span>');
    expect(html).toContain('<span data-side="away">1</span>');
    expect(html).toContain("الأهلي 3، الزمالك 1");
    expect(html.indexOf("الأهلي")).toBeLessThan(html.indexOf("الزمالك"));
  });

  it("labels postponed matches without a score", () => {
    const html = renderToStaticMarkup(
      <ul>
        <MatchRow match={makeMatch({ code: "PST", goals: { home: 0, away: 0 } })} />
      </ul>,
    );
    expect(html).toContain("مؤجلة");
    expect(html).not.toContain('data-side="home"');
  });

  it("shows an explicit empty state when there are no matches", () => {
    const html = renderToStaticMarkup(<MatchBoard matches={[]} options={{ id: "t" }} />);
    expect(html).toContain("لا توجد مباريات في هذا اليوم");
  });

  it("renders the status filters and Egyptian section first", () => {
    const html = renderToStaticMarkup(<MatchBoard matches={[makeMatch({ code: "2H", elapsed: 50 }), makeMatch({ id: 999, code: "NS" })]} options={{ id: "t" }} />);
    expect(html).toContain("مباشر");
    expect(html).toContain("الكرة المصرية");
    expect(html).toContain('data-group="live"');
  });
});

describe("data status notices", () => {
  it("explains a missing provider configuration", () => {
    const html = renderToStaticMarkup(<DataStatus result={{ data: null, error: dataError("not_configured"), stale: false, fetchedAt: null }} />);
    expect(html).toContain("مصدر البيانات غير مربوط بعد");
  });

  it("warns when showing the last saved copy", () => {
    const html = renderToStaticMarkup(
      <DataStatus result={{ data: [], error: dataError("server"), stale: true, fetchedAt: "2026-10-21T15:00:00.000Z" }} subject="المباريات" />,
    );
    expect(html).toContain("تعذّر تحديث المباريات حاليًا");
    expect(html).toContain("آخر نسخة صحيحة");
    expect(html).toContain("6:00");
  });

  it("shows provider failures without data", () => {
    const html = renderToStaticMarkup(<DataStatus result={{ data: null, error: dataError("timeout"), stale: false, fetchedAt: null }} />);
    expect(html).toContain('role="alert"');
  });

  it("promises an automatic retry only for transient failures", () => {
    const transient = renderToStaticMarkup(<DataStatus result={{ data: null, error: dataError("network"), stale: false, fetchedAt: null }} />);
    expect(transient).toContain("سيعاد المحاولة تلقائيًا");

    const auth = renderToStaticMarkup(<DataStatus result={{ data: null, error: dataError("auth"), stale: false, fetchedAt: null }} />);
    expect(auth).toContain("تعذّر التحقق من حساب مزود البيانات");
    expect(auth).not.toContain("سيعاد المحاولة تلقائيًا");
  });
});
