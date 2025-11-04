import { describe, it, expect } from 'vitest'
import { tallyCardsViewConfig, type TallyCardRow } from '@/app/(main)/forms/tally-cards/tally-cards.config'

describe('Tally Cards View Config', () => {
  describe('Type Definition', () => {
    it('should have correct TallyCardRow type structure', () => {
      const mockRow: TallyCardRow = {
        id: '1',
        card_uid: 'card-1',
        warehouse_id: 'wh-001',
        tally_card_number: 'TC-001',
        item_number: 12345,
        note: 'Test note',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        snapshot_at: '2024-01-01T00:00:00Z'
      }

      expect(mockRow.id).toBe('1')
      expect(mockRow.card_uid).toBe('card-1')
      expect(mockRow.warehouse_id).toBe('wh-001')
      expect(mockRow.tally_card_number).toBe('TC-001')
      expect(mockRow.item_number).toBe(12345)
      expect(mockRow.note).toBe('Test note')
      expect(mockRow.is_active).toBe(true)
    })
  })

  describe('View Configuration', () => {
    it('should have correct resource configuration', () => {
      expect(tallyCardsViewConfig.resourceKeyForDelete).toBe('tcm_tally_cards')
      expect(tallyCardsViewConfig.formsRouteSegment).toBe('tally-cards')
      expect(tallyCardsViewConfig.idField).toBe('id')
    })

    it('should have correct feature configuration', () => {
      expect(tallyCardsViewConfig.features.rowSelection).toBe(true)
      expect(tallyCardsViewConfig.features.pagination).toBe(true)
    })

    it('should have buildColumns function', () => {
      expect(typeof tallyCardsViewConfig.buildColumns).toBe('function')
    })

    it('should build columns with correct structure', () => {
      const columns = tallyCardsViewConfig.buildColumns()
      
      expect(Array.isArray(columns)).toBe(true)
      expect(columns.length).toBeGreaterThan(0)
      
      // Check for required columns
      const columnIds = columns.map(col => col.id)
      expect(columnIds).toContain('id')
      expect(columnIds).toContain('tally_card_number')
      expect(columnIds).toContain('warehouse_id')
      expect(columnIds).toContain('item_number')
      expect(columnIds).toContain('note')
      expect(columnIds).toContain('is_active')
      expect(columnIds).toContain('snapshot_at')
    })

    it('should have correct column properties', () => {
      const columns = tallyCardsViewConfig.buildColumns()
      
      // Check id column (hidden)
      const idColumn = columns.find(col => col.id === 'id')
      expect(idColumn).toBeDefined()
      expect(idColumn?.enableHiding).toBe(true)
      expect(idColumn?.enableSorting).toBe(false)
      expect(idColumn?.enableColumnFilter).toBe(false)
      expect(idColumn?.size).toBe(0)
      expect(idColumn?.meta?.routingOnly).toBe(true)

      // Check tally_card_number column
      const tallyColumn = columns.find(col => col.id === 'tally_card_number')
      expect(tallyColumn).toBeDefined()
      expect(tallyColumn?.header).toBe('Tally Card Number')
      expect(tallyColumn?.enableSorting).toBe(true)
      expect(tallyColumn?.size).toBe(180)

      // Check warehouse_id column
      const warehouseColumn = columns.find(col => col.id === 'warehouse_id')
      expect(warehouseColumn).toBeDefined()
      expect(warehouseColumn?.header).toBe('Warehouse ID')
      expect(warehouseColumn?.enableSorting).toBe(true)
      expect(warehouseColumn?.size).toBe(160)

      // Check item_number column
      const itemColumn = columns.find(col => col.id === 'item_number')
      expect(itemColumn).toBeDefined()
      expect(itemColumn?.header).toBe('Item Number')
      expect(itemColumn?.enableSorting).toBe(true)
      expect(itemColumn?.size).toBe(140)

      // Check note column
      const noteColumn = columns.find(col => col.id === 'note')
      expect(noteColumn).toBeDefined()
      expect(noteColumn?.header).toBe('Note')
      expect(noteColumn?.enableSorting).toBe(false)
      expect(noteColumn?.size).toBe(280)

      // Check is_active column
      const activeColumn = columns.find(col => col.id === 'is_active')
      expect(activeColumn).toBeDefined()
      expect(activeColumn?.header).toBe('Active')
      expect(activeColumn?.enableSorting).toBe(true)
      expect(activeColumn?.size).toBe(100)

      // Check snapshot_at column
      const snapshotColumn = columns.find(col => col.id === 'snapshot_at')
      expect(snapshotColumn).toBeDefined()
      expect(snapshotColumn?.header).toBe('Snapshot')
      expect(snapshotColumn?.enableSorting).toBe(true)
      expect(snapshotColumn?.size).toBe(180)
    })

    it('should have actions column', () => {
      const columns = tallyCardsViewConfig.buildColumns()
      const actionsColumn = columns.find(col => col.id === 'actions')
      expect(actionsColumn).toBeDefined()
    })
  })

  describe('Bundle Export', () => {
    it('should export title correctly', async () => {
      const { title } = await import('@/app/(main)/forms/tally-cards/tally-cards.config')
      expect(title).toBe('Tally Cards')
    })

    it('should export config object with all required properties', async () => {
      const { config } = await import('@/app/(main)/forms/tally-cards/tally-cards.config')
      
      expect(config).toHaveProperty('title')
      expect(config).toHaveProperty('viewConfig')
      expect(config).toHaveProperty('toolbar')
      expect(config).toHaveProperty('chips')
      expect(config).toHaveProperty('actions')
      
      expect(config.title).toBe('Tally Cards')
      expect(config.viewConfig).toBe(tallyCardsViewConfig)
    })
  })
})
