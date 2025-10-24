import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/supabase/factory', () => ({
  createSupabaseServerProvider: vi.fn(() => ({
    list: vi.fn()
  }))
}))

vi.mock('@/lib/auth/get-session-context', () => ({
  getSessionContext: vi.fn()
}))

vi.mock('@/lib/api/resolve-resource', () => ({
  resolveResource: vi.fn()
}))

describe('Stock Adjustments API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/v_tcm_user_tally_card_entries', () => {
    it('should return stock adjustments data with correct structure', async () => {
      const { listHandler } = await import('@/lib/api/handle-list')
      const { resolveResource } = await import('@/lib/api/resolve-resource')
      const { createSupabaseServerProvider } = await import('@/lib/supabase/factory')
      const { getSessionContext } = await import('@/lib/auth/get-session-context')

      // Mock successful resolution
      const mockConfig = {
        table: 'v_tcm_user_tally_card_entries',
        select: 'id, user_id, full_name, warehouse, tally_card_number, card_uid, qty, location, note, updated_at, updated_at_pretty, warehouse_id',
        pk: 'id',
        toDomain: (row: any) => row,
        warehouseScope: { mode: 'column', column: 'warehouse_id' },
        ownershipScope: { mode: 'self', column: 'user_id' }
      }

      resolveResource.mockResolvedValue({
        key: 'v_tcm_user_tally_card_entries',
        config: mockConfig,
        allowRaw: true
      })

      // Mock session context
      getSessionContext.mockResolvedValue({
        userId: 'test-user-id',
        canSeeAllWarehouses: true,
        allowedWarehouses: ['WH-001', 'WH-002'],
        permissions: ['resource:tcm_user_tally_card_entries:read']
      })

      // Mock provider response
      const mockProvider = {
        list: vi.fn().mockResolvedValue({
          rows: [
            {
              id: '1',
              user_id: 'user-1',
              full_name: 'John Doe',
              warehouse: 'WH-001',
              tally_card_number: 'TC-001',
              card_uid: 'card-1',
              qty: 10,
              location: 'A1-B2',
              note: 'Test note',
              updated_at: '2024-01-01T00:00:00Z',
              updated_at_pretty: 'Jan 1, 2024',
              warehouse_id: 'wh-001-uuid'
            },
            {
              id: '2',
              user_id: 'user-2',
              full_name: 'Jane Smith',
              warehouse: 'WH-002',
              tally_card_number: 'TC-002',
              card_uid: 'card-2',
              qty: 5,
              location: 'B1-C2',
              note: 'Another note',
              updated_at: '2024-01-02T00:00:00Z',
              updated_at_pretty: 'Jan 2, 2024',
              warehouse_id: 'wh-002-uuid'
            }
          ],
          total: 2
        })
      }

      createSupabaseServerProvider.mockReturnValue(mockProvider)

      // Test the API call
      const req = new NextRequest('http://localhost:3000/api/v_tcm_user_tally_card_entries?page=1&pageSize=10')
      const response = await listHandler(req, 'v_tcm_user_tally_card_entries')
      
      expect(response.ok).toBe(true)
      
      const body = await response.json()
      
      // Validate response structure
      expect(body).toHaveProperty('resource', 'v_tcm_user_tally_card_entries')
      expect(body).toHaveProperty('rows')
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('page')
      expect(body).toHaveProperty('pageSize')
      
      // Validate data
      expect(Array.isArray(body.rows)).toBe(true)
      expect(body.rows).toHaveLength(2)
      expect(body.total).toBe(2)
      expect(body.page).toBe(1)
      expect(body.pageSize).toBe(10)
      
      // Validate row structure
      const firstRow = body.rows[0]
      expect(firstRow).toHaveProperty('id')
      expect(firstRow).toHaveProperty('user_id')
      expect(firstRow).toHaveProperty('full_name')
      expect(firstRow).toHaveProperty('warehouse')
      expect(firstRow).toHaveProperty('tally_card_number')
      expect(firstRow).toHaveProperty('qty')
      expect(firstRow).toHaveProperty('location')
      expect(firstRow).toHaveProperty('note')
      expect(firstRow).toHaveProperty('updated_at')
    })

    it('should handle pagination correctly', async () => {
      const { listHandler } = await import('@/lib/api/handle-list')
      const { resolveResource } = await import('@/lib/api/resolve-resource')
      const { createSupabaseServerProvider } = await import('@/lib/supabase/factory')
      const { getSessionContext } = await import('@/lib/auth/get-session-context')

      // Mock setup
      resolveResource.mockResolvedValue({
        key: 'v_tcm_user_tally_card_entries',
        config: { table: 'v_tcm_user_tally_card_entries', select: '*', pk: 'id', toDomain: (row: any) => row },
        allowRaw: true
      })

      getSessionContext.mockResolvedValue({
        userId: 'test-user-id',
        canSeeAllWarehouses: true,
        allowedWarehouses: [],
        permissions: []
      })

      const mockProvider = {
        list: vi.fn().mockResolvedValue({ rows: [], total: 0 })
      }
      createSupabaseServerProvider.mockReturnValue(mockProvider)

      // Test page 2
      const req = new NextRequest('http://localhost:3000/api/v_tcm_user_tally_card_entries?page=2&pageSize=5')
      const response = await listHandler(req, 'v_tcm_user_tally_card_entries')
      
      expect(response.ok).toBe(true)
      
      const body = await response.json()
      expect(body.page).toBe(2)
      expect(body.pageSize).toBe(5)
    })

    it('should handle search queries', async () => {
      const { listHandler } = await import('@/lib/api/handle-list')
      const { resolveResource } = await import('@/lib/api/resolve-resource')
      const { createSupabaseServerProvider } = await import('@/lib/supabase/factory')
      const { getSessionContext } = await import('@/lib/auth/get-session-context')

      // Mock setup
      resolveResource.mockResolvedValue({
        key: 'v_tcm_user_tally_card_entries',
        config: { 
          table: 'v_tcm_user_tally_card_entries', 
          select: '*', 
          pk: 'id', 
          toDomain: (row: any) => row,
          search: ['tally_card_number', 'location', 'note', 'full_name']
        },
        allowRaw: true
      })

      getSessionContext.mockResolvedValue({
        userId: 'test-user-id',
        canSeeAllWarehouses: true,
        allowedWarehouses: [],
        permissions: []
      })

      const mockProvider = {
        list: vi.fn().mockResolvedValue({ 
          rows: [{ id: '1', tally_card_number: 'TC-001', full_name: 'John Doe' }], 
          total: 1 
        })
      }
      createSupabaseServerProvider.mockReturnValue(mockProvider)

      // Test search
      const req = new NextRequest('http://localhost:3000/api/v_tcm_user_tally_card_entries?q=TC-001&page=1&pageSize=10')
      const response = await listHandler(req, 'v_tcm_user_tally_card_entries')
      
      expect(response.ok).toBe(true)
      
      const body = await response.json()
      expect(Array.isArray(body.rows)).toBe(true)
      expect(body.total).toBe(1)
    })

    it('should handle raw=true parameter', async () => {
      const { listHandler } = await import('@/lib/api/handle-list')
      const { resolveResource } = await import('@/lib/api/resolve-resource')
      const { createSupabaseServerProvider } = await import('@/lib/supabase/factory')
      const { getSessionContext } = await import('@/lib/auth/get-session-context')

      // Mock setup
      resolveResource.mockResolvedValue({
        key: 'v_tcm_user_tally_card_entries',
        config: { table: 'v_tcm_user_tally_card_entries', select: '*', pk: 'id', toDomain: (row: any) => row },
        allowRaw: true
      })

      getSessionContext.mockResolvedValue({
        userId: 'test-user-id',
        canSeeAllWarehouses: true,
        allowedWarehouses: [],
        permissions: []
      })

      const mockProvider = {
        list: vi.fn().mockResolvedValue({ rows: [{ id: '1', raw_data: 'test' }], total: 1 })
      }
      createSupabaseServerProvider.mockReturnValue(mockProvider)

      // Test raw mode
      const req = new NextRequest('http://localhost:3000/api/v_tcm_user_tally_card_entries?raw=true&page=1&pageSize=10')
      const response = await listHandler(req, 'v_tcm_user_tally_card_entries')
      
      expect(response.ok).toBe(true)
      
      const body = await response.json()
      expect(body.raw).toBe(true)
      expect(Array.isArray(body.rows)).toBe(true)
    })

    it('should handle warehouse scoping', async () => {
      const { listHandler } = await import('@/lib/api/handle-list')
      const { resolveResource } = await import('@/lib/api/resolve-resource')
      const { createSupabaseServerProvider } = await import('@/lib/supabase/factory')
      const { getSessionContext } = await import('@/lib/auth/get-session-context')

      // Mock setup with warehouse scoping
      resolveResource.mockResolvedValue({
        key: 'v_tcm_user_tally_card_entries',
        config: { 
          table: 'v_tcm_user_tally_card_entries', 
          select: '*', 
          pk: 'id', 
          toDomain: (row: any) => row,
          warehouseScope: { mode: 'column', column: 'warehouse_id' }
        },
        allowRaw: true
      })

      // Mock user with limited warehouse access
      getSessionContext.mockResolvedValue({
        userId: 'test-user-id',
        canSeeAllWarehouses: false,
        allowedWarehouses: ['WH-001'],
        allowedWarehouseIds: ['wh-001-uuid'],
        permissions: []
      })

      const mockProvider = {
        list: vi.fn().mockResolvedValue({ 
          rows: [{ id: '1', warehouse: 'WH-001', warehouse_id: 'wh-001-uuid' }], 
          total: 1 
        })
      }
      createSupabaseServerProvider.mockReturnValue(mockProvider)

      const req = new NextRequest('http://localhost:3000/api/v_tcm_user_tally_card_entries?page=1&pageSize=10')
      const response = await listHandler(req, 'v_tcm_user_tally_card_entries')
      
      expect(response.ok).toBe(true)
      
      const body = await response.json()
      expect(Array.isArray(body.rows)).toBe(true)
      expect(body.total).toBe(1)
    })

    it('should handle ownership scoping', async () => {
      const { listHandler } = await import('@/lib/api/handle-list')
      const { resolveResource } = await import('@/lib/api/resolve-resource')
      const { createSupabaseServerProvider } = await import('@/lib/supabase/factory')
      const { getSessionContext } = await import('@/lib/auth/get-session-context')

      // Mock setup with ownership scoping
      resolveResource.mockResolvedValue({
        key: 'v_tcm_user_tally_card_entries',
        config: { 
          table: 'v_tcm_user_tally_card_entries', 
          select: '*', 
          pk: 'id', 
          toDomain: (row: any) => row,
          ownershipScope: { mode: 'self', column: 'user_id' }
        },
        allowRaw: true
      })

      // Mock user
      getSessionContext.mockResolvedValue({
        userId: 'test-user-id',
        canSeeAllWarehouses: true,
        allowedWarehouses: [],
        permissions: []
      })

      const mockProvider = {
        list: vi.fn().mockResolvedValue({ 
          rows: [{ id: '1', user_id: 'test-user-id' }], 
          total: 1 
        })
      }
      createSupabaseServerProvider.mockReturnValue(mockProvider)

      const req = new NextRequest('http://localhost:3000/api/v_tcm_user_tally_card_entries?page=1&pageSize=10')
      const response = await listHandler(req, 'v_tcm_user_tally_card_entries')
      
      expect(response.ok).toBe(true)
      
      const body = await response.json()
      expect(Array.isArray(body.rows)).toBe(true)
      expect(body.total).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle unknown resource gracefully', async () => {
      const { listHandler } = await import('@/lib/api/handle-list')
      const { resolveResource } = await import('@/lib/api/resolve-resource')

      resolveResource.mockRejectedValue(new Error('Unknown resource'))

      const req = new NextRequest('http://localhost:3000/api/unknown-resource')
      const response = await listHandler(req, 'unknown-resource')
      
      expect(response.status).toBe(404)
      
      const body = await response.json()
      expect(body.error.message).toContain('Unknown resource')
    })

    it('should handle database errors gracefully', async () => {
      const { listHandler } = await import('@/lib/api/handle-list')
      const { resolveResource } = await import('@/lib/api/resolve-resource')
      const { createSupabaseServerProvider } = await import('@/lib/supabase/factory')
      const { getSessionContext } = await import('@/lib/auth/get-session-context')

      resolveResource.mockResolvedValue({
        key: 'v_tcm_user_tally_card_entries',
        config: { table: 'v_tcm_user_tally_card_entries', select: '*', pk: 'id', toDomain: (row: any) => row },
        allowRaw: true
      })

      getSessionContext.mockResolvedValue({
        userId: 'test-user-id',
        canSeeAllWarehouses: true,
        allowedWarehouses: [],
        permissions: []
      })

      const mockProvider = {
        list: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      }
      createSupabaseServerProvider.mockReturnValue(mockProvider)

      const req = new NextRequest('http://localhost:3000/api/v_tcm_user_tally_card_entries')
      const response = await listHandler(req, 'v_tcm_user_tally_card_entries')
      
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.error.message).toContain('Database connection failed')
    })
  })
})
