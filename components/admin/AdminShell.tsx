import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import type { AdminSession } from "@/lib/admin/session";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/admin", label: "لوحة المتابعة", role: "editor" },
  { href: "/admin/leagues", label: "البطولات والتغطية", role: "admin" },
  { href: "/admin/news", label: "الأخبار", role: "editor" },
  { href: "/admin/annotations", label: "معلومات البث", role: "editor" },
  { href: "/admin/settings", label: "إعدادات العرض", role: "admin" },
  { href: "/admin/logs", label: "السجلات", role: "admin" },
] as const;

export function AdminShell({ session, active, title, children }: { session: AdminSession; active: string; title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <section className="ys-block !mb-0">
        <div className="ys-block-head">
          <h1 className="ys-pill ys-pill--main">{title}</h1>
          <form action={logoutAction} className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">
              {session.username} ({session.role === "admin" ? "مدير" : "محرر"})
            </span>
            <button type="submit" className="ys-btn-soft">
              خروج
            </button>
          </form>
        </div>
        <nav aria-label="قائمة الإدارة" className="ys-block-body">
          <ul className="flex flex-wrap gap-1.5">
            {LINKS.filter((l) => l.role === "editor" || session.role === "admin").map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active === l.href ? "page" : undefined}
                  className={cn("ys-pill ys-pill--sm", active === l.href && "ys-pill--main")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
      {children}
    </div>
  );
}
