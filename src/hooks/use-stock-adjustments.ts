import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, performanceMonitor } from '@/lib/react-query'

// Types for stock adjustments
export interface StockAdjustmentFilters {
  page?: number
  pageSize?: number
  search?: string
  warehouse?: string
  dateFrom?: string
  dateTo?: string
  // structured filters mapping, e.g.: filters[name][value], filters[name][mode]
  [key: string]: any
}

export interface StockAdjustmentRow {
  id: string
  tally_card_number: string
  item_number: string
  item_description: string
  warehouse: string
  quantity: number
  unit_of_measure: string
  created_at: string
  created_by: string
  status: string
}

// Hook for fetching stock adjustments with caching
export function useStockAdjustments(filters: StockAdjustmentFilters = {}) {
  const {
    page = 1,
    pageSize = 10,
    ...extraQuery
  } = filters

  return useQuery({
    queryKey: queryKeys.stockAdjustments.list(filters),
    queryFn: async () => {
      return performanceMonitor.trackQuery(
        [...queryKeys.stockAdjustments.list(filters)],
        async () => {
          const qs = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            raw: 'true',
          })
          for (const [k, v] of Object.entries(extraQuery)) {
            if (v === undefined || v === null) continue
            qs.append(k, String(v))
          }

          const res = await fetch(`/api/v_tcm_user_tally_card_entries?${qs.toString()}`, {
            cache: 'no-store', // Client-side should not cache
            headers: { 'Content-Type': 'application/json' },
          })

          if (!res.ok) return { rows: [], total: 0 }

          const payload: any = (await res.json()) ?? {}
          const rows = (payload.rows ?? payload.data ?? []) as StockAdjustmentRow[]
          const totalCandidate = Number(payload.total ?? payload.count)
          const total = Number.isFinite(totalCandidate) ? totalCandidate : rows.length

          return { rows, total }
        }
      )
    },
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Don't refetch on window focus (saves bandwidth)
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect (saves bandwidth)  
    refetchOnReconnect: false,
  })
}

// Hook for deleting stock adjustments with cache invalidation
export function useDeleteStockAdjustments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/v_tcm_user_tally_card_entries/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete stock adjustments')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch stock adjustments queries
      queryClient.invalidateQueries({ queryKey: queryKeys.stockAdjustments.all })
    },
  })
}

// Hook for creating stock adjustments with cache invalidation
export function useCreateStockAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<StockAdjustmentRow>) => {
      const response = await fetch('/api/v_tcm_user_tally_card_entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create stock adjustment')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch stock adjustments queries
      queryClient.invalidateQueries({ queryKey: queryKeys.stockAdjustments.all })
    },
  })
}

// Hook for updating stock adjustments with cache invalidation
export function useUpdateStockAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StockAdjustmentRow> }) => {
      const response = await fetch(`/api/v_tcm_user_tally_card_entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update stock adjustment')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch stock adjustments queries
      queryClient.invalidateQueries({ queryKey: queryKeys.stockAdjustments.all })
    },
  })
}
