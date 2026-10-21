import type { NextConfig } from "next";

/**
 * Security headers are computed when the config is loaded (at build time for
 * `next build`). Change the env vars below and rebuild to apply new values.
 */
const isDev = process.env.NODE_ENV === "development";

/** `frame-ancestors` value. Default `'none'` (the site cannot be embedded). */
const frameAncestors = process.env.FRAME_ANCESTORS?.trim() || "'none'";

/** Hosts allowed to serve images (team/league logos come from API-Sports media CDN). */
const imageHosts = [
  "https://media.api-sports.io",
  "https://*.api-sports.io",
  ...(process.env.EXTRA_IMAGE_HOSTS ?? "")
    .split(/[\s,]+/)
    .map((h) => h.trim())
    .filter((h) => /^https?:\/\/[a-z0-9.*:-]+$/i.test(h)),
];

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; a nonce-based CSP would force
  // every page to render dynamically, which defeats static/ISR caching.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imageHosts.join(" ")}`,
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  `frame-ancestors ${frameAncestors}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(frameAncestors === "'none'" ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(/[\s,]+/)
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),

  /**
   * Cache profiles used with `cacheLife()`. Values are seconds.
   * Provider request budgets are enforced separately by the data layer
   * (lib/football/cache.ts), so these only control how often pages re-render.
   */
  cacheLife: {
    // Live scores and today's fixtures.
    live: { stale: 30, revalidate: 30, expire: 600 },
    // Fixtures for a given day / upcoming matches.
    fixtures: { stale: 60, revalidate: 120, expire: 3600 },
    // League tables, scorers.
    standings: { stale: 120, revalidate: 600, expire: 86400 },
    // Leagues list, teams, squads, players.
    reference: { stale: 300, revalidate: 21600, expire: 604800 },
    // Finished matches and past dates.
    archive: { stale: 300, revalidate: 43200, expire: 2592000 },
    // News headlines from the RSS sources (the feeds themselves are re-fetched
    // at most every 30 minutes by lib/content/feeds.ts).
    news: { stale: 300, revalidate: 900, expire: 86400 },
    // Error / not-configured states: retry soon.
    retry: { stale: 30, revalidate: 60, expire: 300 },
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.api-sports.io", pathname: "/**" }],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },

  async redirects() {
    return [
      { source: "/matches", destination: "/matches/today", permanent: false },
      { source: "/matches/date", destination: "/matches/today", permanent: false },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
