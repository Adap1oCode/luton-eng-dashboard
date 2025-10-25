import { supabaseServer } from "@/lib/supabase-server";

export type InventoryRow = {
  item_number: number;
  type: string;
  description: string;
  total_available: number;
  total_checked_out: number;
  total_in_house: number;
  on_order: number;
  committed: number;
  tax_code: string;
  item_cost: string;
  cost_method: string;
  item_list_price: number;
  item_sale_price: number;
  lot: string;
  date_code: string;
  manufacturer: string;
  category: string;
  unit_of_measure: string;
  alt_item_number: string;
  serial_number: string;
  checkout_length: number;
  attachment: string;
  location: string;
  warehouse: string;
  height: number;
  width: number;
  depth: number;
  weight: number;
  max_volume: number;
  event_type: string;
  is_deleted: boolean;
  created_at: string | null;
  updated_at: string | null;
};

// RPC wrapper function that provides API-like interface
export async function getInventoryRows(
  filters: Record<string, any> = {},
  distinct: boolean = false,
  offset: number = 0,
  limit: number = 50
): Promise<{ rows: InventoryRow[]; total: number }> {
  try {
    const supabase = await supabaseServer();
    console.log("🔍 [RPC] Calling get_inventory_rows with:", { filters, distinct, offset, limit });
    
    // Call the existing RPC function
    const { data, error } = await supabase.rpc('get_inventory_rows', {
      _filter: filters,
      _distinct: distinct,
      _range_from: offset,
      _range_to: offset + limit
    });

    if (error) {
      console.error("❌ RPC Error:", error);
      return { rows: [], total: 0 };
    }

    console.log("✅ RPC Success:", data?.length || 0, "rows returned");
    
    // For now, we'll estimate total by adding the limit to the offset
    // In a real implementation, you might want to call the RPC twice or modify it to return total
    const estimatedTotal = offset + (data?.length || 0);
    
    return { 
      rows: (data as InventoryRow[]) || [], 
      total: estimatedTotal 
    };
  } catch (err) {
    console.error("❌ Exception in getInventoryRows RPC:", err);
    return { rows: [], total: 0 };
  }
}


