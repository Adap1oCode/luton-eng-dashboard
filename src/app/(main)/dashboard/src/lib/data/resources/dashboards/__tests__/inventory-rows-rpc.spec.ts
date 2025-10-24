import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getInventoryRows } from '../inventory-rows-rpc';

// Mock the supabase server
vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: vi.fn(),
}));

describe('Inventory RPC Tests', () => {
  let mockSupabase: any;
  let mockRpc: any;

  beforeEach(() => {
    mockRpc = vi.fn();
    mockSupabase = {
      rpc: mockRpc,
    };
    
    const { supabaseServer } = await import('@/lib/supabase-server');
    vi.mocked(supabaseServer).mockResolvedValue(mockSupabase);
  });

  describe('getInventoryRows', () => {
    it('should call RPC with correct parameters for equals filter', async () => {
      // Mock successful RPC response
      mockRpc.mockResolvedValue({
        data: [
          { item_number: 123, description: 'Test Item', total_available: 0 }
        ],
        error: null
      });

      const filters = { column: 'total_available', equals: 0 };
      const result = await getInventoryRows(filters, false, 0, 50);

      expect(mockRpc).toHaveBeenCalledWith('get_inventory_rows', {
        _filter: {
          column: 'total_available',
          op: '=',
          value: 0
        },
        _distinct: false,
        _range_from: 0,
        _range_to: 50
      });

      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should call RPC with correct parameters for isNotNull filter', async () => {
      // Mock successful RPC response
      mockRpc.mockResolvedValue({
        data: [
          { item_number: 123, description: 'Test Item' }
        ],
        error: null
      });

      const filters = { column: 'item_number', isNotNull: true };
      const result = await getInventoryRows(filters, true, 0, 50);

      expect(mockRpc).toHaveBeenCalledWith('get_inventory_rows', {
        _filter: {
          column: 'item_number',
          op: 'IS NOT NULL'
        },
        _distinct: true,
        _range_from: 0,
        _range_to: 50
      });

      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle RPC errors gracefully', async () => {
      // Mock RPC error
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function not found' }
      });

      const filters = { column: 'total_available', equals: 0 };
      const result = await getInventoryRows(filters, false, 0, 50);

      expect(result.rows).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle empty filters', async () => {
      // Mock successful RPC response
      mockRpc.mockResolvedValue({
        data: [
          { item_number: 123, description: 'Test Item' },
          { item_number: 456, description: 'Test Item 2' }
        ],
        error: null
      });

      const result = await getInventoryRows({}, false, 0, 50);

      expect(mockRpc).toHaveBeenCalledWith('get_inventory_rows', {
        _filter: {},
        _distinct: false,
        _range_from: 0,
        _range_to: 50
      });

      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle pagination correctly', async () => {
      // Mock successful RPC response
      mockRpc.mockResolvedValue({
        data: [
          { item_number: 456, description: 'Test Item 2' }
        ],
        error: null
      });

      const filters = { column: 'warehouse', equals: 'Main Warehouse' };
      const result = await getInventoryRows(filters, false, 50, 50);

      expect(mockRpc).toHaveBeenCalledWith('get_inventory_rows', {
        _filter: {
          column: 'warehouse',
          op: '=',
          value: 'Main Warehouse'
        },
        _distinct: false,
        _range_from: 50,
        _range_to: 100
      });

      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(51); // offset + data length
    });

    it('should handle exceptions gracefully', async () => {
      // Mock exception
      mockRpc.mockRejectedValue(new Error('Network error'));

      const filters = { column: 'total_available', equals: 0 };
      const result = await getInventoryRows(filters, false, 0, 50);

      expect(result.rows).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('Filter Conversion', () => {
    it('should convert equals filter correctly', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const filters = { column: 'status', equals: 'active' };
      await getInventoryRows(filters);

      expect(mockRpc).toHaveBeenCalledWith('get_inventory_rows', expect.objectContaining({
        _filter: {
          column: 'status',
          op: '=',
          value: 'active'
        }
      }));
    });

    it('should convert isNotNull filter correctly', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const filters = { column: 'description', isNotNull: true };
      await getInventoryRows(filters);

      expect(mockRpc).toHaveBeenCalledWith('get_inventory_rows', expect.objectContaining({
        _filter: {
          column: 'description',
          op: 'IS NOT NULL'
        }
      }));
    });

    it('should pass through unknown filter formats', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const filters = { custom_filter: 'value' };
      await getInventoryRows(filters);

      expect(mockRpc).toHaveBeenCalledWith('get_inventory_rows', expect.objectContaining({
        _filter: { custom_filter: 'value' }
      }));
    });
  });
});
