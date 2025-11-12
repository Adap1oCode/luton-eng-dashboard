import type { ResourceConfig } from "../types";

/**
 * Domain type for v_inventory_current view
 * Represents current inventory items with their details
 */
export interface InventoryCurrent {
  item_number: number | null; // bigint in DB
  warehouse: string | null;
  location: string | null;
  type: string | null;
  description: string | null;
  unit_of_measure: string | null;
  category: string | null;
  stocking_unit: string | null;
  total_available: number | null; // double precision
  total_in_house: number | null; // double precision
  total_checked_out: number | null; // double precision
  on_order: number | null; // double precision
  committed: number | null; // double precision
  tax_code: string | null;
  item_cost: number | null; // numeric(12,2)
  cost_method: string | null;
  item_list_price: number | null; // numeric(12,2)
  item_sale_price: number | null; // numeric(12,2)
  height: number | null; // numeric(12,2)
  width: number | null; // numeric(12,2)
  depth: number | null; // numeric(12,2)
  weight: number | null; // numeric(12,2)
  max_volume: number | null; // numeric(12,2)
  duplicate_item_check: boolean | null;
  inventory_readded: boolean | null;
  inventory_removed: boolean | null;
  is_deleted: boolean | null;
  uom_updated: boolean | null;
  match_status: number | null; // integer
  description_norm: string | null;
  category_new: string | null;
  tally_card_number: string | null;
  tc_bp1: string | null;
  tc_bp2: string | null;
  tc_am1: string | null;
  tc_am2: string | null;
  tc_am3: string | null;
  tc_rtz: string | null;
  tc_bc: string | null;
  tc_cc: string | null;
  tc_bdi: string | null;
  last_sync_date: string | null; // timestamp with time zone
  sync_enum: string | null;
  adj_type: number | null; // integer
  adj_match_code: string | null;
  adj_qty: number | null; // numeric
  adj_date: string | null; // timestamp with time zone
  content_hash: string | null;
  snapshot_date: string | null; // date
  insert_id: number | null; // bigint
}

/**
 * Input type for v_inventory_current (read-only view, so minimal)
 */
export type InventoryCurrentInput = {
  item_number?: number;
};

