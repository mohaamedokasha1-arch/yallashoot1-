import { RelativeDayPage, relativeDayMetadata } from "@/components/matches/RelativeDayPage";

export function generateMetadata() {
  return relativeDayMetadata("yesterday");
}

export default function Page() {
  return <RelativeDayPage dayKey="yesterday" />;
}
