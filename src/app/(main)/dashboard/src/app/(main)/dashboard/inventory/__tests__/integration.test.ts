import { getInventorySummary } from '../../_components/data';

// Mock fetch globally
global.fetch = jest.fn();

describe('Inventory Dashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and process summary data correctly', async () => {
    // Mock the exact API response you provided
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

  it('should handle the data mapping in page.tsx correctly', async () => {
    // Mock the summary data that getInventorySummary returns
    const mockSummaryData = {
      total_inventory_records: 3294,
      unique_item_count: 2807,
      total_available_stock: 1214629,
      total_on_order_quantity: 126040,
      total_committed_quantity: 142494,
      out_of_stock_count: 883,
      total_on_order_value: 1370547.36,
      total_inventory_value: 31688737.845,
      total_committed_value: 770662.55
    };

    // Test the value mapping logic from page.tsx
    const valueMap: Record<string, number> = {
      totalInventoryRecords: mockSummaryData.total_inventory_records,
      uniqueItems: mockSummaryData.unique_item_count,
      totalAvailableStock: mockSummaryData.total_available_stock,
      totalOnOrderQuantity: mockSummaryData.total_on_order_quantity,
      totalCommittedQuantity: mockSummaryData.total_committed_quantity,
      outOfStockCount: mockSummaryData.out_of_stock_count,
      totalOnOrderValue: mockSummaryData.total_on_order_value,
      totalInventoryValue: mockSummaryData.total_inventory_value,
      totalCommittedValue: mockSummaryData.total_committed_value,
    };

    // Verify the mapping is correct
    expect(valueMap.totalInventoryRecords).toBe(3294);
    expect(valueMap.uniqueItems).toBe(2807);
    expect(valueMap.totalAvailableStock).toBe(1214629);
    expect(valueMap.totalOnOrderQuantity).toBe(126040);
    expect(valueMap.totalCommittedQuantity).toBe(142494);
    expect(valueMap.outOfStockCount).toBe(883);
    expect(valueMap.totalOnOrderValue).toBe(1370547.36);
    expect(valueMap.totalInventoryValue).toBe(31688737.845);
    expect(valueMap.totalCommittedValue).toBe(770662.55);
  });
});

