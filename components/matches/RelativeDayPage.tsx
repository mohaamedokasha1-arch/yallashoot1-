import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { qToday } from "@/lib/football/queries";
import { pageMetadata } from "@/lib/seo/metadata";
import { addDays } from "@/lib/utils/dates";
import { formatDateLong } from "@/lib/utils/format";
import { DayMatches } from "./DayMatches";

export type RelativeKey = "yesterday" | "today" | "tomorrow";

const CONFIG: Record<RelativeKey, { offset: number; label: string; heading: string }> = {
  yesterday: { offset: -1, label: "مباريات الأمس", heading: "نتائج مباريات الأمس" },
  today: { offset: 0, label: "مباريات اليوم", heading: "مباريات اليوم" },
  tomorrow: { offset: 1, label: "مباريات الغد", heading: "مواعيد مباريات الغد" },
};

export async function relativeDayMetadata(key: RelativeKey): Promise<Metadata> {
  const today = await qToday();
  const date = addDays(today, CONFIG[key].offset);
  const { label } = CONFIG[key];
  const descriptions: Record<RelativeKey, string> = {
    yesterday: `نتائج ${label} ${formatDateLong(date)} بتوقيت القاهرة: الدوري المصري والبطولات الإفريقية والأوروبية والعربية، مرتبة حسب البطولة.`,
    today: `${label} ${formatDateLong(date)} بتوقيت القاهرة: المواعيد والنتائج المباشرة للدوري المصري وكأس مصر والدوريات الأوروبية والعربية.`,
    tomorrow: `مواعيد ${label} ${formatDateLong(date)} بتوقيت القاهرة لجميع البطولات المتاحة، مع أولوية لمباريات الكرة المصرية.`,
  };
  return pageMetadata({
    title: `${label} ${formatDateLong(date)} بتوقيت القاهرة`,
    description: descriptions[key],
    path: `/matches/${key}`,
  });
}

export async function RelativeDayPage({ dayKey }: { dayKey: RelativeKey }) {
  const today = await qToday();
  const { offset, label, heading } = CONFIG[dayKey];
  const date = addDays(today, offset);
  return (
    <>
      <Breadcrumbs items={[{ name: label, path: `/matches/${dayKey}` }]} />
      <DayMatches
        date={date}
        today={today}
        relativeTo={today}
        boardId={`day-${dayKey}`}
        title={heading}
        srTitle={`${formatDateLong(date)} بتوقيت القاهرة`}
        showDateNav
      />
    </>
  );
}
