import { getInventorySummary } from '../../_components/data';

// Mock fetch globally
global.fetch = jest.fn();

describe('Inventory Data Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInventorySummary', () => {
    it('should extract summary data from API response correctly', async () => {
      // Mock API response structure
      const mockApiResponse = {
        rows: [{
          total_inventory_records: 3294,
          unique_item_count: 2807,
          total_available_stock: 1214629,
          total_on_order_quantity: 126040,
          total_committed_quantity: 142494,
          out_of_stock_count: 883,
          total_on_order_value: 1370547.36,
          total_inventory_value: 31688737.845,
          total_committed_value: 770662.55
        }],
        total: 1,
        page: 1,
        pageSize: 50,
        resource: "inventory-summary",
        raw: false
      };

      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await getInventorySummary();

      // Verify the function extracts the first row correctly
      expect(result).toEqual({
        total_inventory_records: 3294,
        unique_item_count: 2807,
        total_available_stock: 1214629,
        total_on_order_quantity: 126040,
        total_committed_quantity: 142494,
        out_of_stock_count: 883,
        total_on_order_value: 1370547.36,
        total_inventory_value: 31688737.845,
        total_committed_value: 770662.55
      });

      // Verify fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inventory-summary'),
        expect.objectContaining({
          cache: 'no-store'
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      // Mock failed fetch response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getInventorySummary();

      // Should return zero values on error
      expect(result).toEqual({
        total_inventory_records: 0,
        unique_item_count: 0,
        total_available_stock: 0,
        total_on_order_quantity: 0,
        total_committed_quantity: 0,
        out_of_stock_count: 0,
        total_on_order_value: 0,
        total_inventory_value: 0,
        total_committed_value: 0,
      });
    });

    it('should handle empty rows array', async () => {
      // Mock API response with empty rows
      const mockApiResponse = {
        rows: [],
        total: 0,
        page: 1,
        pageSize: 50,
        resource: "inventory-summary",
        raw: false
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await getInventorySummary();

      // Should return zero values when no data
      expect(result).toEqual({
        total_inventory_records: 0,
        unique_item_count: 0,
        total_available_stock: 0,
        total_on_order_quantity: 0,
        total_committed_quantity: 0,
        out_of_stock_count: 0,
        total_on_order_value: 0,
        total_inventory_value: 0,
        total_committed_value: 0,
      });
    });

    it('should handle network errors', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await getInventorySummary();

      // Should return zero values on network error
      expect(result).toEqual({
        total_inventory_records: 0,
        unique_item_count: 0,
        total_available_stock: 0,
        total_on_order_quantity: 0,
        total_committed_quantity: 0,
        out_of_stock_count: 0,
        total_on_order_value: 0,
        total_inventory_value: 0,
        total_committed_value: 0,
      });
    });
  });
});


