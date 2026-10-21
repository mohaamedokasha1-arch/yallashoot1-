import { RelativeDayPage, relativeDayMetadata } from "@/components/matches/RelativeDayPage";

export function generateMetadata() {
  return relativeDayMetadata("tomorrow");
}

export default function Page() {
  return <RelativeDayPage dayKey="tomorrow" />;
}
