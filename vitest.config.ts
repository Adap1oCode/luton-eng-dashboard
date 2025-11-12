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
    testTimeout: 30000, // Increased from 10s to 30s to prevent hanging tests
    hookTimeout: 30000, // Increased from 10s to 30s to prevent hanging hooks
    bail: 1, // Stop on first failure to fail fast
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
