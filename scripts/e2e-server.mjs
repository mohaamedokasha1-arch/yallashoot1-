#!/usr/bin/env node
/**
 * End-to-end test server: starts the mock API, builds the site against it and
 * serves the production build on E2E_PORT (default 3100).
 * Used by playwright.config.ts (webServer). Never point this at real keys.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import { rmSync } from "node:fs";
import path from "node:path";

const PORT = process.env.E2E_PORT ?? "3100";
const MOCK_PORT = process.env.MOCK_API_PORT ?? "4010";
const dataDir = path.resolve(".data/e2e");
rmSync(dataDir, { recursive: true, force: true });

export const E2E_ADMIN_PASSWORD = "e2e-admin-password";
const salt = randomBytes(16);
const key = await new Promise((resolve, reject) =>
  scrypt(E2E_ADMIN_PASSWORD, salt, 64, { N: 16384, r: 8, p: 1 }, (err, k) => (err ? reject(err) : resolve(k))),
);
const passwordHash = ["scrypt", 16384, 8, 1, salt.toString("base64url"), key.toString("base64url")].join("$");

const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  FOOTBALL_API_KEY: "test-key",
  FOOTBALL_API_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  YS_DATA_DIR: dataDir,
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD_HASH: passwordHash,
  ADMIN_SESSION_SECRET: randomBytes(36).toString("base64url"),
  CRON_SECRET: "e2e-cron-secret-0123456789",
  SITE_CONTACT_EMAIL: "contact@example.com",
};
for (const name of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN", "VERCEL"]) {
  delete env[name];
}

const children = [];
const stopAll = () => {
  for (const c of children) if (!c.killed) c.kill("SIGTERM");
};
process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});
process.on("exit", stopAll);

const mock = spawn(process.execPath, ["tests/mock-api/server.mjs"], { env: { ...env, MOCK_API_PORT: MOCK_PORT }, stdio: "inherit" });
children.push(mock);
await new Promise((r) => setTimeout(r, 500));

const nextBin = path.resolve("node_modules/next/dist/bin/next");
if (!process.env.E2E_SKIP_BUILD) {
  const build = spawnSync(process.execPath, [nextBin, "build"], { env, stdio: "inherit" });
  if (build.status !== 0) {
    console.error("[e2e] build failed");
    stopAll();
    process.exit(build.status ?? 1);
  }
}

const server = spawn(process.execPath, [nextBin, "start", "-p", PORT, "-H", "0.0.0.0"], { env, stdio: "inherit" });
children.push(server);
server.on("exit", (code) => {
  stopAll();
  process.exit(code ?? 0);
});
