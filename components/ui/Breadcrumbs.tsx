import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { siteUrl } from "@/lib/env";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "./JsonLd";

export interface Crumb {
  name: string;
  path: string;
}

export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  const all = [{ name: "الرئيسية", path: "/" }, ...items];
  return (
    <>
      <nav aria-label="مسار التنقل" className="ys-crumbs">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((item, i) => {
            const last = i === all.length - 1;
            return (
              <li key={item.path} className="flex min-w-0 items-center gap-1">
                {last ? (
                  <span aria-current="page" className="truncate">
                    {item.name}
                  </span>
                ) : (
                  <>
                    <Link href={item.path} className="truncate">
                      {item.name}
                    </Link>
                    <ChevronLeft aria-hidden="true" className="size-3.5 shrink-0" />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(siteUrl(), all)} />
    </>
  );
}
