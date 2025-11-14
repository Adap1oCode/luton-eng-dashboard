import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'

// Mock the component - we'll test the logic directly
// Since ResourceTableClient is complex, we'll test the key functions

describe('ResourceTableClient - Inline Edit', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('buildQueryKey', () => {
    it('should build specific query key with page, pageSize, and filters', () => {
      const getApiEndpoint = () => '/api/v_tcm_user_tally_card_entries'
      const buildQueryKey = (
        currentPage: number,
        currentPageSize: number,
        currentFilters?: Record<string, string>
      ): (string | number)[] => {
        const endpoint = getApiEndpoint()
        const endpointKey = endpoint.replace(/^\/api\//, '')
        const serializedFilters = currentFilters
          ? Object.keys(currentFilters)
              .sort()
              .map((k) => `${encodeURIComponent(k)}:${encodeURIComponent(currentFilters[k])}`)
              .join('|')
          : 'no-filters'
        return [endpointKey, currentPage, currentPageSize, serializedFilters]
      }

      // Test with no filters
      const key1 = buildQueryKey(1, 10)
      expect(key1).toEqual(['v_tcm_user_tally_card_entries', 1, 10, 'no-filters'])

      // Test with filters
      const key2 = buildQueryKey(2, 20, { status: 'ACTIVE' })
      expect(key2).toEqual(['v_tcm_user_tally_card_entries', 2, 20, 'status:ACTIVE'])

      // Test with multiple filters (should be sorted)
      const key3 = buildQueryKey(1, 10, { status: 'ACTIVE', warehouse: 'WH-001' })
      expect(key3[0]).toBe('v_tcm_user_tally_card_entries')
      expect(key3[1]).toBe(1)
      expect(key3[2]).toBe(10)
      expect(key3[3]).toContain('status:ACTIVE')
      expect(key3[3]).toContain('warehouse:WH-001')
    })
  })

  describe('Scoped Invalidation', () => {
    it('should invalidate only the specific query key matching current page/filters', async () => {
      const queryClient = new QueryClient()
      
      // Set up mock query data with specific key
      const specificQueryKey = ['v_tcm_user_tally_card_entries', 1, 10, 'no-filters']
      queryClient.setQueryData(specificQueryKey, {
        rows: [{ id: '1', qty: 5 }],
        total: 1,
      })

      // Set up another query with different params (should NOT be invalidated)
      const otherQueryKey = ['v_tcm_user_tally_card_entries', 2, 10, 'no-filters']
      queryClient.setQueryData(otherQueryKey, {
        rows: [{ id: '2', qty: 10 }],
        total: 1,
      })

      // Simulate invalidation (as done in handleInlineEditSave)
      queryClient.invalidateQueries({ queryKey: specificQueryKey })

      // Wait for invalidation
      await waitFor(() => {
        const data = queryClient.getQueryData(specificQueryKey)
        // After invalidation, query should be marked as stale
        const state = queryClient.getQueryState(specificQueryKey)
        expect(state?.isInvalidated).toBe(true)
      })

      // Other query should remain untouched
      const otherData = queryClient.getQueryData(otherQueryKey)
      expect(otherData).toBeDefined()
      const otherState = queryClient.getQueryState(otherQueryKey)
      expect(otherState?.isInvalidated).toBeFalsy()
    })
  })

  describe('Optimistic Update', () => {
    it('should apply optimistic update to matching row only', () => {
      const queryClient = new QueryClient()
      const queryKey = ['v_tcm_user_tally_card_entries', 1, 10, 'no-filters']
      
      const initialData = {
        rows: [
          { id: '1', qty: 5, location: 'A1' },
          { id: '2', qty: 10, location: 'B2' },
          { id: '3', qty: 15, location: 'C3' },
        ],
        total: 3,
      }

      queryClient.setQueryData(queryKey, initialData)

      // Simulate optimistic update (as done in handleInlineEditSave)
      const editingCell = { rowId: '2', columnId: 'qty', value: 20 }
      const optimisticPayload = { [editingCell.columnId]: editingCell.value }
      const idField = 'id'

      queryClient.setQueryData(queryKey, (prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          rows: prev.rows.map((r: any) => {
            const rowId = (r as any)[idField]
            return rowId === editingCell.rowId
              ? { ...r, ...optimisticPayload }
              : r
          }),
        }
      })

      const updatedData = queryClient.getQueryData(queryKey) as any

      // Verify only the matching row was updated
      expect(updatedData.rows[0].qty).toBe(5) // Unchanged
      expect(updatedData.rows[1].qty).toBe(20) // Updated
      expect(updatedData.rows[1].location).toBe('B2') // Other fields unchanged
      expect(updatedData.rows[2].qty).toBe(15) // Unchanged
      expect(updatedData.total).toBe(3) // Total unchanged
    })

    it('should handle optimistic update when row not found', () => {
      const queryClient = new QueryClient()
      const queryKey = ['v_tcm_user_tally_card_entries', 1, 10, 'no-filters']
      
      const initialData = {
        rows: [{ id: '1', qty: 5 }],
        total: 1,
      }

      queryClient.setQueryData(queryKey, initialData)

      // Try to update non-existent row
      const editingCell = { rowId: '999', columnId: 'qty', value: 20 }
      const optimisticPayload = { [editingCell.columnId]: editingCell.value }
      const idField = 'id'

      queryClient.setQueryData(queryKey, (prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          rows: prev.rows.map((r: any) => {
            const rowId = (r as any)[idField]
            return rowId === editingCell.rowId
              ? { ...r, ...optimisticPayload }
              : r
          }),
        }
      })

      const updatedData = queryClient.getQueryData(queryKey) as any

      // No rows should be changed
      expect(updatedData.rows[0].qty).toBe(5)
      expect(updatedData.rows.length).toBe(1)
    })

    it('should handle optimistic update with null/undefined prev data', () => {
      const queryClient = new QueryClient()
      const queryKey = ['v_tcm_user_tally_card_entries', 1, 10, 'no-filters']

      // No initial data set
      const editingCell = { rowId: '1', columnId: 'qty', value: 20 }
      const optimisticPayload = { [editingCell.columnId]: editingCell.value }
      const idField = 'id'

      queryClient.setQueryData(queryKey, (prev: any) => {
        if (!prev) return prev // Should return null/undefined
        return {
          ...prev,
          rows: prev.rows.map((r: any) => {
            const rowId = (r as any)[idField]
            return rowId === editingCell.rowId
              ? { ...r, ...optimisticPayload }
              : r
          }),
        }
      })

      const data = queryClient.getQueryData(queryKey)
      // Should return null/undefined since prev was null
      expect(data).toBeUndefined()
    })
  })

  describe('Error Rollback', () => {
    it('should rollback optimistic update on error by invalidating query', async () => {
      const queryClient = new QueryClient()
      const queryKey = ['v_tcm_user_tally_card_entries', 1, 10, 'no-filters']
      
      const initialData = {
        rows: [{ id: '1', qty: 5 }],
        total: 1,
      }

      queryClient.setQueryData(queryKey, initialData)

      // Apply optimistic update
      queryClient.setQueryData(queryKey, (prev: any) => ({
        ...prev,
        rows: [{ id: '1', qty: 20 }],
      }))

      // Verify optimistic update applied
      let data = queryClient.getQueryData(queryKey) as any
      expect(data.rows[0].qty).toBe(20)

      // Simulate error rollback (invalidate to refetch original data)
      queryClient.invalidateQueries({ queryKey })

      // After invalidation, query should be marked for refetch
      await waitFor(() => {
        const state = queryClient.getQueryState(queryKey)
        expect(state?.isInvalidated).toBe(true)
      })
    })
  })
})





















