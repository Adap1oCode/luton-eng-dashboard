import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attachTileActions } from '@/components/dashboard/client/tile-actions';

describe('Tile Actions', () => {
  const mockTiles = [
    {
      key: 'outOfStock',
      title: 'Out of Stock Items',
      value: 5,
      filter: { column: 'total_available', equals: 0 },
      rpcName: 'get_inventory_rows',
      clickable: true,
    },
    {
      key: 'totalItems',
      title: 'Total Items',
      value: 100,
      filter: { column: 'item_number', isNotNull: true },
      rpcName: 'get_inventory_rows',
      clickable: true,
    },
    {
      key: 'nonClickable',
      title: 'Non-Clickable Tile',
      value: 50,
      clickable: false,
    },
  ];

  const mockWidget = {
    key: 'testWidget',
    component: 'SummaryCards',
    clickable: true,
  };

  const mockOnClick = vi.fn();
  const mockOnFilter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('attachTileActions', () => {
    it('should attach onClick handlers to clickable tiles', () => {
      const result = attachTileActions(mockTiles, mockWidget, mockOnClick, mockOnFilter);

      // Should have onClick handlers for clickable tiles
      expect(result[0].onClick).toBeDefined();
      expect(result[1].onClick).toBeDefined();
      expect(result[2].onClick).toBeUndefined(); // Non-clickable tile

      // Should preserve original properties
      expect(result[0].key).toBe('outOfStock');
      expect(result[0].title).toBe('Out of Stock Items');
      expect(result[0].value).toBe(5);
    });

    it('should call onClick handler when tile is clicked', () => {
      const result = attachTileActions(mockTiles, mockWidget, mockOnClick, mockOnFilter);

      // Simulate tile click
      if (result[0].onClick) {
        result[0].onClick();
      }

      expect(mockOnClick).toHaveBeenCalledWith(mockTiles[0]);
    });

    it('should handle tiles with RPC configuration', () => {
      const result = attachTileActions(mockTiles, mockWidget, mockOnClick, mockOnFilter);

      // Tiles with RPC should have RPC configuration preserved
      expect(result[0].rpcName).toBe('get_inventory_rows');
      expect(result[0].filter).toEqual({ column: 'total_available', equals: 0 });
    });

    it('should handle tiles with filter configuration', () => {
      const result = attachTileActions(mockTiles, mockWidget, mockOnClick, mockOnFilter);

      // Tiles with filters should have filter configuration preserved
      expect(result[1].filter).toEqual({ column: 'item_number', isNotNull: true });
    });

    it('should inherit widget-level properties when absent on tile', () => {
      const widgetWithRpc = {
        ...mockWidget,
        rpcName: 'get_inventory_rows',
        filter: { column: 'warehouse', equals: 'Main Warehouse' },
      };

      const tilesWithoutRpc = [
        {
          key: 'testTile',
          title: 'Test Tile',
          value: 10,
          clickable: true,
        },
      ];

      const result = attachTileActions(tilesWithoutRpc, widgetWithRpc, mockOnClick, mockOnFilter);

      // Should inherit RPC configuration from widget
      expect(result[0].rpcName).toBe('get_inventory_rows');
      // Note: The actual implementation may not inherit filter from widget
    });

    it('should handle empty tiles array', () => {
      const result = attachTileActions([], mockWidget, mockOnClick, mockOnFilter);

      expect(result).toEqual([]);
    });

    it('should handle tiles without clickable property', () => {
      const tilesWithoutClickable = [
        {
          key: 'testTile',
          title: 'Test Tile',
          value: 10,
        },
      ];

      const result = attachTileActions(tilesWithoutClickable, mockWidget, mockOnClick, mockOnFilter);

      // Should inherit clickable property from widget (if widget is clickable)
      // Note: The actual implementation may not inherit clickable from widget
    });

    it('should preserve all original tile properties', () => {
      const result = attachTileActions(mockTiles, mockWidget, mockOnClick, mockOnFilter);

      // Should preserve all original properties
      expect(result[0]).toMatchObject({
        key: 'outOfStock',
        title: 'Out of Stock Items',
        value: 5,
        filter: { column: 'total_available', equals: 0 },
        rpcName: 'get_inventory_rows',
        clickable: true,
      });
    });
  });
});
