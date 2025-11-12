/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Nightly test configuration for integration, E2E, and performance tests.
 * These tests run on a schedule, not on every PR, due to runtime and flakiness.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      // Integration tests
      "src/**/*.integration.spec.ts",
      "src/tests/integration/**",
      "tests/integration/**",
      // E2E tests
      "src/app/**/**.e2e.spec.ts",
      "tests/e2e/**",
      // Performance tests
      "src/tests/performance/**",
      "tests/performance/**",
      // Slow tests
      "**/*.slow.spec.ts",
      "**/*.slow.spec.tsx",
    ],
    exclude: [
      // Unit tests (run in verify job)
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx",
      "tests/unit/**",
    ],
    setupFiles: ["./vitest.setup.ts"],
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
    testTimeout: 30000, // Longer timeout for integration/E2E
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

















