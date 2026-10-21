import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Outbound fetch for admin-supplied URLs (RSS feeds) with SSRF protection:
 * HTTPS only, default port, no credentials, optional host allow-list, DNS
 * check against private/reserved ranges (re-validated on every redirect),
 * timeout and response size limit.
 */

export class SafeFetchError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inRange(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base ?? "0.0.0.0") & mask);
}

const BLOCKED_V4 = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12",
  "192.0.0.0/24", "192.0.2.0/24", "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24",
  "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
];

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return BLOCKED_V4.some((cidr) => inRange(address, cidr));
  if (version === 6) {
    const a = address.toLowerCase();
    if (a === "::" || a === "::1") return true;
    if (a.startsWith("fc") || a.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(a)) return true;
    if (a.startsWith("ff")) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    if (a.startsWith("64:ff9b:") || a.startsWith("2001:db8")) return true;
    return false;
  }
  return true;
}

export function validatePublicUrl(raw: string, allowedHosts: readonly string[] = []): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeFetchError("رابط غير صالح");
  }
  if (url.protocol !== "https:") throw new SafeFetchError("يُسمح بروابط HTTPS فقط");
  if (url.username || url.password) throw new SafeFetchError("لا يُسمح ببيانات دخول داخل الرابط");
  if (url.port && url.port !== "443") throw new SafeFetchError("منفذ غير مسموح");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new SafeFetchError("عنوان داخلي غير مسموح");
  }
  if (isIP(host) && isPrivateAddress(host)) throw new SafeFetchError("عنوان داخلي غير مسموح");
  if (allowedHosts.length && !allowedHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new SafeFetchError("النطاق غير موجود في قائمة النطاقات المسموح بها");
  }
  return url;
}

async function assertPublicDns(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new SafeFetchError("عنوان داخلي غير مسموح");
    return;
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SafeFetchError("تعذّر حل اسم النطاق");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new SafeFetchError("النطاق يشير إلى عنوان داخلي غير مسموح");
  }
}

export async function safeFetchText(
  raw: string,
  opts: { maxBytes?: number; timeoutMs?: number; allowedHosts?: readonly string[]; accept?: string } = {},
): Promise<{ text: string; finalUrl: string; contentType: string }> {
  const maxBytes = opts.maxBytes ?? 1_000_000;
  let url = validatePublicUrl(raw, opts.allowedHosts);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicDns(url.hostname);
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: { accept: opts.accept ?? "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9", "user-agent": "YallaShootBot/1.0 (+headlines)" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 6000),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new SafeFetchError("تحويل بدون عنوان");
      url = validatePublicUrl(new URL(location, url).toString(), opts.allowedHosts);
      continue;
    }
    if (!res.ok) throw new SafeFetchError(`HTTP ${res.status}`);
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > maxBytes) throw new SafeFetchError("حجم الاستجابة أكبر من المسموح");
    const reader = res.body?.getReader();
    if (!reader) return { text: "", finalUrl: url.toString(), contentType: res.headers.get("content-type") ?? "" };
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SafeFetchError("حجم الاستجابة أكبر من المسموح");
      }
      chunks.push(value);
    }
    const text = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
    return { text, finalUrl: url.toString(), contentType: res.headers.get("content-type") ?? "" };
  }
  throw new SafeFetchError("عدد كبير من التحويلات");
}
