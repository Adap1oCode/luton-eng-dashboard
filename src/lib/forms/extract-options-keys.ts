// ---------------------------------------------------------------------------
// lib/forms/extract-options-keys.ts
// ---------------------------------------------------------------------------
// Utility to extract all optionsKey values from a FormConfig.
// Used to determine which options need to be loaded.

import type { FormConfig } from "@/components/forms/dynamic-form";
import { getAllFields } from "./config-normalize";

/**
 * Extracts all unique optionsKey values from a FormConfig.
 * Checks both top-level fields and fields within sections.
 * 
 * @param config - Form configuration to scan
 * @returns Array of unique optionsKey strings (e.g., ["warehouses", "items"])
 * 
 * @example
 * ```typescript
 * const keys = extractOptionsKeys(tallyCardCreateConfig);
 * // Returns: ["warehouses"]
 * ```
 */
export function extractOptionsKeys(config: FormConfig): string[] {
  const keys = new Set<string>();

  // Get all fields (from sections or top-level fields)
  const allFields = getAllFields(config);

  // Collect unique optionsKey values
  for (const field of allFields) {
    if (field.optionsKey) {
      keys.add(field.optionsKey);
    }
  }

  return Array.from(keys);
}

