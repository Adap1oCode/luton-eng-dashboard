import type { ResourceConfig } from "../../types";

export type InventoryDetails = {
  item_number: number;
  type: string;
  description: string;
  total_available: number | null;
  total_checked_out: number | null;
  total_in_house: number | null;
  on_order: number | null;
  committed: number | null;
  tax_code: string | null;
  item_cost: string;
  cost_method: string;
  item_list_price: string;
  item_sale_price: string;
  lot: string | null;
  date_code: string | null;
  manufacturer: string | null;
  category: string | null;
  unit_of_measure: string | null;
  alt_item_number: string | null;
  serial_number: string | null;
  checkout_length: number | null;
  attachment: boolean | null;
  location: string | null;
  warehouse: string | null;
  height: string;
  width: string;
  depth: string;
  weight: string;
  max_volume: string;
  event_type: string | null;
  is_deleted: boolean;
};

export type InventoryDetailsInput = {
  item_number: number;
  type: string;
  description: string;
  total_available?: number | null;
  total_checked_out?: number | null;
  total_in_house?: number | null;
  on_order?: number | null;
  committed?: number | null;
  tax_code?: string | null;
  item_cost: string;
  cost_method: string;
  item_list_price: string;
  item_sale_price: string;
  lot?: string | null;
  date_code?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  unit_of_measure?: string | null;
  alt_item_number?: string | null;
  serial_number?: string | null;
  checkout_length?: number | null;
  attachment?: boolean | null;
  location?: string | null;
  warehouse?: string | null;
  height: string;
  width: string;
  depth: string;
  weight: string;
  max_volume: string;
  event_type?: string | null;
  is_deleted?: boolean;
};

const inventoryDetails: ResourceConfig<InventoryDetails, InventoryDetailsInput> = {
  table: "vw_dashboard_inventory_details_by_uom",
  pk: "item_number",
  select: "item_number, type, description, total_available, total_checked_out, total_in_house, on_order, committed, tax_code, item_cost, cost_method, item_list_price, item_sale_price, lot, date_code, manufacturer, category, unit_of_measure, alt_item_number, serial_number, checkout_length, attachment, location, warehouse, height, width, depth, weight, max_volume, event_type, is_deleted",
  search: ["item_number", "description", "category", "manufacturer", "unit_of_measure"],
  defaultSort: { column: "item_number" },

  fromInput: (input: InventoryDetailsInput) => ({
    item_number: input.item_number,
    type: input.type,
    description: input.description,
    total_available: input.total_available ?? null,
    total_checked_out: input.total_checked_out ?? null,
    total_in_house: input.total_in_house ?? null,
    on_order: input.on_order ?? null,
    committed: input.committed ?? null,
    tax_code: input.tax_code ?? null,
    item_cost: input.item_cost,
    cost_method: input.cost_method,
    item_list_price: input.item_list_price,
    item_sale_price: input.item_sale_price,
    lot: input.lot ?? null,
    date_code: input.date_code ?? null,
    manufacturer: input.manufacturer ?? null,
    category: input.category ?? null,
    unit_of_measure: input.unit_of_measure ?? null,
    alt_item_number: input.alt_item_number ?? null,
    serial_number: input.serial_number ?? null,
    checkout_length: input.checkout_length ?? null,
    attachment: input.attachment ?? null,
    location: input.location ?? null,
    warehouse: input.warehouse ?? null,
    height: input.height,
    width: input.width,
    depth: input.depth,
    weight: input.weight,
    max_volume: input.max_volume,
    event_type: input.event_type ?? null,
    is_deleted: input.is_deleted ?? false,
  }),

  toDomain: (row: unknown) => row as InventoryDetails,

  schema: {
    fields: {
      item_number: { type: "int", readonly: true },
      type: { type: "text", readonly: true },
      description: { type: "text", readonly: true },
      total_available: { type: "number", nullable: true, readonly: true },
      total_checked_out: { type: "number", nullable: true, readonly: true },
      total_in_house: { type: "number", nullable: true, readonly: true },
      on_order: { type: "number", nullable: true, readonly: true },
      committed: { type: "number", nullable: true, readonly: true },
      tax_code: { type: "text", nullable: true, readonly: true },
      item_cost: { type: "text", readonly: true },
      cost_method: { type: "text", readonly: true },
      item_list_price: { type: "text", readonly: true },
      item_sale_price: { type: "text", readonly: true },
      lot: { type: "text", nullable: true, readonly: true },
      date_code: { type: "text", nullable: true, readonly: true },
      manufacturer: { type: "text", nullable: true, readonly: true },
      category: { type: "text", nullable: true, readonly: true },
      unit_of_measure: { type: "text", nullable: true, readonly: true },
      alt_item_number: { type: "text", nullable: true, readonly: true },
      serial_number: { type: "text", nullable: true, readonly: true },
      checkout_length: { type: "number", nullable: true, readonly: true },
      attachment: { type: "bool", nullable: true, readonly: true },
      location: { type: "text", nullable: true, readonly: true },
      warehouse: { type: "text", nullable: true, readonly: true },
      height: { type: "text", readonly: true },
      width: { type: "text", readonly: true },
      depth: { type: "text", readonly: true },
      weight: { type: "text", readonly: true },
      max_volume: { type: "text", readonly: true },
      event_type: { type: "text", nullable: true, readonly: true },
      is_deleted: { type: "bool", readonly: true },
    },
  },
};

export default inventoryDetails;

