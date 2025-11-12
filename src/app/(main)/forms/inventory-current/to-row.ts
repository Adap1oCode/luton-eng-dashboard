import type { InventoryCurrentRow } from "./inventory-current.config";

/**
 * Transforms raw API response to InventoryCurrentRow.
 * Maps all fields from v_inventory_current view.
 */
export function toRow(d: any): InventoryCurrentRow {
  const itemNumber = d?.item_number != null ? Number(d.item_number) : null;
  const insertId = d?.insert_id != null ? Number(d.insert_id) : null;
  const contentHash = d?.content_hash ?? null;
  const fallbackIdSource = `${d?.warehouse ?? "unknown"}|${d?.location ?? "unknown"}|${d?.description ?? "unknown"}`;
  const rawId = itemNumber ?? insertId ?? contentHash ?? fallbackIdSource;
  return {
    id: typeof rawId === "number" ? `inventory-current-${rawId}` : String(rawId ?? "inventory-current-unknown"),
    item_number: itemNumber,
    warehouse: d?.warehouse ?? null,
    location: d?.location ?? null,
    type: d?.type ?? null,
    description: d?.description ?? null,
    unit_of_measure: d?.unit_of_measure ?? null,
    category: d?.category ?? null,
    stocking_unit: d?.stocking_unit ?? null,
    total_available: d?.total_available != null ? Number(d.total_available) : null,
    total_in_house: d?.total_in_house != null ? Number(d.total_in_house) : null,
    total_checked_out: d?.total_checked_out != null ? Number(d.total_checked_out) : null,
    on_order: d?.on_order != null ? Number(d.on_order) : null,
    committed: d?.committed != null ? Number(d.committed) : null,
    tax_code: d?.tax_code ?? null,
    item_cost: d?.item_cost != null ? Number(d.item_cost) : null,
    cost_method: d?.cost_method ?? null,
    item_list_price: d?.item_list_price != null ? Number(d.item_list_price) : null,
    item_sale_price: d?.item_sale_price != null ? Number(d.item_sale_price) : null,
    height: d?.height != null ? Number(d.height) : null,
    width: d?.width != null ? Number(d.width) : null,
    depth: d?.depth != null ? Number(d.depth) : null,
    weight: d?.weight != null ? Number(d.weight) : null,
    max_volume: d?.max_volume != null ? Number(d.max_volume) : null,
    duplicate_item_check: d?.duplicate_item_check ?? null,
    inventory_readded: d?.inventory_readded ?? null,
    inventory_removed: d?.inventory_removed ?? null,
    is_deleted: d?.is_deleted ?? null,
    uom_updated: d?.uom_updated ?? null,
    match_status: d?.match_status != null ? Number(d.match_status) : null,
    description_norm: d?.description_norm ?? null,
    category_new: d?.category_new ?? null,
    tally_card_number: d?.tally_card_number ?? null,
    tc_bp1: d?.tc_bp1 ?? null,
    tc_bp2: d?.tc_bp2 ?? null,
    tc_am1: d?.tc_am1 ?? null,
    tc_am2: d?.tc_am2 ?? null,
    tc_am3: d?.tc_am3 ?? null,
    tc_rtz: d?.tc_rtz ?? null,
    tc_bc: d?.tc_bc ?? null,
    tc_cc: d?.tc_cc ?? null,
    tc_bdi: d?.tc_bdi ?? null,
    last_sync_date: d?.last_sync_date ?? null,
    sync_enum: d?.sync_enum ?? null,
    adj_type: d?.adj_type != null ? Number(d.adj_type) : null,
    adj_match_code: d?.adj_match_code ?? null,
    adj_qty: d?.adj_qty != null ? Number(d.adj_qty) : null,
    adj_date: d?.adj_date ?? null,
    content_hash: d?.content_hash ?? null,
    snapshot_date: d?.snapshot_date ?? null,
    insert_id: d?.insert_id != null ? Number(d.insert_id) : null,
  };
}

