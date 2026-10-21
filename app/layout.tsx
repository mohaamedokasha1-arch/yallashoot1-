import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteNotice, TestDataBanner } from "@/components/layout/SiteNotices";
import { siteUrl } from "@/lib/env";
import { SITE, SKIN_BOOT_SCRIPT } from "@/lib/site";
import "./globals.css";
import "./theme.css";

/*
 * Noto Kufi Arabic (SIL OFL) — a free Kufi face close to the original design's
 * font. Not preloaded: phones use the system font (as in the original design),
 * so they never download it.
 */
const kufiArabic = localFont({
  src: "./fonts/kufi-arabic-wght.woff2",
  variable: "--font-kufi-ar",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFC" }],
});

const kufiLatin = localFont({
  src: "./fonts/kufi-latin-wght.woff2",
  variable: "--font-kufi-latin",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" }],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.title, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { siteName: SITE.name, locale: SITE.locale, type: "website" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, address: false, email: false },
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script may add the `night` class before hydration.
    <html lang="ar" dir="rtl" className={`${kufiArabic.variable} ${kufiLatin.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKIN_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          تخطَّ إلى المحتوى الرئيسي
        </a>
        <SiteHeader />
        <div className="ys-container">
          <TestDataBanner />
          <SiteNotice />
        </div>
        <main id="main" className="ys-main ys-container">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
