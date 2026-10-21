/**
 * Stateless signed session tokens (HMAC-SHA256 via Web Crypto), usable from
 * both proxy.ts and server code. Token: base64url(JSON payload).base64url(sig)
 */

export type AdminRole = "admin" | "editor";

export interface SessionPayload {
  v: 1;
  u: string;
  r: AdminRole;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE = "ys_admin_session";
export const SESSION_TTL_SECONDS = 8 * 3600;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function signSession(payload: Omit<SessionPayload, "v">, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify({ v: 1, ...payload })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined | null, secret: string, nowMs = Date.now()): Promise<SessionPayload | null> {
  if (!token || token.length > 2048) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const sigBytes = fromBase64Url(sig);
  if (!sigBytes) return null;
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sigBytes as BufferSource, encoder.encode(body));
  if (!valid) return null;
  const json = fromBase64Url(body);
  if (!json) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(json)) as SessionPayload;
    if (payload.v !== 1 || typeof payload.u !== "string" || (payload.r !== "admin" && payload.r !== "editor")) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= nowMs) return null;
    if (typeof payload.iat !== "number" || payload.iat * 1000 > nowMs + 60_000) return null;
    return payload;
  } catch {
    return null;
  }
}
