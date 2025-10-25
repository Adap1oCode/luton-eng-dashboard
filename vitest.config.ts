/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    exclude: [
      // Short-term: exclude heavier suites until build and DB parity stabilize
      "src/**/*.integration.spec.ts",
      "src/tests/integration/**",
      "src/tests/performance/**",
      "src/app/**/**.e2e.spec.ts",
    ],
    setupFiles: ["./vitest.setup.ts"], // dotenv + var mirroring lives here
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
      ],
    },
    // Better test organization
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
