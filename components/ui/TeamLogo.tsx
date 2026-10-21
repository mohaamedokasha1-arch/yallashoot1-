import { cn } from "@/lib/utils/cn";

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0] ?? "?").slice(0, 2).toUpperCase();
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Team/league logo from the provider CDN. Plain <img> (lazy, fixed size) keeps
 * image optimisation costs at zero; falls back to initials when missing.
 */
export function TeamLogo({
  src,
  name,
  size = 28,
  className,
  rounded = false,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size / 2.8)) }}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn("shrink-0 object-contain", rounded && "rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
}
