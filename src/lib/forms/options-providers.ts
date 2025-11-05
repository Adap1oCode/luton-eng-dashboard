// ---------------------------------------------------------------------------
// lib/forms/options-providers.ts
// ---------------------------------------------------------------------------
// Central registry mapping optionsKey strings to resource configurations
// for loading dropdown options.

import type { Option } from "./types";

/**
 * Configuration for an options provider.
 * Maps an optionsKey (e.g., "warehouses") to a resource and transform rules.
 */
export type OptionProviderConfig = {
  /** Resource key to fetch from (e.g., "warehouses") */
  resourceKey: string;
  /** Field to use as option.id (UUID or bigint - will be converted to string for dropdown) */
  idField: string;
  /** Field to use as option.label, or function to generate label */
  labelField: string | ((row: any) => string);
  /** Optional default filters (e.g., { is_active: true }) */
  filter?: Record<string, any>;
  /** Optional default sort */
  sort?: { column: string; desc?: boolean };
  /** Optional custom transform function (overrides idField/labelField) */
  transform?: (row: any) => Option;
};

/**
 * Registry of options providers.
 * Add new providers here as needed.
 */
export const OPTIONS_PROVIDERS: Record<string, OptionProviderConfig> = {
  warehouses: {
    resourceKey: "warehouses",
    idField: "id", // UUID - saved to warehouse_id field
    labelField: "name", // Display name shown in dropdown
    filter: { is_active: true }, // Only show active warehouses
    sort: { column: "code", desc: false }, // Sort by code
    // Future: Could combine code + name like: labelField: (w) => `${w.code} - ${w.name}`
  },
  items: {
    resourceKey: "inventory-unique", // Uses friendly alias
    idField: "item_number", // bigint - saved to item_number field
    labelField: (row: any) => {
      const itemNum = String(row.item_number ?? "");
      const desc = row.description ? ` - ${row.description}` : "";
      return `${itemNum}${desc}`;
    },
    sort: { column: "item_number", desc: false }, // Sort by item_number ascending
  },
} as const;


