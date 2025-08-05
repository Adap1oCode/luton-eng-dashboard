// src/app/(main)/dashboard/inventory/page.tsx

import GenericDashboardPage from "@/components/dashboard/page"
import { inventoryConfig as baseConfig } from "@/app/(main)/dashboard/inventory/config"
import { getInventorySummary } from "@/app/(main)/dashboard/inventory/_components/data"

export default async function InventoryPage() {
  // 1. fetch materialized‐view summary
  const summary = await getInventorySummary()

  // 2. map DB fields → summary tile keys
  const valueMap: Record<string, number> = {
    totalInventoryRecords: summary.total_inventory_records,
    uniqueItems:            summary.unique_item_count,
    totalAvailableStock:    summary.total_available_stock,
    totalOnOrderQuantity:   summary.total_on_order_quantity,
    totalCommittedQuantity: summary.total_committed_quantity,
    outOfStockCount:        summary.out_of_stock_count,
    totalOnOrderValue:      summary.total_on_order_value,
    totalInventoryValue:    summary.total_inventory_value,
    totalCommittedValue:    summary.total_committed_value,
  }

  // 3. inject into your config
  const inventoryConfig = {
    ...baseConfig,
    summary: baseConfig.summary!.map((tile) => ({
      ...tile,
      value: valueMap[tile.key] ?? 0,
    })),
  }

  // 4. render fully‐hydrated dashboard
  return <GenericDashboardPage config={inventoryConfig} />
}
