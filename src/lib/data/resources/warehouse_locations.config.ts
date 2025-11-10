import type { ResourceConfig, UUID } from "../types";

/**
 * Domain type for warehouse_locations table
 * Represents a location within a warehouse
 */
export interface WarehouseLocation {
  id: UUID;
  warehouse_id: UUID;
  warehouse_name: string | null; // Enriched from warehouses table
  warehouse_code: string | null; // Enriched from warehouses table
  name: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Input type for warehouse_locations (create/update)
 */
export type WarehouseLocationInput = {
  warehouse_id: UUID;
  name: string;
  is_active?: boolean;
};

const warehouse_locations: ResourceConfig<WarehouseLocation, WarehouseLocationInput> = {
  // Use base table - warehouse name will be enriched server-side (like history enrichment)
  table: "warehouse_locations",
  pk: "id",
  select: "id, warehouse_id, name, is_active, created_at, updated_at",
  search: ["name"],
  activeFlag: "is_active",
  defaultSort: { column: "name", desc: false }, // Will be enriched to sort by warehouse name

  // 🔒 Warehouse scoping (locations belong to a warehouse)
  warehouseScope: {
    mode: "column",
    column: "warehouse_id",
  },

  fromInput: (input: WarehouseLocationInput) => ({
    warehouse_id: input.warehouse_id,
    name: String(input.name).trim(),
    is_active: input.is_active ?? true,
  }),

  toDomain: (row: unknown) => row as WarehouseLocation,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      warehouse_id: { type: "uuid", write: true },
      warehouse_name: { type: "text", nullable: true, readonly: true },
      warehouse_code: { type: "text", nullable: true, readonly: true },
      name: { type: "text", write: true },
      is_active: { type: "bool", write: true },
      created_at: { type: "timestamp", nullable: true, readonly: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
    },
  },
};

export default warehouse_locations;

