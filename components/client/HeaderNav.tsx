"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { activeNavHref, NavMenuItems } from "@/components/layout/NavMarkup";
import type { NavItem } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

/**
 * Main navigation: an inline menu on desktop, an off-canvas drawer (opened
 * by the ☰ button) on screens up to 1000px — like the original design.
 */
export function HeaderNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const active = activeNavHref(pathname, items);
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("menu-open", open);
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      root.classList.remove("menu-open");
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    burgerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={burgerRef}
        type="button"
        className="ys-hbtn ys-burger"
        aria-expanded={open}
        aria-controls="ys-main-nav"
        aria-label="فتح القائمة"
        onClick={() => setOpen(true)}
      >
        <span className="line" />
        <span className="line" />
        <span className="line" />
      </button>
      <nav id="ys-main-nav" aria-label="القائمة الرئيسية" className={cn("ys-nav", open && "is-open")}>
        <button ref={closeRef} type="button" className="ys-nav-close" aria-label="إغلاق القائمة" onClick={close}>
          <X aria-hidden="true" className="size-6" />
        </button>
        <NavMenuItems items={items} active={active} onNavigate={() => setOpen(false)} />
      </nav>
      <div className={cn("ys-overlay", open && "is-open")} aria-hidden="true" onClick={close} />
    </>
  );
}
