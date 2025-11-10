import type { WarehouseLocationRow } from "./warehouse-locations.config";

/**
 * Transforms raw API response to WarehouseLocationRow.
 * Excludes id from display (used only for routing).
 * Includes warehouse_name from enriched view.
 */
export function toRow(d: any): WarehouseLocationRow {
  return {
    id: String(d?.id ?? ""), // Keep id for routing, but hide in UI
    warehouse_id: String(d?.warehouse_id ?? ""),
    warehouse_name: d?.warehouse_name ?? null, // Enriched from view
    warehouse_code: d?.warehouse_code ?? null, // Enriched from view
    name: String(d?.name ?? ""),
    is_active: d?.is_active ?? true,
    created_at: d?.created_at ?? null,
    updated_at: d?.updated_at ?? null,
  };
}

