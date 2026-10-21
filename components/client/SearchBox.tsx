"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

interface Suggestion {
  type: "team" | "league" | "player" | "match";
  id: number;
  title: string;
  subtitle: string | null;
  href: string;
}

const TYPE_LABEL: Record<Suggestion["type"], string> = {
  team: "فريق",
  league: "بطولة",
  player: "لاعب",
  match: "مباراة",
};

/**
 * Search form (works without JS: plain GET to /search) enhanced with
 * debounced suggestions from /api/search (local index only — never spends
 * provider requests).
 */
export function SearchBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 8) : []);
        setActive(-1);
      } catch {
        // aborted or offline: keep the plain form working
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => () => controller.current?.abort(), []);

  const visibleItems = query.trim().length >= 2 ? items : [];
  const showList = open && visibleItems.length > 0;

  return (
    <form action="/search" method="get" role="search" className="relative" onSubmit={() => setOpen(false)}>
      <label htmlFor={inputId} className="sr-only">
        ابحث عن فريق أو بطولة أو لاعب
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input
            id={inputId}
            name="q"
            type="search"
            required
            minLength={2}
            maxLength={60}
            value={query}
            autoFocus={autoFocus}
            autoComplete="off"
            placeholder="مثال: الأهلي، الزمالك، Premier League"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (!showList) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(visibleItems.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(-1, i - 1));
              } else if (e.key === "Enter" && active >= 0) {
                e.preventDefault();
                const target = visibleItems[active];
                if (target) window.location.assign(target.href);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            className="ys-input w-full py-2.5 ps-10 pe-3 text-base"
          />
        </div>
        <button type="submit" className="ys-pill ys-pill--main px-5">
          بحث
        </button>
      </div>
      {showList ? (
        <ul id={listId} role="listbox" aria-label="اقتراحات البحث" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {visibleItems.map((item, i) => (
            <li key={`${item.type}-${item.id}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={item.href}
                className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${i === active ? "bg-muted" : "hover:bg-muted"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{item.title}</span>
                  {item.subtitle ? <span className="block truncate text-xs text-slate-500">{item.subtitle}</span> : null}
                </span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 text-[11px] text-slate-600">{TYPE_LABEL[item.type]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
