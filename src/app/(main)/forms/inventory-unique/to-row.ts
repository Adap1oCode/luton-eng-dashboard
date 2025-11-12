import type { InventoryUniqueRow } from "./inventory-unique.config";

/**
 * Transforms raw API response to InventoryUniqueRow.
 * Maps all fields from v_inventory_unique view.
 */
export function toRow(d: any): InventoryUniqueRow {
  const itemNumber = d?.item_number != null ? Number(d.item_number) : null;
  const rawId =
    itemNumber ??
    d?.content_hash ??
    `${d?.warehouse ?? "unknown"}|${d?.location ?? "unknown"}|${d?.description ?? "unknown"}`;
  return {
    id: typeof rawId === "number" ? `inventory-unique-${rawId}` : String(rawId ?? "inventory-unique-unknown"),
    item_number: itemNumber ?? 0,
    warehouse: d?.warehouse ?? null,
    location: d?.location ?? null,
    description: d?.description ?? null,
    unit_of_measure: d?.unit_of_measure ?? null,
    event_type: d?.event_type ?? null,
    snapshot_date: d?.snapshot_date ?? null,
    content_hash: d?.content_hash ?? null,
  };
}


