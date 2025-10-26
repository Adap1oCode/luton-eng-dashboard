import type { ResourceConfig } from "../../types";
import { supabaseServer } from "@/lib/supabase-server";

export type UomMetrics = {
  uom: string;
  item_count: number;
};

export type UomMetricsInput = {
  uom: string;
  item_count: number;
};

const inventoryUom: ResourceConfig<UomMetrics, UomMetricsInput> = {
  table: "vw_dashboard_inventory_items_by_uom",
  pk: "uom",
  select: "uom, item_count",
  search: ["uom"],
  defaultSort: { column: "item_count", desc: true },

  fromInput: (input: UomMetricsInput) => ({
    uom: input.uom,
    item_count: input.item_count,
  }),

  toDomain: (row: unknown) => row as UomMetrics,

  schema: {
    fields: {
      uom: { type: "text", readonly: true },
      item_count: { type: "number", readonly: true },
    },
  },
};

export default inventoryUom;

// Data fetching function using the view
export async function getUomMetrics(): Promise<UomMetrics[]> {
  try {
    const supabase = await supabaseServer();
    console.log("🔍 Fetching UoM metrics from view");
    
    const { data, error } = await supabase
      .from("vw_dashboard_inventory_items_by_uom")
      .select("*");

    if (error) {
      console.error("❌ Error fetching UoM metrics:", error);
      return [];
    }

    console.log("✅ Successfully fetched UoM metrics:", data);
    return data as UomMetrics[];
  } catch (err) {
    console.error("❌ Exception in getUomMetrics:", err);
    return [];
  }
}
