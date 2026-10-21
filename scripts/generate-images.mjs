#!/usr/bin/env node
/**
 * Regenerates the static brand images (Open Graph image, apple-touch icon,
 * PWA icons) from HTML using Chromium via Playwright.
 *   CHROMIUM_EXECUTABLE_PATH=/path/to/chrome node scripts/generate-images.mjs
 * (Without the variable, Playwright's own Chromium is used if installed.)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(".");
const fontAr = readFileSync(path.join(root, "app/fonts/kufi-arabic-wght.woff2")).toString("base64");
const fontLa = readFileSync(path.join(root, "app/fonts/kufi-latin-wght.woff2")).toString("base64");
const icon = readFileSync(path.join(root, "app/icon.svg"), "utf8");

const fonts = `
@font-face { font-family: KufiAr; src: url(data:font/woff2;base64,${fontAr}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: KufiLa; src: url(data:font/woff2;base64,${fontLa}) format("woff2"); font-weight: 100 900; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: KufiAr, KufiLa, sans-serif; }
`;

const og = `<!doctype html><html dir="rtl" lang="ar"><head><style>${fonts}
html, body { width: 1200px; height: 630px; background: #eceef2; overflow: hidden; }
.card { width: 1200px; height: 630px; background: #eceef2; display: flex; flex-direction: column; }
.bar { height: 150px; background: #fff; box-shadow: 0 0 8px rgba(0,0,0,.3); display: flex; align-items: center; padding: 0 70px; gap: 40px; }
.logo { background: #931800; color: #fff; border-radius: 14px; padding: 10px 34px 16px; font-size: 76px; font-weight: 500; line-height: 1.25; }
.en { font-family: KufiLa; color: #273340; font-size: 34px; font-weight: 600; letter-spacing: 6px; direction: ltr; }
.body { flex: 1; padding: 50px 70px; display: flex; flex-direction: column; gap: 30px; }
.title { display: inline-flex; align-self: flex-start; background: #931800; color: #fff; border-radius: 14px; padding: 8px 26px 12px; font-size: 46px; }
.tabs { display: flex; gap: 14px; }
.tabs span { color: #fff; border-radius: 12px; padding: 6px 22px 10px; font-size: 32px; }
.y { background: #104783; } .t { background: #931800; } .m { background: rgb(175,81,0); }
p { font-size: 34px; color: #222; }
</style></head><body><div class="card">
<div class="bar"><div class="logo">يلا شوت</div><div class="en">YALLA SHOOT</div></div>
<div class="body">
<div class="tabs"><span class="y">مباريات الأمس</span><span class="t">مباريات اليوم</span><span class="m">مباريات الغد</span></div>
<p>مواعيد ونتائج المباريات بتوقيت القاهرة — الدوري المصري وكأس مصر والبطولات الإفريقية والأوروبية</p>
</div></div></body></html>`;

const iconPage = (size, radius) => `<!doctype html><html><head><style>${fonts}
body { width: ${size}px; height: ${size}px; background: transparent; }
svg { width: ${size}px; height: ${size}px; display: block; }
svg rect { rx: ${radius}; }
</style></head><body>${icon}</body></html>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-gpu"],
});
async function render(html, width, height, out, transparent = false) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, omitBackground: transparent, type: "png" });
  await page.close();
  console.log("wrote", out);
}
await render(og, 1200, 630, "app/opengraph-image.png");
await render(iconPage(180, 0), 180, 180, "app/apple-icon.png");
await render(iconPage(192, 16), 192, 192, "public/icons/icon-192.png", true);
await render(iconPage(512, 16), 512, 512, "public/icons/icon-512.png", true);
await browser.close();
