import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Centered grey "no data" message. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ys-empty", className)}>
      <Icon aria-hidden="true" />
      <p className="ys-empty-title">{title}</p>
      {children ? <div className="ys-empty-text">{children}</div> : null}
    </div>
  );
}
