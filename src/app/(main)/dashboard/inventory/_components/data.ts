// src/app/(main)/dashboard/inventory/_components/data.ts

import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────────────────────────
// ─── Types
// ──────────────────────────────────────────────────────────────

/**
 * Represents a single inventory row
 */
export type Inventory = {
  item_number: number
  type: string
  description: string
  total_available: number | null
  total_checked_out: number | null
  total_in_house: number | null
  on_order: number | null
  committed: number | null
  tax_code: string | null
  item_cost: string
  cost_method: string
  item_list_price: string
  item_sale_price: string
  lot: string | null
  date_code: string | null
  manufacturer: string | null
  category: string | null
  stocking_unit: string | null
  alt_item_number: string | null
  serial_number: string | null
  checkout_length: number | null
  attachment: boolean | null
  location: string | null
  warehouse: string | null
  height: string
  width: string
  depth: string
  weight: string
  max_volume: string
  event_type: string | null
  is_deleted: boolean
}

/**
 * Summary of overall inventory counts and values
 */
export type InventorySummary = {
  total_inventory_records: number
  unique_item_count: number
  total_available_stock: number
  total_on_order_quantity: number
  total_committed_quantity: number
  out_of_stock_count: number
  total_on_order_value: number
  total_inventory_value: number
  total_committed_value: number
}

/**
 * Per-warehouse aggregated metrics (pre-calculated)
 */
export type WarehouseInventoryMetrics = {
  warehouse: string
  total_available_stock: number
  total_on_order_quantity: number
  total_committed_quantity: number
  out_of_stock_count: number
  total_on_order_value: number
  total_inventory_value: number
  total_committed_value: number
  missing_cost_count: number
}

// ──────────────────────────────────────────────────────────────
// ─── Summary Fetchers
// ──────────────────────────────────────────────────────────────

/**
 * Fetch the pre-computed summary row from our materialized view
 */
export async function getInventorySummary(): Promise<InventorySummary> {
  const { data, error } = await supabase
    .from('vw_dashboard_inventory_summary')
    .select('*')
    .single<InventorySummary>()

  if (error || !data) {
    console.error('Error fetching inventory summary:', error)
    throw error
  }

  return data
}

// ──────────────────────────────────────────────────────────────
// ─── RPC-Based Fetcher
// ──────────────────────────────────────────────────────────────

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
  to = 49
): Promise<Inventory[]> {
  const { data, error } = await supabase.rpc('get_inventory_rows', {
    _filter:     filter,
    _distinct:   distinct,
    _range_from: from,
    _range_to:   to,
  })

  if (error) {
    console.error(
      'Error fetching filtered inventory rows:',
      { filter, distinct, from, to, error }
    )
    throw error
  }

  return (data as Inventory[]) || []
}

// ──────────────────────────────────────────────────────────────
// ─── View-Based Fetchers
// ──────────────────────────────────────────────────────────────

/**
 * Fetch all per-warehouse metrics from our view
 */
export async function getWarehouseInventoryMetrics(): Promise<WarehouseInventoryMetrics[]> {
  const { data, error } = await supabase
    .from('vw_dashboard_inventory_by_warehouse')
    .select('*')

  if (error || !data) {
    console.error('Error fetching warehouse metrics:', error)
    throw error
  }
  return data
}

/**
 * Fetch inventory rows for a given warehouse where item cost is NULL or zero
 * Uses the materialized view 'vw_dashboard_inventory_item_cost_by_warehouse'
 *
 * @param warehouse - the warehouse to filter on
 * @param limit - maximum number of rows to return (default 50)
 */
export async function fetchItemsMissingCostByWarehouse(
  warehouse: string,
): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('vw_dashboard_inventory_item_cost_by_warehouse')
    .select('*')
    .eq('warehouse', warehouse)

  if (error) {
    console.error('Error fetching items with missing cost:', error)
    throw error
  }

  return (data as Inventory[]) || []
}
