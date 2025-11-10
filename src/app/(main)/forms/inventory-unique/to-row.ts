import type { InventoryUniqueRow } from "./inventory-unique.config";

/**
 * Transforms raw API response to InventoryUniqueRow.
 * Maps all fields from v_inventory_unique view.
 */
export function toRow(d: any): InventoryUniqueRow {
  return {
    item_number: d?.item_number != null ? Number(d.item_number) : 0,
    warehouse: d?.warehouse ?? null,
    location: d?.location ?? null,
    description: d?.description ?? null,
    unit_of_measure: d?.unit_of_measure ?? null,
    event_type: d?.event_type ?? null,
    snapshot_date: d?.snapshot_date ?? null,
    content_hash: d?.content_hash ?? null,
  };
}


