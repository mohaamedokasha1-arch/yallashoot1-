import { test as base, expect, type Page } from "@playwright/test";

// Neutral placeholder crest for remote logos (the test sandbox has no internet access).
const CREST = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M20 3 35 8v11c0 9-6.5 15.5-15 18C11.5 34.5 5 28 5 19V8z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/><circle cx="20" cy="19" r="6" fill="#f8fafc"/></svg>',
);

export const MOCK_API = `http://127.0.0.1:${process.env.MOCK_API_PORT ?? 4010}`;

export function cairoDate(offsetDays = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + offsetDays, 12)).toISOString().slice(0, 10);
}

type Fixtures = { consoleErrors: string[] };

export const test = base.extend<Fixtures>({
  consoleErrors: async ({ page }, provide) => {
    const errors: string[] = [];
    await page.route("https://media.api-sports.io/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: CREST }));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    await provide(errors);
  },
});

export { expect };

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(0);
}

export async function canonicalOf(page: Page): Promise<string | null> {
  return page.locator('link[rel="canonical"]').getAttribute("href");
}
