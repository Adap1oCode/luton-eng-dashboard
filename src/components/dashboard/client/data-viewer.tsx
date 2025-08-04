'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { DataTable } from '@/components/dashboard/widgets/data-table'
import { applyDataFilters, Filter } from '@/components/dashboard/client/data-filters'
import type { ClientDashboardConfig, DashboardWidget, DashboardTile } from '@/components/dashboard/types'

export function useDataViewer({
  config,
  records,
}: {
  config: ClientDashboardConfig
  records: any[]
}) {
  const [filters, setFilters] = useState<Filter[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filteredData =
    filters.length === 0 ? records : applyDataFilters(records, filters, config)

  useEffect(() => {
    if (filters.length === 0) setDrawerOpen(false)
  }, [filters])

  useEffect(() => {
    if (filters.length > 0) {
      console.group('[🧪 FILTER APPLICATION]')
      console.log('🧩 Filters being applied:', filters)
      console.log('📄 Data BEFORE filtering:', records.slice(0, 5))
      console.groupEnd()
    }
  }, [filters, records])

  useEffect(() => {
    console.groupCollapsed('[📊 useDataViewer]')
    console.debug('🔍 Filters applied:', filters)
    console.debug('📋 Filtered data length:', filteredData.length)
    if (filteredData.length > 0) {
      console.table(filteredData.slice(0, 5))
    }
    console.groupEnd()
  }, [filters, filteredData])

  const handleClickWidget = (widget: DashboardWidget | DashboardTile) => {
    const filter = (widget as any).filter
    if (!filter) return
    console.group('[🔍 Widget Click Tracking]')
    console.log('📌 Clicked filter:', filter)
    console.log('📦 Current records length:', records.length)
    console.log('📦 Example record sample:', records.slice(0, 3))
    console.groupEnd()
    setFilters([filter])
    setDrawerOpen(true)
  }

  const handleFilter = (type: string) => (values: string[]) => {
    const updated = values.map((val) => ({ column: type, contains: val }))
    console.debug(`[🟧 handleFilter] ${type} contains:`, updated)
    setFilters(updated)
    setDrawerOpen(true)
  }

  return {
    filters,
    setFilters,
    drawerOpen,
    setDrawerOpen,
    filteredData,
    handleClickWidget,
    handleFilter,
  }
}

export function DataViewer({
  drawerOpen,
  setDrawerOpen,
  filteredData,
  filters,
  config,
}: {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  filteredData: any[]
  filters: Filter[]
  config: ClientDashboardConfig
}) {
  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        aria-labelledby="drawer-title"
        className="w-full max-w-none sm:max-w-[92vw] lg:max-w-[1300px] xl:max-w-[1500px] 2xl:max-w-[1600px] overflow-auto"
      >
        <h2 className="text-xl font-semibold mb-4">Filtered Requisition Records</h2>
        <div className="p-4">
          <DataTable
            key={filteredData.length + filters.map((f) => JSON.stringify(f)).join('|')}
            data={filteredData}
            columns={config.tableColumns}
            rowIdKey={config.rowIdKey}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
