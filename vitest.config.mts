import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      // `server-only` throws outside the React Server environment; tests run in plain Node.
      "server-only": path.join(root, "tests/unit/helpers/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/helpers/setup.ts"],
    restoreMocks: true,
    testTimeout: 15000,
  },
});
