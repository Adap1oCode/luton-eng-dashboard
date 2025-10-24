'use client'

import { useState, useMemo, useEffect } from 'react'
import { useStockAdjustments } from '@/hooks/use-stock-adjustments'
import ResourceTableClient from '@/components/forms/resource-view/resource-table-client'
import { stockAdjustmentsViewConfig } from '@/app/(main)/forms/stock-adjustments/view.config'
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring'

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
  const [filters, setFilters] = useState({})

  // Performance monitoring
  const { logPerformanceSummary, getMetrics } = usePerformanceMonitoring()

  // Use React Query for data fetching with caching
  const { data, isLoading, error, isFetching } = useStockAdjustments({
    page,
    pageSize,
    ...filters,
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
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
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
