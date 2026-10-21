import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/admin/session-token";

/**
 * Edge-of-app protection for the admin area: unauthenticated requests are
 * redirected to the login page before any admin code runs. Pages and server
 * actions verify the session again (defence in depth).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return NextResponse.next();

  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = secret && secret.length >= 32 ? await verifySession(token, secret) : null;
  if (session) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = "/admin/login";
  login.search = "";
  const next = `${pathname}${search}`;
  if (next !== "/admin") login.searchParams.set("next", next);
  const res = NextResponse.redirect(login, 307);
  if (token) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
