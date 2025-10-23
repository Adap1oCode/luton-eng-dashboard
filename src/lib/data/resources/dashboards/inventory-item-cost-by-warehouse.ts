import type { ResourceConfig } from "../../types";

export type InventoryItemCostByWarehouse = {
  warehouse: string;
  missing_cost_count: number;
  total_items: number;
  missing_cost_percentage: number;
};

export type InventoryItemCostByWarehouseInput = {
  warehouse: string;
  missing_cost_count: number;
  total_items: number;
  missing_cost_percentage: number;
};

const inventoryItemCostByWarehouse: ResourceConfig<InventoryItemCostByWarehouse, InventoryItemCostByWarehouseInput> = {
  table: "vw_dashboard_inventory_item_cost_by_warehouse",
  pk: "warehouse",
  select: "warehouse, missing_cost_count, total_items, missing_cost_percentage",
  search: ["warehouse"],
  defaultSort: { column: "missing_cost_count", desc: true },

  fromInput: (input: InventoryItemCostByWarehouseInput) => ({
    warehouse: input.warehouse,
    missing_cost_count: input.missing_cost_count,
    total_items: input.total_items,
    missing_cost_percentage: input.missing_cost_percentage,
  }),

  toDomain: (row: unknown) => row as InventoryItemCostByWarehouse,

  schema: {
    fields: {
      warehouse: { type: "text", readonly: true },
      missing_cost_count: { type: "number", readonly: true },
      total_items: { type: "number", readonly: true },
      missing_cost_percentage: { type: "number", readonly: true },
    },
  },
};

export default inventoryItemCostByWarehouse;

