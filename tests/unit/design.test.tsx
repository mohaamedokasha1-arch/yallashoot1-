import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formationRows } from "@/components/match/Lineups";
import { MatchHeader } from "@/components/match/MatchHeader";
import { matchParagraphs } from "@/components/match/MatchInfo";
import { MatchTabs } from "@/components/match/MatchTabs";
import { stateClass, statusPillText } from "@/components/matches/MatchCenter";
import { MatchRow } from "@/components/matches/MatchRow";
import { activeNavHref } from "@/components/layout/NavMarkup";
import type { LineupPlayer } from "@/lib/football/types";
import { MAIN_NAV, SKIN_BOOT_SCRIPT, SKIN_STORAGE_KEY } from "@/lib/site";
import { makeMatch } from "./helpers/factories";

vi.mock("next/link", () => ({
  default: ({ href, children, prefetch: _p, ...rest }: { href: string; children: React.ReactNode; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const player = (name: string, grid: string | null, pos: string | null = null): LineupPlayer => ({ id: null, name, number: null, pos, grid });

describe("formation rows (pitch drawing)", () => {
  it("groups the starting XI by provider grid rows, goalkeeper first, ordered by column", () => {
    const rows = formationRows([
      player("ST", "4:1"),
      player("GK", "1:1"),
      player("CB2", "2:2"),
      player("CB1", "2:1"),
      player("CM", "3:1"),
    ]);
    expect(rows.map((r) => r.map((p) => p.name))).toEqual([["GK"], ["CB1", "CB2"], ["CM"], ["ST"]]);
  });

  it("falls back to positions when a grid is missing", () => {
    const rows = formationRows([player("A", null, "F"), player("B", null, "G"), player("C", "2:1", "D")]);
    expect(rows.map((r) => r.map((p) => p.name))).toEqual([["B"], ["C"], ["A"]]);
  });
});

describe("status pill and card state", () => {
  it("uses the reference wording and the live minute", () => {
    expect(statusPillText(makeMatch({ code: "NS" }))).toBe("لم تبدأ بعد");
    expect(statusPillText(makeMatch({ code: "2H", elapsed: 67 }))).toBe("67'");
    expect(statusPillText(makeMatch({ code: "FT" }))).toBe("انتهت");
    expect(statusPillText(makeMatch({ code: "PST" }))).toBe("مؤجلة");
  });

  it("maps status groups to card state classes", () => {
    expect(stateClass(makeMatch({ code: "1H", elapsed: 10 }))).toBe("is-live");
    expect(stateClass(makeMatch({ code: "FT" }))).toBe("is-finished");
    expect(stateClass(makeMatch({ code: "NS" }))).toBe("is-upcoming");
    expect(stateClass(makeMatch({ code: "CANC" }))).toBe("is-cancelled");
  });

  it("renders the card with the info strip and no score before kick-off", () => {
    const html = renderToStaticMarkup(
      <ul>
        <MatchRow match={makeMatch({ code: "NS", venue: { id: 1, name: "Cairo International Stadium", city: "Cairo" } })} />
      </ul>,
    );
    expect(html).toContain("ys-match is-upcoming");
    expect(html).toContain("Cairo International Stadium");
    expect(html).toContain("مصر، الدوري المصري الممتاز");
    expect(html).toContain("الجولة 10");
    expect(html).not.toContain('data-side="home"');
  });
});

describe("match page pieces", () => {
  it("never describes an upcoming match with a score", () => {
    const text = matchParagraphs(makeMatch({ code: "NS" })).join(" ");
    expect(text).toContain("تُقام مباراة الأهلي والزمالك");
    expect(text).not.toMatch(/\d+\s*-\s*\d+/);
  });

  it("names the actual winner of a finished match", () => {
    const text = matchParagraphs(makeMatch({ code: "FT", goals: { home: 1, away: 3 } })).join(" ");
    expect(text).toContain("بفوز الزمالك 3-1");
  });

  it("shows VS before kick-off and the score (home first) once started", () => {
    const before = renderToStaticMarkup(<MatchHeader match={makeMatch({ code: "NS" })} />);
    expect(before).toContain("VS");
    expect(before).not.toContain('data-side="home"');
    const after = renderToStaticMarkup(<MatchHeader match={makeMatch({ code: "FT", goals: { home: 2, away: 0 } })} />);
    expect(after).toContain('<span data-side="home">2</span>');
    expect(after).toContain('<span data-side="away">0</span>');
    expect(after).toContain('aria-label="ملخص المباراة"');
  });

  it("renders the three no-JS tabs with the details tab selected", () => {
    const html = renderToStaticMarkup(<MatchTabs details={<p>d</p>} lineups={<p>l</p>} events={<p>e</p>} />);
    for (const id of ["match-details", "lineups", "events"]) expect(html).toContain(`id="${id}"`);
    expect(html).toMatch(/id="tab-details"[^>]*checked/);
    expect(html).toContain("التشكيلة");
    expect(html).toContain("أحداث المباراة");
  });
});

describe("header helpers", () => {
  it("highlights the right menu item", () => {
    expect(activeNavHref("/", MAIN_NAV)).toBe("/");
    expect(activeNavHref("/matches/date/2026-10-25", MAIN_NAV)).toBe("/matches/today");
    expect(activeNavHref("/leagues/egyptian-premier-league-233", MAIN_NAV)).toBe("/leagues/egyptian-premier-league-233");
    expect(activeNavHref("/leagues/premier-league-39", MAIN_NAV)).toBe("/leagues");
    expect(activeNavHref("/teams/al-ahly-1577", MAIN_NAV)).toBeNull();
  });

  it("boot script only reads the skin preference key", () => {
    expect(SKIN_BOOT_SCRIPT).toContain(`localStorage.getItem("${SKIN_STORAGE_KEY}")`);
    expect(SKIN_BOOT_SCRIPT).toContain('classList.add("night")');
    expect(SKIN_BOOT_SCRIPT).not.toContain("<");
  });
});
