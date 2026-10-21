import type { NextRequest } from "next/server";
import { isValidDateString } from "@/lib/utils/dates";

/** Target of the no-JS date picker: /matches/go?d=YYYY-MM-DD → /matches/date/YYYY-MM-DD */
export function GET(request: NextRequest) {
  const d = request.nextUrl.searchParams.get("d") ?? "";
  const target = isValidDateString(d) ? `/matches/date/${d}` : "/matches/today";
  // Relative Location keeps the visitor on the same host (works behind proxies).
  return new Response(null, { status: 307, headers: { Location: target, "Cache-Control": "no-store" } });
}
