import { AlertTriangle, CheckCircle2, FlaskConical, Info, ServerCrash } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const VARIANTS = {
  info: { cls: "ys-msg--info", Icon: Info },
  success: { cls: "ys-msg--success", Icon: CheckCircle2 },
  warn: { cls: "ys-msg--warn", Icon: AlertTriangle },
  error: { cls: "ys-msg--error", Icon: ServerCrash },
  test: { cls: "ys-msg--test", Icon: FlaskConical },
} as const;

/** Message box (same family as the original design's green message box). */
export function Notice({
  variant = "info",
  title,
  children,
  className,
  role,
}: {
  variant?: keyof typeof VARIANTS;
  title?: string;
  children?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  const { cls, Icon } = VARIANTS[variant];
  return (
    <div role={role ?? (variant === "error" ? "alert" : "status")} className={cn("ys-msg", cls, className)}>
      <Icon aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="ys-msg-title">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
