import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Content block of the design: white rounded box, grey head with the title
 * in a dark pill, optional subtitle and action link.
 */
export function Section({
  id,
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  headingLevel = 2,
  accent = false,
}: {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headingLevel?: 1 | 2 | 3;
  /** Title pill in the main (maroon) color instead of the dark one. */
  accent?: boolean;
}) {
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 2 ? "h2" : "h3";
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("ys-block", className)}>
      <div className="ys-block-head">
        <div className="ys-block-titles">
          <Heading id={id ? `${id}-title` : undefined} className={cn("ys-pill", accent && "ys-pill--main")}>
            {title}
          </Heading>
          {subtitle ? <p className="ys-block-sub">{subtitle}</p> : null}
        </div>
        {action ? (
          <Link href={action.href} className="ys-pill ys-pill--main ys-pill--sm">
            {action.label}
          </Link>
        ) : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
