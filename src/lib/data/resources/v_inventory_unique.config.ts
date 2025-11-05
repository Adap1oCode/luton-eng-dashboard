import type { ResourceConfig } from "../types";

/**
 * Domain type for v_inventory_unique view
 * Represents unique inventory items with their details
 */
export interface InventoryUnique {
  item_number: number; // bigint in DB
  warehouse: string | null;
  location: string | null;
  description: string | null;
  unit_of_measure: string | null;
  event_type: string | null;
  snapshot_date: string | null; // date in DB, ISO string in domain
  content_hash: string | null;
}

/**
 * Input type for v_inventory_unique (read-only view, so minimal)
 */
export type InventoryUniqueInput = {
  item_number?: number;
};

const v_inventory_unique: ResourceConfig<InventoryUnique, InventoryUniqueInput> = {
  table: "v_inventory_unique",
  pk: "item_number",
  select: "item_number, warehouse, location, description, unit_of_measure, event_type, snapshot_date, content_hash",
  search: ["item_number", "description", "warehouse"],
  defaultSort: { column: "item_number", desc: false },

  fromInput: (input: InventoryUniqueInput) => ({
    item_number: input.item_number ?? 0,
  }),

  toDomain: (row: any): InventoryUnique => ({
    item_number: Number(row.item_number),
    warehouse: row.warehouse ?? null,
    location: row.location ?? null,
    description: row.description ?? null,
    unit_of_measure: row.unit_of_measure ?? null,
    event_type: row.event_type ?? null,
    snapshot_date: row.snapshot_date ?? null,
    content_hash: row.content_hash ?? null,
  }),

  schema: {
    fields: {
      item_number: { type: "bigint", readonly: true },
      warehouse: { type: "text", nullable: true, readonly: true },
      location: { type: "text", nullable: true, readonly: true },
      description: { type: "text", nullable: true, readonly: true },
      unit_of_measure: { type: "text", nullable: true, readonly: true },
      event_type: { type: "text", nullable: true, readonly: true },
      snapshot_date: { type: "date", nullable: true, readonly: true },
      content_hash: { type: "text", nullable: true, readonly: true },
    },
  },
};

export default v_inventory_unique;

