// src/app/(main)/dashboard/inventory/config.tsx

import { getInventoryRows } from '@/app/(main)/dashboard/inventory/_components/data'
import type { DashboardConfig } from "@/components/dashboard/types";
import { getWarehouseInventoryMetrics } from './_components/data';

export const inventoryConfig: DashboardConfig = {
  id: "inventory",
  tableName: 'inventory',
  title: "Inventory Dashboard",
  rowIdKey: "item_number",
  dateSearchEnabled: false,

  // ◀─ UPDATED: accept _filter & _distinct
  fetchRecords: async (
    _range: string,
    _from?: string,
    _to?: string,
    _filter?: any,
    _distinct?: boolean
  ) => {
    const limit = 50
    return getInventoryRows(
      _filter ?? {},          // ← send your logged filter object here
      _distinct ?? false,     // ← support distinct if used
      0,
      limit - 1
    )
  },

  // drive all valueField widgets off this single RPC-backed fetcher
  fetchMetrics: getWarehouseInventoryMetrics,

  // no global filters on this page
  filters: {
    warehouse: 'warehouse',
    status: 'status',
    creator: 'created_by',
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
      filter: { column: "item_number", isNotNull: true },
      rpcName: "get_inventory_rows",
      sql: "SELECT COUNT(DISTINCT item_number) AS unique_item_count FROM inventory",
    },
    {
      key: "totalAvailableStock",
      title: "Total Available",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(total_available) AS total_available_stock FROM inventory",
    },
    {
      key: "totalOnOrderQuantity",
      title: "Total On-Order Quantity",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(on_order) AS total_on_order_quantity FROM inventory",
    },
    {
      key: "totalCommittedQuantity",
      title: "Total Committed Quantity",
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
      title: "Value On-Order",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(on_order * CAST(item_cost AS numeric)) AS total_on_order_value FROM inventory",
    },
    {
      key: "totalInventoryValue",
      title: "Total Inventory Value",
      subtitle: "All Time",
      preCalculated: true,
      noRangeFilter: true,
      clickable: false,
      thresholds: {},
      sql: "SELECT SUM(total_available * CAST(item_cost AS numeric)) AS total_inventory_value FROM inventory",
    },
    {
      key: "totalCommittedValue",
      title: "Total Committed Value",
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
      component: 'ChartBarVertical',
      key: 'data_quality_chart',
      group: 'dataQuality',
      title: 'Data Quality Issues',
      description: 'Breakdown of validation issues found in current dataset',
      clickable: true,
      sortBy: 'label-asc',
      debug: true
    },
{
  key: "missing_cost",
  component: "ChartBarHorizontal",
  title: "Items Missing Cost by Warehouse",
  preCalculated: true,
  filterType: "warehouse",      // tells DataViewer to pass widget.key
  noRangeFilter: true,
  clickable: true,
  column: "warehouse",
  rpcName: "fetchItemsMissingCostByWarehouse",   // use the view-based fetcher
  valueField: "missing_cost_count",
  sortBy: "value-desc",
  debug: true,
},
    {
      key: 'available_stock',
      component: 'ChartBarHorizontal',
      title: 'Available Stock by Warehouse',
      filterType: 'warehouse',
      clickable: false,
      column: 'warehouse',
      valueField: 'total_available_stock',
      preCalculated: true,
      sortBy: 'value-desc',
      span: 2,
    },
    {
      key: 'available_stock_value',
      component: 'ChartBarHorizontal',
      title: 'Value of Total Available Stock by Warehouse',
      filterType: 'warehouse',
      clickable: false,
      column: 'warehouse',
      valueField: 'total_inventory_value',
      preCalculated: true,
      sortBy: 'value-desc',
      span: 2,
    },
    {
      key: 'total_on_order_quantity',
      component: 'ChartBarHorizontal',
      title: 'Total On Order by Warehouse',
      filterType: 'warehouse',
      clickable: false,
      column: 'warehouse',
      valueField: 'total_on_order_quantity',
      preCalculated: true,
      sortBy: 'value-desc',
      span: 2,
    },
    {
      key: 'total_on_order_value_value',
      component: 'ChartBarHorizontal',
      title: 'Value of Total On-Order Stock by Warehouse',
      filterType: 'warehouse',
      clickable: false,
      column: 'warehouse',
      valueField: 'total_on_order_value',
      preCalculated: true,
      sortBy: 'value-desc',
      span: 2,
    },
    {
      key: 'total_committed_quantity',
      component: 'ChartBarHorizontal',
      title: 'Total Committed by Warehouse',
      filterType: 'warehouse',
      clickable: false,
      column: 'warehouse',
      valueField: 'total_committed_quantity',
      preCalculated: true,
      sortBy: 'value-desc',
      span: 2,
    },
    {
      key: 'total_committed_value',
      component: 'ChartBarHorizontal',
      title: 'Value of Total Committed Stock by Warehouse',
      filterType: 'warehouse',
      clickable: false,
      column: 'warehouse',
      valueField: 'total_committed_value',
      preCalculated: true,
      sortBy: 'value-desc',
      span: 2,
    },
  ],

  tiles: [],

  tableColumns: [
    { accessorKey: "item_number", header: "Item Number" },
    { accessorKey: "description", header: "Description" },
    { accessorKey: "total_availabe", header: "Total Available" },
    { accessorKey: "item_cost", header: "cost" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "stocking_unit", header: "Stocking Unit" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "warehouse", header: "Warehouse" },
  ],
};
