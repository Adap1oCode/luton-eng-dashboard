// src/app/(main)/dashboard/inventory/_components/data.ts

import { supabase } from "@/lib/supabase";

export type Inventory = {
  [key: string]: any;
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
  stocking_unit: string | null;
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

// Fetch all inventory rows, paginated to avoid Supabase's 1,000-row limit
export async function getInventory(): Promise<Inventory[]> {
  const PAGE_SIZE = 1000;
  let from = 0;
  const allRecords: Inventory[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching inventory batch:", { from, error });
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    console.log(`Fetched ${data.length} rows from inventory (offset ${from})`);
    allRecords.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  // Normalize defaults
  return allRecords.map((r) => ({
    ...r,
    item_number: r.item_number ?? 0,
    type: r.type ?? "",
    description: r.description ?? "",
    total_available: r.total_available ?? 0,
    total_checked_out: r.total_checked_out ?? 0,
    total_in_house: r.total_in_house ?? 0,
    on_order: r.on_order ?? 0,
    committed: r.committed ?? 0,
    tax_code: r.tax_code ?? "",
    item_cost: r.item_cost ?? "",
    cost_method: r.cost_method ?? "",
    item_list_price: r.item_list_price ?? "",
    item_sale_price: r.item_sale_price ?? "",
    lot: r.lot ?? "",
    date_code: r.date_code ?? "",
    manufacturer: r.manufacturer ?? "",
    category: r.category ?? "",
    stocking_unit: r.stocking_unit ?? "",
    alt_item_number: r.alt_item_number ?? "",
    serial_number: r.serial_number ?? "",
    checkout_length: r.checkout_length ?? null,
    attachment: r.attachment ?? false,
    location: r.location ?? "",
    warehouse: r.warehouse ?? "",
    height: r.height ?? "",
    width: r.width ?? "",
    depth: r.depth ?? "",
    weight: r.weight ?? "",
    max_volume: r.max_volume ?? "",
    event_type: r.event_type ?? "",
    is_deleted: r.is_deleted ?? false,
  }));
}

// The shape of the single row returned by our materialized view
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

/**
 * Fetch the pre-computed summary row from our materialized view.
 * We use `.select<InventorySummary>()` rather than a generic on `.from()`
 * to satisfy the Supabase typings without needing two type arguments.
 */
export async function getInventorySummary(): Promise<InventorySummary> {
  // don’t try to use .select<InventorySummary>() here
  const { data, error } = await supabase.from("vw_dashboard_inventory_summary").select("*").single();

  if (error || !data) {
    console.error("Error fetching inventory summary:", error);
    throw error;
  }

  // assert that the returned row matches our TS type
  return data as InventorySummary;
}

/**
 * Fetch a page of inventory rows according to an arbitrary filter,
 * with optional distinct-on(item_number) de-duplication.
 *
 * @param filter   A JSON object like { column: 'total_available', op: '=', value: '0' }
 * @param distinct When true, returns one row per item_number (latest by updated_at)
 * @param from     Zero-based offset
 * @param to       Inclusive upper bound for pagination
 */
export async function getInventoryRows(
  filter: Record<string, any>,
  distinct = false,
  from = 0,
  to = 49,
): Promise<Inventory[]> {
  const { data, error } = await supabase.rpc("get_inventory_rows", {
    _filter: filter,
    _distinct: distinct,
    _range_from: from,
    _range_to: to,
  });

  if (error) {
    console.error("Error fetching filtered inventory rows:", { filter, distinct, from, to, error });
    throw error;
  }

  return (data as Inventory[]) || [];
}
