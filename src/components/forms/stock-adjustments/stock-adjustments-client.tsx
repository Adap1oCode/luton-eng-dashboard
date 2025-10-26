'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStockAdjustments } from '@/hooks/use-stock-adjustments'
import type { ColumnFilterState } from '@/components/data-table/data-table-filters'
import ResourceTableClient from '@/components/forms/resource-view/resource-table-client'
import { stockAdjustmentsViewConfig } from '@/app/(main)/forms/stock-adjustments/view.config'
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring'
import { queryKeys } from '@/lib/react-query'

interface StockAdjustmentsClientProps {
  initialRows: any[]
  initialTotal: number
  initialPage: number
  initialPageSize: number
}

export default function StockAdjustmentsClient({
  initialRows,
  initialTotal,
  initialPage,
  initialPageSize,
}: StockAdjustmentsClientProps) {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [filters, setFilters] = useState<Record<string, ColumnFilterState>>({})

  // React Query client for invalidation
  const queryClient = useQueryClient()

  // Performance monitoring
  const { logPerformanceSummary, getMetrics } = usePerformanceMonitoring()

  // Use React Query for data fetching with caching
  // Map UI filters -> API query (bracketed format)
  const apiFilters = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [id, f] of Object.entries(filters)) {
      if (!f?.value) continue
      out[`filters[${id}][value]`] = f.value
      out[`filters[${id}][mode]`] = (f.mode ?? 'contains') as string
    }
    return out
  }, [filters])

  const { data, isLoading, error, isFetching } = useStockAdjustments({
    page,
    pageSize,
    ...apiFilters,
  })

  // Transform data for the table
  const rows = useMemo(() => {
    if (data && 'rows' in data && Array.isArray(data.rows)) {
      return data.rows.map((d: any) => ({
        id: String(d?.id ?? ""),
        user_id: String(d?.user_id ?? ""),
        full_name: String(d?.full_name ?? ""),
        warehouse: String(d?.warehouse ?? ""),
        tally_card_number: d?.tally_card_number ?? null,
        card_uid: d?.card_uid ?? null,
        qty: d?.qty ?? null,
        location: d?.location ?? null,
        note: d?.note ?? null,
        updated_at: d?.updated_at ?? null,
      }))
    }
    return initialRows
  }, [data, initialRows])

  const total = (data && 'total' in data) ? data.total : initialTotal

  // Log performance metrics when data loads
  useEffect(() => {
    if (data && !isLoading) {
      console.log('📊 Stock Adjustments: Data loaded successfully')
      logPerformanceSummary()
    }
  }, [data, isLoading, logPerformanceSummary])

  // Handle pagination changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1) // Reset to first page when changing page size
  }

  // Handle filter changes
  const handleFiltersChange = (newFilters: Record<string, ColumnFilterState>) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  // Expose invalidation helper for inline edits (passed via context or prop if needed)
  const invalidateStockAdjustments = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.stockAdjustments.all })
  }

  return (
    <ResourceTableClient
      config={stockAdjustmentsViewConfig}
      initialRows={rows}
      initialTotal={total}
      page={page}
      pageSize={pageSize}
      onFiltersChange={handleFiltersChange}
    />
  )
}
