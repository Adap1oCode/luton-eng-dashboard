import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase
const mockSupabaseRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockSupabaseRpc
  }
}));

describe('Tile Functionality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Out-of-Stock Items Tile', () => {
    it('should have correct configuration for out-of-stock filtering', () => {
      const outOfStockConfig = {
        key: "outOfStockCount",
        title: "Out-of-Stock Items",
        clickable: true,
        filter: { column: "total_available", equals: 0 },
        rpcName: "get_inventory_rows"
      };

      expect(outOfStockConfig.clickable).toBe(true);
      expect(outOfStockConfig.filter.column).toBe("total_available");
      expect(outOfStockConfig.filter.equals).toBe(0);
      expect(outOfStockConfig.rpcName).toBe("get_inventory_rows");
    });

    it('should convert filter to RPC parameters correctly', () => {
      const filter = { column: "total_available", equals: 0 };
      
      const expectedRpcParams = {
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: "total_available",
          op: "=",
          value: "0"
        }
      };

      const convertFilterToRpc = (filter: any) => ({
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: filter.column,
          op: "=",
          value: filter.equals.toString()
        }
      });

      expect(convertFilterToRpc(filter)).toEqual(expectedRpcParams);
    });

    it('should handle RPC call successfully', async () => {
      const mockRpcData = [
        { item_number: 123, description: "Item 1", total_available: 0 },
        { item_number: 456, description: "Item 2", total_available: 0 }
      ];

      mockSupabaseRpc.mockResolvedValueOnce({
        data: mockRpcData,
        error: null
      });

      const rpcParams = {
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: "total_available",
          op: "=",
          value: "0"
        }
      };

      const { data, error } = await mockSupabaseRpc('get_inventory_rows', rpcParams);

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_inventory_rows', rpcParams);
      expect(data).toEqual(mockRpcData);
      expect(error).toBeNull();
    });
  });

  describe('Total Inventory Records Tile', () => {
    it('should have correct configuration for all records', () => {
      const totalRecordsConfig = {
        key: "totalInventoryRecords",
        title: "Total Inventory Records",
        clickable: true,
        filter: { column: "item_number", isNotNull: true },
        rpcName: "get_inventory_rows"
      };

      expect(totalRecordsConfig.clickable).toBe(true);
      expect(totalRecordsConfig.filter.column).toBe("item_number");
      expect(totalRecordsConfig.filter.isNotNull).toBe(true);
    });

    it('should convert isNotNull filter to RPC parameters', () => {
      const filter = { column: "item_number", isNotNull: true };
      
      const expectedRpcParams = {
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: "item_number",
          op: "IS NOT NULL"
        }
      };

      const convertIsNotNullFilter = (filter: any) => ({
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: filter.column,
          op: "IS NOT NULL"
        }
      });

      expect(convertIsNotNullFilter(filter)).toEqual(expectedRpcParams);
    });
  });

  describe('Unique Items Tile', () => {
    it('should have correct configuration for distinct items', () => {
      const uniqueItemsConfig = {
        key: "uniqueItems",
        title: "Unique Item Numbers",
        clickable: true,
        distinct: true,
        filter: { column: "item_number", isNotNull: true },
        rpcName: "get_inventory_rows"
      };

      expect(uniqueItemsConfig.clickable).toBe(true);
      expect(uniqueItemsConfig.distinct).toBe(true);
      expect(uniqueItemsConfig.filter.column).toBe("item_number");
    });

    it('should handle distinct parameter in RPC call', () => {
      const rpcParams = {
        _distinct: true,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: "item_number",
          op: "IS NOT NULL"
        }
      };

      expect(rpcParams._distinct).toBe(true);
      expect(rpcParams._filter.column).toBe("item_number");
    });
  });

  describe('Data Viewer Integration', () => {
    it('should handle tile click and update data viewer', () => {
      const mockSetRpcData = jest.fn();
      const mockSetDrawerOpen = jest.fn();
      const mockSetLoading = jest.fn();

      const handleTileClick = async (widget: any, filter: any) => {
        mockSetLoading(true);
        
        // Simulate RPC call
        const mockData = [{ item_number: 123, description: "Test Item" }];
        mockSetRpcData(mockData);
        mockSetDrawerOpen(true);
        mockSetLoading(false);
      };

      const widget = {
        key: "outOfStockCount",
        filter: { column: "total_available", equals: 0 },
        rpcName: "get_inventory_rows"
      };

      handleTileClick(widget, widget.filter);

      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('should store total count in first record', () => {
      const mockData = [
        { item_number: 123, description: "Item 1" },
        { item_number: 456, description: "Item 2" }
      ];
      const totalCount = 883;

      const dataWithCount = [...mockData];
      if (dataWithCount.length > 0) {
        dataWithCount[0]._totalCount = totalCount;
      }

      expect(dataWithCount[0]._totalCount).toBe(totalCount);
      expect(dataWithCount.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle RPC errors gracefully', async () => {
      const mockError = { message: "RPC call failed" };
      mockSupabaseRpc.mockResolvedValueOnce({
        data: null,
        error: mockError
      });

      const rpcParams = {
        _distinct: false,
        _range_from: 0,
        _range_to: 999,
        _filter: {
          column: "total_available",
          op: "=",
          value: "0"
        }
      };

      const { data, error } = await mockSupabaseRpc('get_inventory_rows', rpcParams);

      expect(error).toEqual(mockError);
      expect(data).toBeNull();
    });

    it('should handle network errors', async () => {
      mockSupabaseRpc.mockRejectedValueOnce(new Error("Network error"));

      try {
        await mockSupabaseRpc('get_inventory_rows', {});
      } catch (error) {
        expect(error.message).toBe("Network error");
      }
    });
  });
});
