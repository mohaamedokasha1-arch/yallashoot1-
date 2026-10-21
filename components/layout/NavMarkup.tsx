import Link from "next/link";
import type { NavItem } from "@/lib/site";

export function activeNavHref(pathname: string, items: readonly NavItem[]): string | null {
  for (const item of items) {
    if (item.href === "/") {
      if (pathname === "/") return item.href;
      continue;
    }
    if (item.href === "/matches/today" && pathname.startsWith("/matches")) return item.href;
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return item.href;
  }
  return null;
}

export function NavMenuItems({
  items,
  active,
  onNavigate,
}: {
  items: readonly NavItem[];
  active: string | null;
  onNavigate?: () => void;
}) {
  return (
    <ul className="ys-menu">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} aria-current={active === item.href ? "page" : undefined} onClick={onNavigate}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Static header navigation (fallback while the interactive one loads). */
export function HeaderNavMarkup({ items }: { items: readonly NavItem[] }) {
  return (
    <>
      <span className="ys-hbtn ys-burger" aria-hidden="true">
        <span className="line" />
        <span className="line" />
        <span className="line" />
      </span>
      <nav aria-label="القائمة الرئيسية" className="ys-nav">
        <NavMenuItems items={items} active={null} />
      </nav>
    </>
  );
}
