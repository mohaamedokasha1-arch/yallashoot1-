import type { Metadata } from "next";

/** Admin pages read the session cookie at the top level and may block. */
export const instant = false;

export const metadata: Metadata = {
  title: "لوحة الإدارة",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="mx-auto max-w-5xl">{children}</div>;
}
