/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx",
      // Exclude tests/unit/** - prefer co-located tests in src/
      // Exclude src/tests/** - these are legacy test files, prefer co-located tests
    ],
    exclude: [
      // Legacy test directories (prefer co-located tests in src/)
      "src/tests/**",
      "tests/**",
      // Integration tests (moved to nightly)
      "src/**/*.integration.spec.ts",
      // E2E tests (moved to nightly)
      "src/app/**/**.e2e.spec.ts",
      // Slow tests (moved to nightly)
      "**/*.slow.spec.ts",
      "**/*.slow.spec.tsx",
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
