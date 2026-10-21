import { cn } from "@/lib/utils/cn";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("ys-skel", className)} />;
}

export function ListSkeleton({ rows = 6, label = "جارٍ التحميل…" }: { rows?: number; label?: string }) {
  return (
    <div className="ys-block" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="ys-block-head">
        <SkeletonBlock className="h-7 w-40" />
      </div>
      <div className="space-y-3 p-3">
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonBlock key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل الصفحة…</span>
      <SkeletonBlock className="h-8 w-2/3" />
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-64 w-full" />
    </div>
  );
}
