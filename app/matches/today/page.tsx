import { RelativeDayPage, relativeDayMetadata } from "@/components/matches/RelativeDayPage";

export function generateMetadata() {
  return relativeDayMetadata("today");
}

export default function Page() {
  return <RelativeDayPage dayKey="today" />;
}
