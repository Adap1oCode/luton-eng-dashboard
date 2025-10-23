import type { ResourceConfig } from "../../types";
import { supabaseServer } from "@/lib/supabase-server";

export type WarehouseInventoryMetrics = {
  warehouse: string;
  total_available_stock: number;
  total_on_order_quantity: number;
  total_committed_quantity: number;
  out_of_stock_count: number;
  total_on_order_value: number;
  total_inventory_value: number;
  total_committed_value: number;
  missing_cost_count: number;
};

export type WarehouseInventoryMetricsInput = {
  warehouse: string;
  total_available_stock: number;
  total_on_order_quantity: number;
  total_committed_quantity: number;
  out_of_stock_count: number;
  total_on_order_value: number;
  total_inventory_value: number;
  total_committed_value: number;
  missing_cost_count: number;
};

const inventoryWarehouse: ResourceConfig<WarehouseInventoryMetrics, WarehouseInventoryMetricsInput> = {
  table: "vw_dashboard_inventory_by_warehouse",
  pk: "warehouse",
  select: "warehouse, total_available_stock, total_on_order_quantity, total_committed_quantity, out_of_stock_count, total_on_order_value, total_inventory_value, total_committed_value, missing_cost_count",
  search: ["warehouse"],
  defaultSort: { column: "total_available_stock", desc: true },

  fromInput: (input: WarehouseInventoryMetricsInput) => ({
    warehouse: input.warehouse,
    total_available_stock: input.total_available_stock,
    total_on_order_quantity: input.total_on_order_quantity,
    total_committed_quantity: input.total_committed_quantity,
    out_of_stock_count: input.out_of_stock_count,
    total_on_order_value: input.total_on_order_value,
    total_inventory_value: input.total_inventory_value,
    total_committed_value: input.total_committed_value,
    missing_cost_count: input.missing_cost_count,
  }),

  toDomain: (row: unknown) => row as WarehouseInventoryMetrics,

  schema: {
    fields: {
      warehouse: { type: "text", readonly: true },
      total_available_stock: { type: "number", readonly: true },
      total_on_order_quantity: { type: "number", readonly: true },
      total_committed_quantity: { type: "number", readonly: true },
      out_of_stock_count: { type: "number", readonly: true },
      total_on_order_value: { type: "number", readonly: true },
      total_inventory_value: { type: "number", readonly: true },
      total_committed_value: { type: "number", readonly: true },
      missing_cost_count: { type: "number", readonly: true },
    },
  },
};

export default inventoryWarehouse;

// Data fetching function using the view
export async function getWarehouseInventoryMetrics(): Promise<WarehouseInventoryMetrics[]> {
  try {
    const supabase = await supabaseServer();
    console.log("🔍 Fetching warehouse metrics from view");
    
    const { data, error } = await supabase
      .from("vw_dashboard_inventory_by_warehouse")
      .select("*");

    if (error) {
      console.error("❌ Error fetching warehouse metrics:", error);
      return [];
    }

    console.log("✅ Successfully fetched warehouse metrics:", data);
    return data as WarehouseInventoryMetrics[];
  } catch (err) {
    console.error("❌ Exception in getWarehouseInventoryMetrics:", err);
    return [];
  }
}
