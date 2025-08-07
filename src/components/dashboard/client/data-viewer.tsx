'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { DataTable } from '@/components/dashboard/widgets/data-table'
import { applyDataFilters, Filter } from '@/components/dashboard/client/data-filters'
import type { ClientDashboardConfig, DashboardWidget, DashboardTile } from '@/components/dashboard/types'
import * as dataAPI from '@/app/(main)/dashboard/inventory/_components/data'
import { supabase } from '@/lib/supabase'

export function useDataViewer({
  config,
  records,
}: {
  config: ClientDashboardConfig
  records: any[]
}) {
  const [filters, setFilters]       = useState<Filter[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [rpcData, setRpcData]       = useState<any[] | null>(null)
  const [loading, setLoading]       = useState(false)

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
    // ── keep your original logs ──
    console.log("🖱️ Widget clicked:", widget.key)
    console.log("🔎 Raw widget.filter tree:", (widget as any).filter)
    console.log('[TRACE] Widget clicked. key=', widget.key, 'rpcName=', (widget as any).rpcName)

    const filterTree = (widget as any).filter
    const rpcName    = (widget as any).rpcName
    const distinct   = (widget as any).distinct ?? false

    if (rpcName) {
      // 1) Try a JS‐side fetcher first
      const fetcher = (dataAPI as any)[rpcName]
      if (typeof fetcher === 'function') {
        console.log('[TRACE] Using view fetcher:', rpcName, 'for warehouse=', widget.key)
        setFilters([])
        setRpcData(null)
        setLoading(true)
        try {
          const limit = config.tableLimit ?? 50
          const rows  = await fetcher(widget.key, limit)
          console.log('[TRACE] view fetcher returned', rows.length, 'rows')
          setRpcData(rows)
          setDrawerOpen(true)
        } catch (e) {
          console.error('[ERROR] view fetcher', rpcName, 'failed:', e)
        } finally {
          setLoading(false)
        }
        return
      }

      // 2) Fallback to your old Supabase RPC
      console.log('[TRACE] Falling back to supabase.rpc:', rpcName)

      // build the same rpcFilter you had before
      const rpcFilter: Record<string, any> = {}
      if (filterTree?.and && Array.isArray(filterTree.and)) {
        const [warehouseClause, costClause] = filterTree.and
        rpcFilter.column = warehouseClause.column
        rpcFilter.op     = '='
        rpcFilter.value  = warehouseClause.equals
        if (costClause.or && Array.isArray(costClause.or)) {
          const parts = costClause.or.map((c: any) => {
            if (c.isNull)              return `${c.column} IS NULL`
            if (c.equals !== undefined) return `${c.column} = ${c.equals}`
            return ''
          })
          rpcFilter._sql = `(${parts.join(' OR ')})`
        }
      } else if (filterTree) {
        // fallback simple filter
        if ('op' in filterTree && 'value' in filterTree) {
          Object.assign(rpcFilter, filterTree as any)
        } else if ('equals' in filterTree) {
          rpcFilter.column = filterTree.column
          rpcFilter.op     = '='
          rpcFilter.value  = (filterTree as any).equals
        } else if ('contains' in filterTree) {
          rpcFilter.column = filterTree.column
          rpcFilter.op     = 'ILIKE'
          rpcFilter.value  = `%${(filterTree as any).contains}%`
        }
      }

      console.log("➡️ rpcFilter being sent to supabase.rpc:", rpcFilter)
      const limit = config.tableLimit ?? 50
      console.log('[TRACE] Calling supabase.rpc(', rpcName, ') with:', {
        _filter:     rpcFilter,
        _distinct:   distinct,
        _range_from: 0,
        _range_to:   limit - 1,
      })

      setFilters([])
      setRpcData(null)
      setLoading(true)

      try {
        const { data, error } = await supabase.rpc(rpcName, {
          _filter:     JSON.stringify(rpcFilter),
          _distinct:   distinct,
          _range_from: 0,
          _range_to:   limit - 1,
        })
        if (error) throw error
        console.log('[TRACE] supabase.rpc returned', (data as any[])?.length, 'rows')
        setRpcData(data as any[])
        setDrawerOpen(true)
      } catch (err) {
        console.error('RPC error:', err)
      } finally {
        setLoading(false)
      }
      return
    }

    // 3) Pure client‐side filter path
    if (!filterTree) return

    console.group('[🔍 Widget Click]')
    console.log('Filter:', filterTree)
    console.log('Records before filter:', records.length)
    console.groupEnd()

    setRpcData(null)
    setFilters([filterTree])
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
    loading,
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
    console.log(
    '[DEBUG DataViewer] drawerOpen=%s  filters=%o\n→ filteredData.length=%d firstRow=%o',
    drawerOpen,
    filters,
    filteredData.length,
    filteredData[0]
  );

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        aria-labelledby="drawer-title"
        className="w-full max-w-none sm:max-w-[92vw] lg:max-w-[1300px] xl:max-w-[1500px] 2xl:max-w-[1600px] overflow-auto"
      >
        <h2 className="text-xl font-semibold mb-4">
          Number of Records ({filteredData.length})
        </h2>
        <div className="p-4">
          {/* loading && <Spinner /> */}
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
