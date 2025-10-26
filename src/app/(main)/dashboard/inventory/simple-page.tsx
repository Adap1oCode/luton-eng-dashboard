// src/app/(main)/dashboard/inventory/simple-page.tsx
// Simplified inventory dashboard using pre-computed Supabase data

import SimpleDashboard from '@/components/dashboard/simple-dashboard'
import { simpleInventoryConfig } from './simple-config'
import { getInventorySummary } from '@/lib/data/resources/dashboards/inventory-summary'
import { getWarehouseInventoryMetrics } from '@/lib/data/resources/dashboards/inventory-warehouse'
import { getUomMetrics } from '@/lib/data/resources/dashboards/inventory-uom'

export default async function SimpleInventoryPage() {
  // Fetch all data in parallel from Supabase (pre-computed)
  const [summary, warehouseMetrics, uomMetrics] = await Promise.all([
    getInventorySummary(),
    getWarehouseInventoryMetrics(),
    getUomMetrics()
  ]);

  // Debug logging
  console.log("🔍 Summary data:", summary);
  console.log("🔍 Warehouse metrics:", warehouseMetrics);
  console.log("🔍 UoM metrics:", uomMetrics);

  // Transform data for the simplified dashboard
  const dashboardData = {
    summary,
    warehouseMetrics: warehouseMetrics.map(row => ({
      key: row.warehouse,
      warehouse: row.warehouse,
      total_available_stock: row.total_available_stock,
      total_on_order_quantity: row.total_on_order_quantity,
      total_committed_quantity: row.total_committed_quantity,
      out_of_stock_count: row.out_of_stock_count,
      total_on_order_value: row.total_on_order_value,
      total_inventory_value: row.total_inventory_value,
      total_committed_value: row.total_committed_value,
      missing_cost_count: row.missing_cost_count,
    })),
    uomMetrics: uomMetrics.map(row => ({
      key: row.uom,
      uom: row.uom,
      item_count: row.item_count,
    }))
  };

  // Map the summary data to match the config keys
  const mappedSummary = {
    totalInventoryRecords: summary.total_inventory_records,
    uniqueItems: summary.unique_item_count,
    totalAvailableStock: summary.total_available_stock,
    totalInventoryValue: summary.total_inventory_value,
    outOfStockCount: summary.out_of_stock_count,
    totalOnOrderValue: summary.total_on_order_value,
  };

  // Use the simplified config and inject the actual values
  const dashboardConfig = {
    ...simpleInventoryConfig,
    summaryTiles: simpleInventoryConfig.summaryTiles.map(tile => ({
      ...tile,
      value: mappedSummary[tile.key as keyof typeof mappedSummary] ?? 0,
    })),
    charts: simpleInventoryConfig.charts.map(chart => ({
      ...chart,
      data: chart.dataSource === 'warehouse' 
        ? dashboardData.warehouseMetrics 
        : dashboardData.uomMetrics,
    })),
  };

  return <SimpleDashboard config={dashboardConfig} data={dashboardData} />
}
