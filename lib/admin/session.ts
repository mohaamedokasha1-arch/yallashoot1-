import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { adminConfig, type AdminAccount } from "@/lib/env";
import { getStore } from "@/lib/store";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type AdminRole, type SessionPayload } from "./session-token";

export interface AdminSession {
  username: string;
  role: AdminRole;
  expiresAt: number;
}

export async function createSession(account: AdminAccount): Promise<void> {
  const cfg = adminConfig();
  if (!cfg.sessionSecret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const now = Math.floor(Date.now() / 1000);
  const token = await signSession({ u: account.username, r: account.role, iat: now, exp: now + SESSION_TTL_SECONDS }, cfg.sessionSecret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Validates the session cookie and that the account still exists in the environment. */
export async function getSession(): Promise<AdminSession | null> {
  // Mark the render as request-time first: session checks compare expiry with
  // the current time and must never be prerendered or prefetched.
  await connection();
  const jar = await cookies();
  const cfg = adminConfig();
  if (!cfg.enabled || !cfg.sessionSecret) return null;
  const payload: SessionPayload | null = await verifySession(jar.get(SESSION_COOKIE)?.value, cfg.sessionSecret);
  if (!payload) return null;
  const account = cfg.accounts.find((a) => a.username === payload.u && a.role === payload.r);
  if (!account) return null;
  return { username: payload.u, role: payload.r, expiresAt: payload.exp * 1000 };
}

/** For pages and server actions: redirects to the login page when not signed in. */
export async function requireSession(role: AdminRole = "editor"): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (role === "admin" && session.role !== "admin") redirect("/admin?denied=1");
  return session;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  return ip.slice(0, 64).replace(/[^0-9a-fA-F:.]/g, "") || "unknown";
}

const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60;

export async function isLoginBlocked(ip: string): Promise<boolean> {
  try {
    const failures = (await getStore().get<number>(`login:fail:${ip}`)) ?? 0;
    return failures >= MAX_FAILURES;
  } catch {
    return false;
  }
}

export async function recordLoginFailure(ip: string): Promise<void> {
  try {
    await getStore().incr(`login:fail:${ip}`, WINDOW_SECONDS);
  } catch {
    // ignore
  }
}

export async function clearLoginFailures(ip: string): Promise<void> {
  try {
    await getStore().del(`login:fail:${ip}`);
  } catch {
    // ignore
  }
}

/** Only allow redirects back into the admin area (prevents open redirects). */
export function safeAdminPath(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!/^\/admin(?:\/[a-z0-9-]*)*(?:\?[a-z0-9=&-]*)?$/i.test(value)) return "/admin";
  if (value.startsWith("/admin/login")) return "/admin";
  return value;
}
