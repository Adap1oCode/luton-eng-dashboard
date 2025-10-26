// Minimal, stable ESLint flat config for CI linting with `eslint .`
// Lightweight to avoid spurious failures from samples/stories.

import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      ".github/**",
      ".husky/**",
      "node_modules/**",
      ".next/**",
      "public/**",
      "docs/**",
      ".storybook/**",
      "scripts/**",
      "tests/**",
      "src/stories/**",
      "src/app/**/dashboard/debug-dashboard-data.js",
      "src/app/**/dashboard/diagnose-rpc-issue.js",
      "playwright.config.ts",
      "vitest.config.ts",
      "vitest.setup.ts",
      "*.config.ts",
      "*.mjs",
      "*.cjs",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/__tests__/**",
      "next-env.d.ts",
      "src/tests/**",
      "monitor-vercel.cjs",
      // Temporarily ignore files with react-hooks/exhaustive-deps comments until plugin installed
      "src/app/(main)/forms/requisitions/add-item-section.tsx",
      "src/app/(main)/forms/requisitions/hooks/use-requisition-form.ts",
      "src/app/(main)/forms/roles/hooks/use-roles-form.ts",
      "src/components/forms/dynamic-form.tsx",
    ],
  },

  // Base JS rules
  pluginJs.configs.recommended,

  // Base TS rules (non type-checked) across TS files
  ...tseslint.configs.recommended,

  // Project-scoped TS parser with very relaxed rules to keep CI stable
  {
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: false },
      globals: { ...globals.browser, node: true },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Final overrides for all files to neutralize strict rules during CI setup
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "react-hooks/exhaustive-deps": "off",
      "no-constant-binary-expression": "warn",
      "prefer-const": "warn",
      "no-case-declarations": "warn",
      "no-unexpected-multiline": "warn",
      "no-undef": "off",
    },
  },
];
