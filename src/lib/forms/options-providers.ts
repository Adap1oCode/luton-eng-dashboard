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
  /** Resource key to fetch from (e.g., "warehouses") or "static" for static options */
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
  /** Optional static options loader (for non-resource options like reason codes) */
  staticOptions?: () => Promise<Option[]>;
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
  roles: {
    resourceKey: "roles",
    idField: "id", // UUID - saved to role_id field
    labelField: (row: any) => {
      const code = row.role_code ? `${row.role_code}` : "";
      const name = row.role_name ? ` - ${row.role_name}` : "";
      return `${code}${name}` || "Unknown Role";
    },
    filter: { is_active: true }, // Only show active roles
    sort: { column: "role_code", desc: false }, // Sort by role_code
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
  reasonCodes: {
    resourceKey: "static", // Special key for static options
    idField: "value",
    labelField: "label",
    // Static options loaded from config
    staticOptions: async () => {
      const { STOCK_ADJUSTMENT_REASON_CODES } = await import("@/lib/config/stock-adjustment-reason-codes");
      return STOCK_ADJUSTMENT_REASON_CODES.map((code) => ({
        id: code.value,
        label: code.label,
      }));
    },
  },
  warehouseLocations: {
    resourceKey: "warehouse-locations", // API endpoint resource key
    idField: "id", // Use UUID for React key uniqueness
    labelField: "name", // Display name shown in dropdown
    filter: { is_active: true }, // Only show active locations
    sort: { column: "name", desc: false }, // Sort by name ascending
    // Transform: Use UUID as id (for React key), but store name as value (since location field stores name, not UUID)
    // Since we filter by warehouse_id, location names should be unique within a warehouse
    // Use UUID as the React key for guaranteed uniqueness
    transform: (row: any) => {
      const uuid = row?.id;
      const name = String(row?.name ?? "");
      
      // Use UUID as React key (should always be present and unique)
      // Fallback to warehouse_id-name combo only if UUID is missing (shouldn't happen with valid data)
      const warehouseId = String(row?.warehouse_id ?? "");
      const uniqueId = uuid && typeof uuid === "string" && uuid.length >= 32
        ? String(uuid)
        : (warehouseId && name ? `${warehouseId}-${name}` : `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      
      return {
        id: uniqueId, // UUID for React key (unique within warehouse since we filter by warehouse_id)
        label: name, // Display name
        value: name, // Location name to save to form (location field stores name, not UUID)
      };
    },
  },
} as const;


