import { describe, expect, it } from "vitest";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/admin/password";
import { safeAdminPath } from "@/lib/admin/session";
import { signSession, verifySession } from "@/lib/admin/session-token";
import { articleInputSchema } from "@/lib/content/articles";
import { parseFeed } from "@/lib/content/feeds";
import { parseMarkup, safeHref } from "@/lib/content/markup";
import { isPrivateAddress, validatePublicUrl } from "@/lib/content/safe-fetch";
import { serializeJsonLd, sportsEventJsonLd } from "@/lib/seo/jsonld";
import { clampDescription, pageMetadata } from "@/lib/seo/metadata";
import { makeMatch } from "./helpers/factories";

describe("editorial markup (XSS-safe)", () => {
  it("never produces raw HTML or javascript: links", () => {
    const blocks = parseMarkup('## عنوان\n\n<script>alert(1)</script> **مهم** [رابط](javascript:alert(1)) [آمن](https://example.com)\n\n- بند');
    expect(blocks[0]).toMatchObject({ type: "h2" });
    const p = blocks[1];
    expect(p?.type).toBe("p");
    const json = JSON.stringify(blocks);
    expect(json).toContain("<script>alert(1)</script>"); // kept as plain text, rendered escaped by React
    expect(json).not.toContain('"href":"javascript');
    expect(json).toContain('"href":"https://example.com/"');
    expect(blocks[2]).toMatchObject({ type: "ul" });
    expect(safeHref("data:text/html,x")).toBeNull();
  });

  it("validates articles (licensed images need a credit)", () => {
    const base = { title: "عنوان مقال تجريبي طويل", excerpt: "ملخص قصير يزيد على عشرين حرفًا", body: "x".repeat(60), category: "news", status: "draft" };
    expect(articleInputSchema.safeParse(base).success).toBe(true);
    expect(articleInputSchema.safeParse({ ...base, imageUrl: "https://img.example.com/a.jpg" }).success).toBe(false);
    expect(articleInputSchema.safeParse({ ...base, imageUrl: "https://img.example.com/a.jpg", imageCredit: "AP" }).success).toBe(true);
    expect(articleInputSchema.safeParse({ ...base, slug: "Bad Slug!" }).success).toBe(false);
  });
});

describe("RSS headlines", () => {
  it("parses RSS and Atom into headline links only", () => {
    const rss = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[الأهلي يفوز <b>اليوم</b>]]></title><link>https://news.example.com/a</link><pubDate>Tue, 20 Oct 2026 18:00:00 GMT</pubDate><description>full text must be ignored</description></item><item><title>bad</title><link>javascript:alert(1)</link></item></channel></rss>`;
    const items = parseFeed(rss, { id: "s1", name: "مصدر" });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "الأهلي يفوز اليوم", link: "https://news.example.com/a", sourceName: "مصدر" });
    expect(JSON.stringify(items)).not.toContain("full text");
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom headline</title><link rel="alternate" href="https://atom.example.com/x"/><updated>2026-10-20T10:00:00Z</updated></entry></feed>`;
    expect(parseFeed(atom, { id: "s2", name: "Atom" })[0]?.link).toBe("https://atom.example.com/x");
  });
});

describe("SSRF protection", () => {
  it("blocks private, loopback, link-local and non-HTTPS targets", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.5.4", "192.168.1.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(() => validatePublicUrl("http://example.com/feed")).toThrow();
    expect(() => validatePublicUrl("https://localhost/feed")).toThrow();
    expect(() => validatePublicUrl("https://169.254.169.254/latest")).toThrow();
    expect(() => validatePublicUrl("https://user:pass@example.com/")).toThrow();
    expect(() => validatePublicUrl("https://example.com:8443/")).toThrow();
    expect(() => validatePublicUrl("https://other.com/rss", ["example.com"])).toThrow();
    expect(validatePublicUrl("https://news.example.com/rss", ["example.com"]).hostname).toBe("news.example.com");
  });
});

describe("admin authentication", () => {
  it("hashes and verifies passwords with scrypt", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", DUMMY_HASH)).toBe(false);
  });

  it("signs sessions and rejects tampering, expiry and wrong secrets", async () => {
    const secret = "s".repeat(40);
    const now = Math.floor(Date.now() / 1000);
    const token = await signSession({ u: "admin", r: "admin", iat: now, exp: now + 60 }, secret);
    expect((await verifySession(token, secret))?.u).toBe("admin");
    expect(await verifySession(token, "t".repeat(40))).toBeNull();
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ v: 1, u: "admin", r: "admin", iat: now, exp: now + 9999 })).toString("base64url");
    expect(await verifySession(`${forged}.${sig}`, secret)).toBeNull();
    expect(await verifySession(`${body}.${sig}x`, secret)).toBeNull();
    const expired = await signSession({ u: "admin", r: "admin", iat: now - 100, exp: now - 10 }, secret);
    expect(await verifySession(expired, secret)).toBeNull();
  });

  it("prevents open redirects after login", () => {
    expect(safeAdminPath("/admin/news")).toBe("/admin/news");
    expect(safeAdminPath("https://evil.com")).toBe("/admin");
    expect(safeAdminPath("//evil.com")).toBe("/admin");
    expect(safeAdminPath("/admin/../../x")).toBe("/admin");
    expect(safeAdminPath("/admin/login")).toBe("/admin");
  });
});

describe("SEO helpers", () => {
  it("escapes JSON-LD for inline scripts", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script>");
  });

  it("builds structured data only from confirmed facts", () => {
    const m = makeMatch({ code: "NS" });
    const ld = sportsEventJsonLd("https://example.com", m)!;
    expect(ld.location).toBeUndefined();
    expect(ld.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(sportsEventJsonLd("https://example.com", makeMatch({ code: "TBD" }))).toBeNull();
    const pst = sportsEventJsonLd("https://example.com", makeMatch({ code: "PST" }))!;
    expect(pst.eventStatus).toBe("https://schema.org/EventPostponed");
  });

  it("sets canonical URLs and noindex where requested", () => {
    const meta = pageMetadata({ title: "اختبار", description: "وصف", path: "/matches/today", noindex: true });
    expect(meta.alternates?.canonical).toBe("/matches/today");
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(clampDescription("a".repeat(300)).length).toBeLessThanOrEqual(160);
  });
});