const v_inventory_current: ResourceConfig<InventoryCurrent, InventoryCurrentInput> = {
  table: "v_inventory_current",
  pk: "item_number",
  select: "item_number, warehouse, location, type, description, unit_of_measure, category, stocking_unit, total_available, total_in_house, total_checked_out, on_order, committed, tax_code, item_cost, cost_method, item_list_price, item_sale_price, height, width, depth, weight, max_volume, duplicate_item_check, inventory_readded, inventory_removed, is_deleted, uom_updated, match_status, description_norm, category_new, tally_card_number, tc_bp1, tc_bp2, tc_am1, tc_am2, tc_am3, tc_rtz, tc_bc, tc_cc, tc_bdi, last_sync_date, sync_enum, adj_type, adj_match_code, adj_qty, adj_date, content_hash, snapshot_date, insert_id",
  search: ["item_number", "description", "warehouse", "category"],
  defaultSort: { column: "item_number", desc: false },

  fromInput: (input: InventoryCurrentInput) => ({
    item_number: input.item_number ?? null,
  }),

  toDomain: (row: any): InventoryCurrent => ({
    item_number: row.item_number != null ? Number(row.item_number) : null,
    warehouse: row.warehouse ?? null,
    location: row.location ?? null,
    type: row.type ?? null,
    description: row.description ?? null,
    unit_of_measure: row.unit_of_measure ?? null,
    category: row.category ?? null,
    stocking_unit: row.stocking_unit ?? null,
    total_available: row.total_available != null ? Number(row.total_available) : null,
    total_in_house: row.total_in_house != null ? Number(row.total_in_house) : null,
    total_checked_out: row.total_checked_out != null ? Number(row.total_checked_out) : null,
    on_order: row.on_order != null ? Number(row.on_order) : null,
    committed: row.committed != null ? Number(row.committed) : null,
    tax_code: row.tax_code ?? null,
    item_cost: row.item_cost != null ? Number(row.item_cost) : null,
    cost_method: row.cost_method ?? null,
    item_list_price: row.item_list_price != null ? Number(row.item_list_price) : null,
    item_sale_price: row.item_sale_price != null ? Number(row.item_sale_price) : null,
    height: row.height != null ? Number(row.height) : null,
    width: row.width != null ? Number(row.width) : null,
    depth: row.depth != null ? Number(row.depth) : null,
    weight: row.weight != null ? Number(row.weight) : null,
    max_volume: row.max_volume != null ? Number(row.max_volume) : null,
    duplicate_item_check: row.duplicate_item_check ?? null,
    inventory_readded: row.inventory_readded ?? null,
    inventory_removed: row.inventory_removed ?? null,
    is_deleted: row.is_deleted ?? null,
    uom_updated: row.uom_updated ?? null,
    match_status: row.match_status != null ? Number(row.match_status) : null,
    description_norm: row.description_norm ?? null,
    category_new: row.category_new ?? null,
    tally_card_number: row.tally_card_number ?? null,
    tc_bp1: row.tc_bp1 ?? null,
    tc_bp2: row.tc_bp2 ?? null,
    tc_am1: row.tc_am1 ?? null,
    tc_am2: row.tc_am2 ?? null,
    tc_am3: row.tc_am3 ?? null,
    tc_rtz: row.tc_rtz ?? null,
    tc_bc: row.tc_bc ?? null,
    tc_cc: row.tc_cc ?? null,
    tc_bdi: row.tc_bdi ?? null,
    last_sync_date: row.last_sync_date ?? null,
    sync_enum: row.sync_enum ?? null,
    adj_type: row.adj_type != null ? Number(row.adj_type) : null,
    adj_match_code: row.adj_match_code ?? null,
    adj_qty: row.adj_qty != null ? Number(row.adj_qty) : null,
    adj_date: row.adj_date ?? null,
    content_hash: row.content_hash ?? null,
    snapshot_date: row.snapshot_date ?? null,
    insert_id: row.insert_id != null ? Number(row.insert_id) : null,
  }),

  schema: {
    fields: {
      item_number: { type: "bigint", nullable: true, readonly: true },
      warehouse: { type: "text", nullable: true, readonly: true },
      location: { type: "text", nullable: true, readonly: true },
      type: { type: "text", nullable: true, readonly: true },
      description: { type: "text", nullable: true, readonly: true },
      unit_of_measure: { type: "text", nullable: true, readonly: true },
      category: { type: "text", nullable: true, readonly: true },
      stocking_unit: { type: "text", nullable: true, readonly: true },
      total_available: { type: "number", nullable: true, readonly: true },
      total_in_house: { type: "number", nullable: true, readonly: true },
      total_checked_out: { type: "number", nullable: true, readonly: true },
      on_order: { type: "number", nullable: true, readonly: true },
      committed: { type: "number", nullable: true, readonly: true },
      tax_code: { type: "text", nullable: true, readonly: true },
      item_cost: { type: "number", nullable: true, readonly: true },
      cost_method: { type: "text", nullable: true, readonly: true },
      item_list_price: { type: "number", nullable: true, readonly: true },
      item_sale_price: { type: "number", nullable: true, readonly: true },
      height: { type: "number", nullable: true, readonly: true },
      width: { type: "number", nullable: true, readonly: true },
      depth: { type: "number", nullable: true, readonly: true },
      weight: { type: "number", nullable: true, readonly: true },
      max_volume: { type: "number", nullable: true, readonly: true },
      duplicate_item_check: { type: "bool", nullable: true, readonly: true },
      inventory_readded: { type: "bool", nullable: true, readonly: true },
      inventory_removed: { type: "bool", nullable: true, readonly: true },
      is_deleted: { type: "bool", nullable: true, readonly: true },
      uom_updated: { type: "bool", nullable: true, readonly: true },
      match_status: { type: "int", nullable: true, readonly: true },
      description_norm: { type: "text", nullable: true, readonly: true },
      category_new: { type: "text", nullable: true, readonly: true },
      tally_card_number: { type: "text", nullable: true, readonly: true },
      tc_bp1: { type: "text", nullable: true, readonly: true },
      tc_bp2: { type: "text", nullable: true, readonly: true },
      tc_am1: { type: "text", nullable: true, readonly: true },
      tc_am2: { type: "text", nullable: true, readonly: true },
      tc_am3: { type: "text", nullable: true, readonly: true },
      tc_rtz: { type: "text", nullable: true, readonly: true },
      tc_bc: { type: "text", nullable: true, readonly: true },
      tc_cc: { type: "text", nullable: true, readonly: true },
      tc_bdi: { type: "text", nullable: true, readonly: true },
      last_sync_date: { type: "timestamp", nullable: true, readonly: true },
      sync_enum: { type: "text", nullable: true, readonly: true },
      adj_type: { type: "int", nullable: true, readonly: true },
      adj_match_code: { type: "text", nullable: true, readonly: true },
      adj_qty: { type: "number", nullable: true, readonly: true },
      adj_date: { type: "timestamp", nullable: true, readonly: true },
      content_hash: { type: "text", nullable: true, readonly: true },
      snapshot_date: { type: "timestamp", nullable: true, readonly: true },
      insert_id: { type: "bigint", nullable: true, readonly: true },
    },
  },
};

export default v_inventory_current;

