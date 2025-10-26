// src/app/(main)/dashboard/inventory/simple-config.tsx
// Simplified config focused purely on display layout - no complex filtering or calculations

export type SimpleInventoryConfig = {
  title: string;
  summaryTiles: Array<{
    key: string;
    title: string;
    subtitle: string;
    format?: 'number' | 'currency' | 'percentage';
  }>;
  charts: Array<{
    key: string;
    title: string;
    type: 'bar' | 'donut';
    dataSource: 'warehouse' | 'uom';
    dataKey: string;
    valueKey: string;
  }>;
};

export const simpleInventoryConfig: SimpleInventoryConfig = {
  title: "Inventory Dashboard",
  
  // Simple summary tiles - values come from pre-computed data
  summaryTiles: [
    {
      key: "totalInventoryRecords",
      title: "Total Inventory Records",
      subtitle: "All Time",
      format: 'number',
    },
    {
      key: "uniqueItems", 
      title: "Unique Items",
      subtitle: "All Time",
      format: 'number',
    },
    {
      key: "totalAvailableStock",
      title: "Total Available Stock", 
      subtitle: "All Time",
      format: 'number',
    },
    {
      key: "totalInventoryValue",
      title: "Total Inventory Value",
      subtitle: "All Time", 
      format: 'currency',
    },
    {
      key: "outOfStockCount",
      title: "Out of Stock Items",
      subtitle: "All Time",
      format: 'number',
    },
    {
      key: "totalOnOrderValue",
      title: "Total On Order Value",
      subtitle: "All Time",
      format: 'currency',
    },
  ],

  // Simple charts - data comes from pre-computed views
  charts: [
    {
      key: "warehouse-stock",
      title: "Available Stock by Warehouse",
      type: 'bar',
      dataSource: 'warehouse',
      dataKey: 'warehouse',
      valueKey: 'total_available_stock',
    },
    {
      key: "warehouse-value",
      title: "Inventory Value by Warehouse", 
      type: 'bar',
      dataSource: 'warehouse',
      dataKey: 'warehouse',
      valueKey: 'total_inventory_value',
    },
    {
      key: "uom-distribution",
      title: "Items by Unit of Measure",
      type: 'bar',
      dataSource: 'uom',
      dataKey: 'uom',
      valueKey: 'item_count',
    },
    {
      key: "missing-cost",
      title: "Items Missing Cost by Warehouse",
      type: 'bar',
      dataSource: 'warehouse',
      dataKey: 'warehouse',
      valueKey: 'missing_cost_count',
    },
  ],
};

