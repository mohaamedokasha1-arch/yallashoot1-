import { Clock } from "lucide-react";
import type { DataResult } from "@/lib/football/types";
import { formatCairoDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Notice } from "./Notice";

/** "آخر تحديث" line showing when the data was fetched from the provider. */
export function LastUpdated({ fetchedAt, className }: { fetchedAt: string | null; className?: string }) {
  if (!fetchedAt) return null;
  return (
    <p className={cn("ys-updated", className)}>
      <Clock aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        آخر تحديث من مزود البيانات:{" "}
        <time dateTime={fetchedAt}>{formatCairoDateTime(fetchedAt)}</time>{" "}
        (بتوقيت القاهرة)
      </span>
    </p>
  );
}

/**
 * Explains data problems to visitors: stale fallback copies, missing
 * configuration, quota exhaustion or provider failures.
 */
export function DataStatus({
  result,
  subject = "البيانات",
  className,
}: {
  result: Pick<DataResult<unknown>, "data" | "error" | "stale" | "fetchedAt">;
  subject?: string;
  className?: string;
}) {
  const { error } = result;
  if (!error) return null;
  if (result.data !== null && result.stale) {
    return (
      <Notice variant="warn" className={className} title={`تعذّر تحديث ${subject} حاليًا`}>
        <p>
          {error.message} نعرض آخر نسخة صحيحة محفوظة
          {result.fetchedAt ? (
            <>
              {" "}
              من <time dateTime={result.fetchedAt}>{formatCairoDateTime(result.fetchedAt)}</time>
            </>
          ) : null}
          ، وقد لا تعكس آخر المستجدات.
        </p>
      </Notice>
    );
  }
  if (result.data === null) {
    if (error.kind === "not_configured") {
      return (
        <Notice variant="info" className={className} title="مصدر البيانات غير مربوط بعد">
          <p>{error.message}</p>
        </Notice>
      );
    }
    return (
      <Notice variant="error" className={className} title={`تعذّر تحميل ${subject}`}>
        <p>{error.message} سيعاد المحاولة تلقائيًا.</p>
      </Notice>
    );
  }
  return null;
}
