'use client'

import { useState, useMemo } from 'react'
import type { Filter } from './data-filters'
import type { ClientDashboardConfig } from '../types'

// Simple data viewer hook
export function useDataViewer({ config, records, totalCount }: { 
  config: ClientDashboardConfig; 
  records: unknown[]; 
  totalCount?: number 
}) {
  const [filters, setFilters] = useState<Filter[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filteredData = useMemo(() => {
    // Simple filtering logic
    return records
  }, [records, filters])

  const handleClickWidget = (tile: any) => {
    console.log('Widget clicked:', tile)
  }

  const handleFilter = (filterType: string) => (filter: Filter) => {
    console.log('Filter applied:', filterType, filter)
  }

  return {
    data: filteredData,
    totalCount: totalCount ?? records.length,
    filters,
    setFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading: false,
    error: null,
    drawerOpen,
    setDrawerOpen,
    filteredData,
    handleClickWidget,
    handleFilter,
  }
}

// Simple data viewer component
export function DataViewer({ 
  drawerOpen, 
  setDrawerOpen, 
  filteredData, 
  filters, 
  config,
  totalCount
}: {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  filteredData: unknown[]
  filters: Filter[]
  config: ClientDashboardConfig
  totalCount?: number
}) {
  return (
    <div className="p-4">
      <h3>Data Viewer</h3>
      <p>Records: {filteredData.length}</p>
      <p>Total Count: {totalCount}</p>
      <p>Filters: {filters.length}</p>
    </div>
  )
}
