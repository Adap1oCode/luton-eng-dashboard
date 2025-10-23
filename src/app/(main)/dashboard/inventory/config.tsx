// src/app/(main)/dashboard/inventory/config.tsx

import { getInventoryRows } from "@/app/(main)/dashboard/inventory/_components/data";
import type { DashboardConfig } from "@/components/dashboard/types";

import * as dataAPI from "./_components/data";

// DEBUG: Log config loading
console.log("🔧 Inventory config loading...");
console.log("🔧 outOfStockCount tile should have:");
console.log("  - filter: { column: 'total_available', equals: 0 }");
console.log("  - rpcName: 'get_inventory_rows'");
console.log("  - clickable: true");

export const inventoryConfig: DashboardConfig = {
  id: "inventory",
  tableName: "inventory",
  title: "Inventory Dashboard",
  rowIdKey: "item_number",
  dateSearchEnabled: false,

  // ◀─ UPDATED: proper API-first data fetching with total count
  fetchRecords: async (_range: string, _from?: string, _to?: string, _filter?: any, _distinct?: boolean) => {
    console.log("🔍 [fetchRecords] Called with:", { _range, _from, _to, _filter, _distinct });
    
    // Always fetch 50 records for performance
    const limit = 50;
    const result = await getInventoryRows(
      _filter ?? {}, // ← send your logged filter object here
      _distinct ?? false, // ← support distinct if used
      0,
      limit,
    );
    
    // Return the data array for backward compatibility
    // The total count is available in result.total but dashboard system doesn't use it yet
    console.log("🔍 [fetchRecords] Result:", result.rows.length, "rows, total:", result.total);
    console.log("🔍 [fetchRecords] Sample data:", result.rows.slice(0, 3));
    
    // Store the total count in a way that can be accessed by the dashboard system
    // For now, we'll add it as a property to the first record
    if (result.rows.length > 0) {
      result.rows[0]._totalCount = result.total;
    }
    
    return result.rows;
  },

  // drive all valueField widgets off our two materialized‐view fetchers
  fetchMetrics: async () => {
    const [wh, uom] = await Promise.all([dataAPI.getWarehouseInventoryMetrics(), dataAPI.getUomMetrics()]);
    const merged = [...wh, ...uom];
    console.log("🔍 fetchMetrics merged rows:", merged.length, merged);
    return merged;
  },

  // no global filters on this page
  filters: {
    warehouse: "warehouse",
    status: "status",
    creator: "created_by",
    uom: "uom", // ← add this line
  },

  summary: [
    {
      key: "totalInventoryRecords",
      title: "Total Inventory Records",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: true,
      thresholds: {},
      filter: { column: "item_number", isNotNull: true },
      rpcName: "get_inventory_rows",
      sql: "SELECT COUNT(*) AS total_inventory_records FROM inventory",
    },
    {
      key: "uniqueItems",
      title: "Unique Item Numbers",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: true,
      distinct: true,
      distinctColumn: "item_number",
      filter: { column: "item_number", isNotNull: true },
      rpcName: "get_inventory_rows",
      sql: "SELECT COUNT(DISTINCT item_number) AS unique_item_count FROM inventory",
    },
    {
      key: "totalAvailableStock",
      title: "Total Available (Qty)",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(total_available) AS total_available_stock FROM inventory",
    },
    {
      key: "totalOnOrderQuantity",
      title: "Total On Order (Qty)",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(on_order) AS total_on_order_quantity FROM inventory",
    },
    {
      key: "totalCommittedQuantity",
      title: "Total Committed (Qty)",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(committed) AS total_committed_quantity FROM inventory",
    },
    {
      key: "outOfStockCount",
      title: "Out-of-Stock Items",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: true,
      thresholds: {},
      filter: { column: "total_available", equals: 0 },
      rpcName: "get_inventory_rows",
      sql: "SELECT COUNT(*) AS out_of_stock_count FROM inventory WHERE total_available = 0",
    },
    {
      key: "totalOnOrderValue",
      title: "Total On Order Value (£)",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(on_order * CAST(item_cost AS numeric)) AS total_on_order_value FROM inventory",
    },
    {
      key: "totalInventoryValue",
      title: "Total Available Value (£)",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(total_available * CAST(item_cost AS numeric)) AS total_inventory_value FROM inventory",
    },
    {
      key: "totalCommittedValue",
      title: "Total Committed Value (£)",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(committed * CAST(item_cost AS numeric)) AS total_committed_value FROM inventory",
    },
  ],

  trends: [],

  dataQuality: [],

  widgets: [
    { component: "SummaryCards", key: "tiles", group: "summary" },
    {
      key: "missing_cost",
      component: "ChartBarHorizontal",
      title: "Items Missing Cost by Warehouse",
      preCalculated: true,
      filterType: "warehouse", // tells DataViewer to pass widget.key
      group: "tiles", // ← this must be set
      noRangeFilter: true,
      clickable: true,
      column: "warehouse",
      // field: "missing_cost_count", // field to aggregate - not valid for DashboardWidget
      metric: "sum", // aggregation type
      rpcName: "get_inventory_rows", // use existing RPC with multiple filters
      valueField: "missing_cost_count",
      sortBy: "value-desc",
      debug: false,
      span: 2,
    },
    {
      key: "items_by_uom",
      component: "ChartBarHorizontal",
      title: "Items by Unit of Measure",
      column: "uom",
      filterType: "uom",
      group: "tiles", // ← this must be set
      preCalculated: true,
      noRangeFilter: true,
      clickable: true,
      rpcName: "fetchItemsByUom",
      valueField: "item_count",
      sortBy: "value-desc",
      debug: false,
      span: 2,
    },
    {
      key: "available_stock",
      component: "ChartBarHorizontal",
      title: "Available Stock by Warehouse",
      group: "tiles",
      filterType: "warehouse",
      clickable: false,
      column: "warehouse",
      valueField: "total_available_stock",
      preCalculated: true,
      sortBy: "value-desc",
      span: 2,
    },
    {
      key: "available_stock_value",
      component: "ChartBarHorizontal",
      title: "Value of Total Available Stock by Warehouse",
      group: "tiles",
      filterType: "warehouse",
      clickable: false,
      column: "warehouse",
      valueField: "total_inventory_value",
      preCalculated: true,
      sortBy: "value-desc",
      span: 2,
    },
    {
      key: "total_on_order_quantity",
      component: "ChartBarHorizontal",
      title: "Total On Order by Warehouse",
      group: "tiles",

      filterType: "warehouse",
      clickable: false,
      column: "warehouse",
      valueField: "total_on_order_quantity",
      preCalculated: true,
      sortBy: "value-desc",
      span: 2,
    },
    {
      key: "total_on_order_value_value",
      component: "ChartBarHorizontal",
      title: "Value of Total On-Order Stock by Warehouse",
      group: "tiles",
      filterType: "warehouse",
      clickable: false,
      column: "warehouse",
      valueField: "total_on_order_value",
      preCalculated: true,
      sortBy: "value-desc",
      span: 2,
    },
    {
      key: "total_committed_quantity",
      component: "ChartBarHorizontal",
      title: "Total Committed by Warehouse",
      group: "tiles",
      filterType: "warehouse",
      clickable: false,
      column: "warehouse",
      valueField: "total_committed_quantity",
      preCalculated: true,
      sortBy: "value-desc",
      span: 2,
    },
    {
      key: "total_committed_value",
      component: "ChartBarHorizontal",
      title: "Value of Total Committed Stock by Warehouse",
      group: "tiles",
      filterType: "warehouse",
      clickable: false,
      column: "warehouse",
      valueField: "total_committed_value",
      preCalculated: true,
      sortBy: "value-desc",
      span: 2,
    },
  ],

  tiles: [],

  tableColumns: [
    { accessorKey: "item_number", header: "Item Number" },
    { accessorKey: "description", header: "Description" },
    { accessorKey: "total_available", header: "Total Available" },
    { accessorKey: "item_cost", header: "Cost" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "unit_of_measure", header: "UoM" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "warehouse", header: "Warehouse" },
  ],
};
