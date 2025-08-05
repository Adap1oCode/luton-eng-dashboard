'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { DataTable } from '@/components/dashboard/widgets/data-table'
import { applyDataFilters, Filter } from '@/components/dashboard/client/data-filters'
import type { ClientDashboardConfig, DashboardWidget, DashboardTile } from '@/components/dashboard/types'
import { supabase } from '@/lib/supabase' // ⬇️ NEW: import Supabase client

export function useDataViewer({
  config,
  records,
}: {
  config: ClientDashboardConfig
  records: any[]
}) {
  const [filters, setFilters]       = useState<Filter[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ⬇️ NEW: state for RPC results & loading
  const [rpcData, setRpcData]       = useState<any[] | null>(null)
  const [loading, setLoading]       = useState(false)

  // apply either RPC data or client-filtered records
  const clientFiltered =
    filters.length === 0 ? records : applyDataFilters(records, filters, config)

  const filteredData = rpcData ?? clientFiltered

  useEffect(() => {
    if (filters.length === 0 && rpcData === null) {
      setDrawerOpen(false)
    }
  }, [filters, rpcData])

  useEffect(() => {
    if (filters.length > 0 || rpcData !== null) {
      console.group('[🧪 FILTER/RPC DATA]')
      console.log('Filters:', filters)
      console.log('Using RPC data?', rpcData !== null)
      console.log('Result count:', filteredData.length)
      console.groupEnd()
    }
  }, [filters, rpcData, filteredData])

  const handleClickWidget = async (widget: DashboardWidget | DashboardTile) => {
    const filter  = (widget as any).filter
    const rpcName = (widget as any).rpcName

    if (rpcName) {
      // Build an RPC-friendly filter object (ensuring op & value)
      let rpcFilter: Record<string, string | number> = {}
      if (filter) {
        // Already in full { column, op, value } form
        if ('op' in (filter as any) && 'value' in (filter as any)) {
          rpcFilter = { ...(filter as any) }
        }
        // Shorthand equals
        else if ('equals' in (filter as any)) {
          const { column, equals } = filter as any
          rpcFilter = { column, op: '=', value: equals! }
        }
        // Shorthand contains
        else if ('contains' in (filter as any)) {
          const { column, contains } = filter as any
          rpcFilter = { column, op: 'ILIKE', value: `%${contains}%` }
        }
      }

      setFilters([])
      setRpcData(null)
      setLoading(true)

      const limit = config.tableLimit ?? 50
      const { data, error } = await supabase.rpc(rpcName, {
        _filter:     rpcFilter,
        _distinct:   (widget as any).distinct ?? false,
        _range_from: 0,
        _range_to:   limit - 1,
      })

      setLoading(false)
      if (error) {
        console.error('RPC error:', error)
      } else {
        setRpcData(data as any[])
        setDrawerOpen(true)
      }
      return
    }

    // ⬇️ existing client-filter path
    if (!filter) return

    console.group('[🔍 Widget Click]')
    console.log('Filter:', filter)
    console.log('Records before filter:', records.length)
    console.groupEnd()

    setRpcData(null)
    setFilters([filter])
    setDrawerOpen(true)
  }

  const handleFilter = (type: string) => (values: string[]) => {
    const updated = values.map((val) => ({ column: type, contains: val }))
    console.debug(`[🟧 handleFilter] ${type} contains:`, updated)
    setRpcData(null)
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
    loading, // ⬇️ NEW: expose loading if you want a spinner
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
        <h2 className="text-xl font-semibold mb-4">
          {/* Always use the same label and display the total shown */}
          Number of Records ({filteredData.length})
        </h2>
        <div className="p-4">
          {/* Optional: show loader */}
          {/** loading && <Spinner /> **/}
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
