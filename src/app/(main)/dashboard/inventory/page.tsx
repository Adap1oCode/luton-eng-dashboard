// src/app/(main)/dashboard/inventory/page.tsx

import { getInventorySummary } from "@/app/(main)/dashboard/inventory/_components/data";
import { inventoryConfig as baseConfig } from "@/app/(main)/dashboard/inventory/config";
import GenericDashboardPage from "@/components/dashboard/page";

export default async function InventoryPage() {
  // 1. Fetch the precomputed summary from your materialized view
  const summary = await getInventorySummary();

  // 2. Build a lookup of values by tile.key
  const valueMap: Record<string, number> = {
    totalInventoryRecords: summary.total_inventory_records,
    uniqueItems: summary.unique_item_count,
    totalAvailableStock: summary.total_available_stock,
    totalOnOrderQuantity: summary.total_on_order_quantity,
    totalCommittedQuantity: summary.total_committed_quantity,
    outOfStockCount: summary.out_of_stock_count,
    totalOnOrderValue: summary.total_on_order_value,
    totalInventoryValue: summary.total_inventory_value,
    totalCommittedValue: summary.total_committed_value,
  };

  // 3. Inject the `value` for each summary tile; assert summary exists
  const inventoryConfig = {
    ...baseConfig,
    summary: baseConfig.summary!.map((tile) => ({
      ...tile,
      value: valueMap[tile.key] ?? 0,
    })),
  };

  // 4. Render the dashboard with the fully-hydrated config
  return <GenericDashboardPage config={inventoryConfig} />;
}
