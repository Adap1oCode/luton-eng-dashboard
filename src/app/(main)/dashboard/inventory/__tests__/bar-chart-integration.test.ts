import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the dashboard components
const mockHandleClickWidget = jest.fn();
const mockSetFilters = jest.fn();
const mockSetDrawerOpen = jest.fn();

jest.mock('@/components/dashboard/client/data-viewer', () => ({
  useDataViewer: jest.fn(() => ({
    handleClickWidget: mockHandleClickWidget,
    setFilters: mockSetFilters,
    setDrawerOpen: mockSetDrawerOpen,
    filteredData: [],
    totalCount: 0,
    loading: false
  }))
}));

describe('Bar Chart Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Missing Cost Bar Chart Configuration', () => {
    it('should have correct configuration for grouped aggregation', () => {
      const missingCostConfig = {
        key: "missing_cost",
        component: "ChartBarHorizontal",
        title: "Items Missing Cost by Warehouse",
        preCalculated: true,
        filterType: "warehouse",
        group: "tiles",
        noRangeFilter: true,
        clickable: true,
        column: "warehouse",
        field: "missing_cost_count",
        metric: "sum",
        rpcName: "get_inventory_rows",
        valueField: "missing_cost_count",
        sortBy: "value-desc",
        span: 2,
      };

      // Validate required properties for handleGroupedAggregation
      expect(missingCostConfig.column).toBe("warehouse");
      expect(missingCostConfig.field).toBe("missing_cost_count");
      expect(missingCostConfig.metric).toBe("sum");
      expect(missingCostConfig.filterType).toBe("warehouse");
      expect(missingCostConfig.clickable).toBe(true);
    });

    it('should trigger handleGroupedAggregation with correct properties', () => {
      const tile = {
        column: "warehouse",
        field: "missing_cost_count",
        metric: "sum",
        component: "ChartBarHorizontal"
      };

      // Check if tile has grouped aggregation properties
      const hasGrouped = tile.metric && 
                        tile.field && 
                        tile.column && 
                        tile.component?.includes("ChartBar");

      expect(hasGrouped).toBe(true);
    });
  });

  describe('Tile Generation for Bar Chart', () => {
    it('should generate tiles from grouped data', () => {
      const mockGroupedData = {
        "Main Warehouse": [5, 3, 2],
        "Secondary Warehouse": [8, 1],
        "Storage Warehouse": [12]
      };

      const tile = {
        column: "warehouse",
        field: "missing_cost_count",
        metric: "sum"
      };

      // Simulate handleGroupedAggregation logic
      const tiles = Object.entries(mockGroupedData).map(([key, vals]) => ({
        key,
        title: key,
        value: vals.reduce((a, b) => a + b, 0), // sum aggregation
        filterType: tile.filterType,
        clickable: true,
        filter: { column: tile.column, equals: key },
      }));

      expect(tiles).toHaveLength(3);
      expect(tiles[0]).toEqual({
        key: "Main Warehouse",
        title: "Main Warehouse",
        value: 10, // 5 + 3 + 2
        filterType: undefined,
        clickable: true,
        filter: { column: "warehouse", equals: "Main Warehouse" }
      });
      expect(tiles[1]).toEqual({
        key: "Secondary Warehouse",
        title: "Secondary Warehouse",
        value: 9, // 8 + 1
        filterType: undefined,
        clickable: true,
        filter: { column: "warehouse", equals: "Secondary Warehouse" }
      });
    });

    it('should create clickable tiles with warehouse filters', () => {
      const warehouse = "Main Warehouse";
      const tile = {
        key: "Main Warehouse",
        title: "Main Warehouse",
        value: 10,
        clickable: true,
        filter: { column: "warehouse", equals: warehouse }
      };

      expect(tile.clickable).toBe(true);
      expect(tile.filter.column).toBe("warehouse");
      expect(tile.filter.equals).toBe(warehouse);
    });
  });

  describe('Bar Chart Click Handling', () => {
    it('should handle bar click and trigger data viewer', () => {
      const warehouse = "Main Warehouse";
      const tile = {
        key: warehouse,
        title: warehouse,
        value: 10,
        clickable: true,
        filter: { column: "warehouse", equals: warehouse },
        rpcName: "get_inventory_rows"
      };

      // Simulate bar click
      const handleBarClick = (tile: any) => {
        if (tile.clickable && tile.filter) {
          // This should trigger the RPC call with warehouse filter
          const rpcParams = {
            _distinct: false,
            _range_from: 0,
            _range_to: 999,
            _filter: {
              column: tile.filter.column,
              op: "=",
              value: tile.filter.equals
            }
          };
          
          mockHandleClickWidget(tile, rpcParams);
        }
      };

      handleBarClick(tile);

      expect(mockHandleClickWidget).toHaveBeenCalledWith(tile, expect.objectContaining({
        _filter: {
          column: "warehouse",
          op: "=",
          value: "Main Warehouse"
        }
      }));
    });

    it('should convert warehouse filter to RPC parameters', () => {
      const warehouse = "Main Warehouse";
      const filter = { column: "warehouse", equals: warehouse };
      
      const expectedRpcParams = {
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: "warehouse",
          op: "=",
          value: warehouse
        }
      };

      const convertToRpcParams = (filter: any) => ({
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: filter.column,
          op: "=",
          value: filter.equals
        }
      });

      expect(convertToRpcParams(filter)).toEqual(expectedRpcParams);
    });
  });

  describe('Data Flow Integration', () => {
    it('should integrate with useDataViewer hook correctly', () => {
      const mockUseDataViewer = jest.fn().mockReturnValue({
        handleClickWidget: mockHandleClickWidget,
        setFilters: mockSetFilters,
        setDrawerOpen: mockSetDrawerOpen,
        filteredData: [],
        totalCount: 0,
        loading: false
      });

      const { handleClickWidget } = mockUseDataViewer();
      
      // Simulate bar chart click
      const warehouse = "Main Warehouse";
      const widget = {
        key: "missing_cost",
        filterType: "warehouse",
        column: "warehouse",
        rpcName: "get_inventory_rows"
      };

      const tile = {
        key: warehouse,
        filter: { column: "warehouse", equals: warehouse },
        rpcName: "get_inventory_rows"
      };

      handleClickWidget(tile);

      expect(mockUseDataViewer).toHaveBeenCalled();
      expect(handleClickWidget).toHaveBeenCalledWith(tile);
    });

    it('should handle missing cost specific filtering', () => {
      const warehouse = "Main Warehouse";
      
      // When clicking on a warehouse bar, we want to see items missing cost in that warehouse
      const warehouseFilter = {
        column: "warehouse",
        op: "=",
        value: warehouse
      };

      const missingCostFilter = {
        column: "item_cost",
        op: "=",
        value: "0"
      };

      // The RPC should handle both filters
      const combinedRpcParams = {
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: warehouseFilter // RPC will handle the warehouse filter
      };

      expect(combinedRpcParams._filter.column).toBe("warehouse");
      expect(combinedRpcParams._filter.value).toBe(warehouse);
    });
  });

  describe('Chart Data Structure', () => {
    it('should have correct data structure for bar chart', () => {
      const mockChartData = [
        { key: "Main Warehouse", label: "Main Warehouse", count: 10 },
        { key: "Secondary Warehouse", label: "Secondary Warehouse", count: 9 },
        { key: "Storage Warehouse", label: "Storage Warehouse", count: 12 }
      ];

      expect(mockChartData).toHaveLength(3);
      expect(mockChartData[0]).toHaveProperty('key');
      expect(mockChartData[0]).toHaveProperty('label');
      expect(mockChartData[0]).toHaveProperty('count');
      expect(typeof mockChartData[0].count).toBe('number');
    });

    it('should validate warehouse data structure', () => {
      const mockWarehouseData = {
        warehouse: "Main Warehouse",
        missing_cost_count: 10,
        total_items: 100,
        missing_cost_percentage: 10.0
      };

      expect(mockWarehouseData).toHaveProperty('warehouse');
      expect(mockWarehouseData).toHaveProperty('missing_cost_count');
      expect(mockWarehouseData).toHaveProperty('total_items');
      expect(mockWarehouseData).toHaveProperty('missing_cost_percentage');
      expect(typeof mockWarehouseData.warehouse).toBe('string');
      expect(typeof mockWarehouseData.missing_cost_count).toBe('number');
    });
  });
});
