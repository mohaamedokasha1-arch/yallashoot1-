"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const MAX_REFRESHES = 180;

function browserCairoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Keeps cached pages fresh without hammering the server:
 *  - while matches are live, re-requests the (cached) page every `pollSeconds`
 *    seconds, only when the tab is visible and with a hard cap per visit;
 *  - on "today" style pages, refreshes once when the Cairo date has changed
 *    since the page was rendered (e.g. a tab left open past midnight).
 * The server serves these refreshes from its cache; provider requests are
 * governed by the data layer, not by visitor traffic.
 */
export function PageFreshness({
  hasLive,
  pollSeconds = 60,
  pageDate,
}: {
  hasLive: boolean;
  pollSeconds?: number;
  /** Cairo date the page represents as "today" (only for relative-day pages). */
  pageDate?: string;
}) {
  const router = useRouter();
  const refreshes = useRef(0);
  const lastDateRefresh = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkDate = () => {
      if (!pageDate) return false;
      if (browserCairoDate() === pageDate) return false;
      if (Date.now() - lastDateRefresh.current < 60_000) return false;
      lastDateRefresh.current = Date.now();
      router.refresh();
      return true;
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      if (checkDate()) return;
      if (!hasLive && !pageDate) return;
      if (refreshes.current >= MAX_REFRESHES) return;
      const delay = hasLive ? Math.max(30, pollSeconds) * 1000 : 5 * 60_000;
      timer = setTimeout(() => {
        refreshes.current += 1;
        if (hasLive) router.refresh();
        schedule();
      }, delay);
    };

    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [router, hasLive, pollSeconds, pageDate]);

  return null;
}
