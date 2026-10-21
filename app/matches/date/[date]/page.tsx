import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayMatches } from "@/components/matches/DayMatches";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { qToday } from "@/lib/football/queries";
import { NOINDEX, pageMetadata } from "@/lib/seo/metadata";
import { diffDays, isValidDateString, relativeDay } from "@/lib/utils/dates";
import { formatDateLong } from "@/lib/utils/format";

/** Accepted range for date pages (protects the API budget from absurd dates). */
const MIN_DATE = "2015-01-01";
const MAX_DAYS_AHEAD = 400;

function inRange(date: string, today: string): boolean {
  return isValidDateString(date) && date >= MIN_DATE && diffDays(today, date) <= MAX_DAYS_AHEAD;
}

/**
 * Unlisted params are rendered completely on their first request (then cached),
 * so crawlers always get full HTML and unknown ids return a real 404 status.
 */
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  return [{ date: await qToday() }];
}

export async function generateMetadata({ params }: PageProps<"/matches/date/[date]">): Promise<Metadata> {
  const { date } = await params;
  const today = await qToday();
  if (!inRange(date, today)) return { title: "تاريخ غير صالح", robots: NOINDEX };
  const rel = relativeDay(date, today);
  const isPast = date < today;
  return pageMetadata({
    title: `${isPast ? "نتائج" : "مواعيد"} مباريات ${formatDateLong(date)}`,
    description: `${isPast ? "نتائج" : "مواعيد"} مباريات يوم ${formatDateLong(date)} بتوقيت القاهرة، مرتبة حسب البطولة مع أولوية للكرة المصرية، من مزود بيانات رياضي موثوق.`,
    path: rel ? `/matches/${rel}` : `/matches/date/${date}`,
  });
}

export default async function DatePage({ params }: PageProps<"/matches/date/[date]">) {
  const { date } = await params;
  const today = await qToday();
  if (!inRange(date, today)) notFound();
  const isPast = date < today;
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "المباريات", path: "/matches/today" },
          { name: formatDateLong(date), path: `/matches/date/${date}` },
        ]}
      />
      <DayMatches
        date={date}
        today={today}
        boardId="date"
        title={`${isPast ? "نتائج" : "مواعيد"} مباريات ${formatDateLong(date)}`}
        srTitle="بتوقيت القاهرة"
        showDateNav
      />
    </>
  );
}
