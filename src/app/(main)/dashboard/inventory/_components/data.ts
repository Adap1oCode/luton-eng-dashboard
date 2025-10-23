// src/app/(main)/dashboard/inventory/_components/data.ts
"use server"

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

export type InventoryRow = {
  item_number: number;
  description: string;
  warehouse: string;
  total_available: number;
  on_order: number;
  committed: number;
  item_cost: string;
  uom: string;
  status: string;
  created_by: string;
  _totalCount?: number; // Added for temporary total count passing
};

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

export type UomMetrics = {
  uom: string;
  item_count: number;
};

/**
 * Get inventory summary data from API
 */
export async function getInventorySummary(): Promise<InventorySummary> {
  try {
    console.log("🔍 Fetching inventory summary from API");
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inventory-summary`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Successfully fetched inventory summary from API:", data);
    
    // Extract the first row from the API response
    const summaryData = data.rows?.[0];
    if (!summaryData) {
      throw new Error("No summary data found in API response");
    }
    
    return summaryData;
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

/**
 * Get inventory rows from API - returns both data and total count
 */
export async function getInventoryRows(
  filter: any = {},
  distinct: boolean = false,
  offset: number = 0,
  limit: number = 50
): Promise<{ rows: InventoryRow[]; total: number }> {
  try {
    console.log("🔍 Fetching inventory rows from API with filter:", filter, "distinct:", distinct, "offset:", offset, "limit:", limit);
    
    const params = new URLSearchParams({
      page: Math.floor(offset / limit) + 1 + '',
      pageSize: limit + '',
    });
    
    // Add distinct parameter if needed
    if (distinct) {
      params.set('distinct', 'true');
    }
    
    // Add simple filters to params
    if (filter && Object.keys(filter).length > 0) {
      for (const [key, value] of Object.entries(filter)) {
        if (typeof value === 'object' && value !== null) {
          // Handle complex filters - for now, skip them as API doesn't support them yet
          if ('isNotNull' in value && value.isNotNull) {
            // Skip for now - would need API support
          } else if ('equals' in value && value.equals !== undefined && value.equals !== null) {
            params.set(key, value.equals.toString());
          }
        } else {
          // Simple key-value filter
          params.set(key, String(value));
        }
      }
    }
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inventory-details?${params}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
        const data = await response.json();
        console.log("✅ Successfully fetched inventory rows from API:", data.rows?.length || 0, "total:", data.total);
        return { rows: data.rows || [], total: data.total || 0 };
  } catch (err) {
    console.error("❌ Exception in getInventoryRows:", err);
    return { rows: [], total: 0 };
  }
}

/**
 * Get warehouse inventory metrics from API
 */
export async function getWarehouseInventoryMetrics(): Promise<WarehouseInventoryMetrics[]> {
  try {
    console.log("🔍 Fetching warehouse metrics from API");
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inventory-warehouse`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Successfully fetched warehouse metrics from API:", data.rows?.length || 0);
    return data.rows || [];
  } catch (err) {
    console.error("❌ Exception in getWarehouseInventoryMetrics:", err);
    return [];
  }
}

/**
 * Get UoM metrics from API
 */
export async function getUomMetrics(): Promise<UomMetrics[]> {
  try {
    console.log("🔍 Fetching UoM metrics from API");
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inventory-uom`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Successfully fetched UoM metrics from API:", data.rows?.length || 0);
    return data.rows || [];
  } catch (err) {
    console.error("❌ Exception in getUomMetrics:", err);
    return [];
  }
}
