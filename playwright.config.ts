import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
/** Optional custom Chromium (e.g. in sandboxes without Playwright's browser download). */
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ar-EG",
    // Device time zone deliberately far from Cairo: pages must still show Cairo times.
    timezoneId: "America/New_York",
    screenshot: "only-on-failure",
    trace: "off",
    launchOptions: {
      executablePath,
      args: executablePath ? ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] : [],
    },
  },
  projects: [
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://localhost:${PORT}/api/health`,
    timeout: 900_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
