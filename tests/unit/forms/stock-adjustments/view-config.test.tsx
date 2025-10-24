import { describe, it, expect } from 'vitest'
import { stockAdjustmentsViewConfig, type StockAdjustmentRow } from '@/app/(main)/forms/stock-adjustments/view.config'

describe('Stock Adjustments View Config', () => {
  describe('Type Definition', () => {
    it('should have correct StockAdjustmentRow type structure', () => {
      const mockRow: StockAdjustmentRow = {
        id: '1',
        full_name: 'John Doe',
        warehouse: 'WH-001',
        tally_card_number: 'TC-001',
        qty: 10,
        location: 'A1-B2',
        note: 'Test note',
        updated_at: '2024-01-01T00:00:00Z',
        updated_at_pretty: 'Jan 1, 2024'
      }

      expect(mockRow.id).toBe('1')
      expect(mockRow.full_name).toBe('John Doe')
      expect(mockRow.warehouse).toBe('WH-001')
      expect(mockRow.tally_card_number).toBe('TC-001')
      expect(mockRow.qty).toBe(10)
      expect(mockRow.location).toBe('A1-B2')
      expect(mockRow.note).toBe('Test note')
    })
  })

  describe('View Configuration', () => {
    it('should have correct resource configuration', () => {
      expect(stockAdjustmentsViewConfig.resourceKeyForDelete).toBe('tcm_user_tally_card_entries')
      expect(stockAdjustmentsViewConfig.formsRouteSegment).toBe('stock-adjustments')
      expect(stockAdjustmentsViewConfig.idField).toBe('id')
    })

    it('should have correct feature configuration', () => {
      expect(stockAdjustmentsViewConfig.features.rowSelection).toBe(true)
      expect(stockAdjustmentsViewConfig.features.pagination).toBe(true)
    })

    it('should have buildColumns function', () => {
      expect(typeof stockAdjustmentsViewConfig.buildColumns).toBe('function')
    })

    it('should build columns with correct structure', () => {
      const columns = stockAdjustmentsViewConfig.buildColumns()
      
      expect(Array.isArray(columns)).toBe(true)
      expect(columns.length).toBeGreaterThan(0)
      
      // Check for required columns
      const columnIds = columns.map(col => col.id)
      expect(columnIds).toContain('id')
      expect(columnIds).toContain('full_name')
      expect(columnIds).toContain('warehouse')
      expect(columnIds).toContain('tally_card_number')
      expect(columnIds).toContain('qty')
      expect(columnIds).toContain('location')
      expect(columnIds).toContain('note')
      expect(columnIds).toContain('updated_at_pretty')
    })

    it('should have correct column properties', () => {
      const columns = stockAdjustmentsViewConfig.buildColumns()
      
      // Check id column (hidden)
      const idColumn = columns.find(col => col.id === 'id')
      expect(idColumn).toBeDefined()
      expect(idColumn?.enableHiding).toBe(true)
      expect(idColumn?.enableSorting).toBe(false)
      expect(idColumn?.enableColumnFilter).toBe(false)
      expect(idColumn?.size).toBe(0)
      expect(idColumn?.meta?.routingOnly).toBe(true)

      // Check full_name column
      const nameColumn = columns.find(col => col.id === 'full_name')
      expect(nameColumn).toBeDefined()
      expect(nameColumn?.header).toBe('Name')
      expect(nameColumn?.enableSorting).toBe(true)
      expect(nameColumn?.size).toBe(160)

      // Check warehouse column
      const warehouseColumn = columns.find(col => col.id === 'warehouse')
      expect(warehouseColumn).toBeDefined()
      expect(warehouseColumn?.header).toBe('Warehouse')
      expect(warehouseColumn?.enableSorting).toBe(true)
      expect(warehouseColumn?.size).toBe(160)

      // Check tally_card_number column
      const tallyColumn = columns.find(col => col.id === 'tally_card_number')
      expect(tallyColumn).toBeDefined()
      expect(tallyColumn?.header).toBe('Tally Card')
      expect(tallyColumn?.enableSorting).toBe(true)
      expect(tallyColumn?.size).toBe(160)

      // Check qty column
      const qtyColumn = columns.find(col => col.id === 'qty')
      expect(qtyColumn).toBeDefined()
      expect(qtyColumn?.header).toBe('Qty')
      expect(qtyColumn?.enableSorting).toBe(true)
      expect(qtyColumn?.size).toBe(90)

      // Check location column
      const locationColumn = columns.find(col => col.id === 'location')
      expect(locationColumn).toBeDefined()
      expect(locationColumn?.header).toBe('Location')
      expect(locationColumn?.enableSorting).toBe(true)
      expect(locationColumn?.size).toBe(160)

      // Check note column
      const noteColumn = columns.find(col => col.id === 'note')
      expect(noteColumn).toBeDefined()
      expect(noteColumn?.header).toBe('Note')
      expect(noteColumn?.enableSorting).toBe(false)
      expect(noteColumn?.size).toBe(280)

      // Check updated_at_pretty column
      const updatedColumn = columns.find(col => col.id === 'updated_at_pretty')
      expect(updatedColumn).toBeDefined()
      expect(updatedColumn?.header).toBe('Updated')
      expect(updatedColumn?.enableSorting).toBe(true)
      expect(updatedColumn?.size).toBe(180)
    })

    it('should have actions column', () => {
      const columns = stockAdjustmentsViewConfig.buildColumns()
      const actionsColumn = columns.find(col => col.id === 'actions')
      expect(actionsColumn).toBeDefined()
    })
  })

  describe('Bundle Export', () => {
    it('should export title correctly', () => {
      const { title } = require('@/app/(main)/forms/stock-adjustments/view.config')
      expect(title).toBe('Stock Adjustments')
    })

    it('should export config object with all required properties', () => {
      const { config } = require('@/app/(main)/forms/stock-adjustments/view.config')
      
      expect(config).toHaveProperty('title')
      expect(config).toHaveProperty('viewConfig')
      expect(config).toHaveProperty('toolbar')
      expect(config).toHaveProperty('chips')
      expect(config).toHaveProperty('actions')
      
      expect(config.title).toBe('Stock Adjustments')
      expect(config.viewConfig).toBe(stockAdjustmentsViewConfig)
    })
  })
})
