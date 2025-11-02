import type { ResourceConfig } from "../../types";
import { supabaseServer } from "@/lib/supabase-server";

export type InventorySummary = {
  total_inventory_records: number;
  unique_item_count: number;
  total_available_stock: number;
  total_on_order_quantity: number;
  total_committed_quantity: number;
  out_of_stock_count: number;
  total_on_order_value: number;
  total_inventory_value: number;
  total_committed_value: number;
};

export type InventorySummaryInput = {
  total_inventory_records: number;
  unique_item_count: number;
  total_available_stock: number;
  total_on_order_quantity: number;
  total_committed_quantity: number;
  out_of_stock_count: number;
  total_on_order_value: number;
  total_inventory_value: number;
  total_committed_value: number;
};

const inventory_summary: ResourceConfig<InventorySummary, InventorySummaryInput> = {
  table: "vw_dashboard_inventory_summary",
  pk: "total_inventory_records", // Use a field that exists as primary key
  select: "total_inventory_records, unique_item_count, total_available_stock, total_on_order_quantity, total_committed_quantity, out_of_stock_count, total_on_order_value, total_inventory_value, total_committed_value",
  // No search needed for summary data
  // No pagination needed for single row
  defaultSort: { column: "total_inventory_records" },

  fromInput: (input: InventorySummaryInput) => ({
    total_inventory_records: input.total_inventory_records,
    unique_item_count: input.unique_item_count,
    total_available_stock: input.total_available_stock,
    total_on_order_quantity: input.total_on_order_quantity,
    total_committed_quantity: input.total_committed_quantity,
    out_of_stock_count: input.out_of_stock_count,
    total_on_order_value: input.total_on_order_value,
    total_inventory_value: input.total_inventory_value,
    total_committed_value: input.total_committed_value,
  }),

  toDomain: (row: unknown) => row as InventorySummary,

  schema: {
    fields: {
      total_inventory_records: { type: "number", readonly: true },
      unique_item_count: { type: "number", readonly: true },
      total_available_stock: { type: "number", readonly: true },
      total_on_order_quantity: { type: "number", readonly: true },
      total_committed_quantity: { type: "number", readonly: true },
      out_of_stock_count: { type: "number", readonly: true },
      total_on_order_value: { type: "number", readonly: true },
      total_inventory_value: { type: "number", readonly: true },
      total_committed_value: { type: "number", readonly: true },
    },
  },
};

export default inventory_summary;

// Data fetching function using the view
export async function getInventorySummary(): Promise<InventorySummary> {
  try {
    const supabase = await supabaseServer();
    console.log("🔍 Fetching inventory summary from view");
    
    const { data, error } = await supabase
      .from("vw_dashboard_inventory_summary")
      .select("*")
      .single();

    if (error) {
      console.error("❌ Error fetching inventory summary:", error);
      return {
        total_inventory_records: 0,
        unique_item_count: 0,
        total_available_stock: 0,
        total_on_order_quantity: 0,
        total_committed_quantity: 0,
        out_of_stock_count: 0,
        total_on_order_value: 0,
        total_inventory_value: 0,
        total_committed_value: 0,
      };
    }

    console.log("✅ Successfully fetched inventory summary:", data);
    return data as InventorySummary;
  } catch (err) {
    console.error("❌ Exception in getInventorySummary:", err);
    return {
      total_inventory_records: 0,
      unique_item_count: 0,
      total_available_stock: 0,
      total_on_order_quantity: 0,
      total_committed_quantity: 0,
      out_of_stock_count: 0,
      total_on_order_value: 0,
      total_inventory_value: 0,
      total_committed_value: 0,
    };
  }
}

// Additional function for getting inventory rows
export async function getInventoryRows(): Promise<any[]> {
  try {
    const supabase = await supabaseServer();
    console.log("🔍 Fetching inventory rows");
    
    const { data, error } = await supabase.from("inventory").select("*");

    if (error) {
      console.error("❌ Error fetching inventory rows:", error);
      return [];
    }

    console.log("✅ Successfully fetched inventory rows:", data?.length || 0);
    return data || [];
  } catch (err) {
    console.error("❌ Exception in getInventoryRows:", err);
    return [];
  }
}
