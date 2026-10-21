"use client";

import { Search } from "lucide-react";
import { useId, useState } from "react";

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function applyFilter(targetId: string, query: string): number | null {
  const root = document.getElementById(targetId);
  if (!root) return null;
  const q = normalize(query);
  let count = 0;
  root.querySelectorAll<HTMLElement>("[data-filter-text]").forEach((el) => {
    const match = !q || normalize(el.dataset.filterText ?? "").includes(q);
    el.hidden = !match;
    if (match) count++;
  });
  root.querySelectorAll<HTMLElement>("[data-filter-group]").forEach((group) => {
    const any = group.querySelector("[data-filter-text]:not([hidden])");
    group.hidden = !any;
    if (q && any && group instanceof HTMLDetailsElement) group.open = true;
  });
  return q ? count : null;
}

/**
 * Progressive enhancement: filters server-rendered items marked with
 * `data-filter-text` inside the element with id `targetId`.
 */
export function ListFilter({ targetId, label, placeholder }: { targetId: string; label: string; placeholder: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState<number | null>(null);

  return (
    <div className="mt-3">
      <label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(applyFilter(targetId, e.target.value));
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="ys-input w-full py-2 ps-9 pe-3"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500" aria-live="polite">
        {visible === null ? "" : visible === 0 ? "لا توجد نتائج مطابقة." : `عدد النتائج: ${visible}`}
      </p>
    </div>
  );
}
