import type { WarehouseRow } from "./warehouses.config";

/**
 * Transforms raw API response to WarehouseRow.
 * Excludes id from display (used only for routing).
 */
export function toRow(d: any): WarehouseRow {
  return {
    id: String(d?.id ?? ""), // Keep id for routing, but hide in UI
    code: String(d?.code ?? ""),
    name: String(d?.name ?? ""),
    is_active: d?.is_active ?? true,
    created_at: d?.created_at ?? null,
    updated_at: d?.updated_at ?? null,
  };
}


