'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/dashboard/widgets/data-table'
import SectionCards from '@/components/dashboard/widgets/section-cards'
import SummaryCards from '@/components/dashboard/widgets/summary-cards'
import ChartAreaInteractive from '@/components/dashboard/widgets/chart-area-interactive'
import ChartByStatus from '@/components/dashboard/widgets/chart-by-status'
import ChartDonut from '@/components/dashboard/widgets/chart-donut'
import ChartByProject from '@/components/dashboard/widgets/chart-by-project'
import ChartBarVertical from '@/components/dashboard/widgets/chart-bar-vertical'
import ChartBarHorizontal from '@/components/dashboard/widgets/chart-bar-horizontal'

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

import { evaluateDataQuality } from '@/components/dashboard/data-quality'
import { tileCalculations } from '@/components/dashboard/client/tile-calculations'
import { attachTileActions } from '@/components/dashboard/client/tile-actions'
import { applyDataFilters, Filter } from '@/components/dashboard/client/data-filters'
import type { ClientDashboardConfig, DashboardWidget, DashboardTile } from '@/components/dashboard/types'
import { isFastFilter } from '@/components/dashboard/client/fast-filter'


const widgetMap: Record<string, any> = {
  SectionCards,
  SummaryCards,
  ChartAreaInteractive,
  ChartByStatus,
  ChartDonut,
  ChartByProject,
  ChartBarVertical,
  ChartBarHorizontal,
}

function buildFilterFromWidget(widget: DashboardWidget | DashboardTile): Filter[] {
  const filter = (widget as any).filter
  if (!filter) return []

  return isFastFilter(filter) ? [filter] : [filter] // still returns even if not fast, but consistent
}

type Props = {
  config: ClientDashboardConfig
  metrics: any
  records: any[]
  from: string
  to: string
}

export default function DashboardClient({ config, metrics, records, from, to }: Props) {
  const [filters, setFilters] = useState<Filter[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const rangeFilteredRecords = records.filter(
    (r) => r.order_date && r.order_date >= from && r.order_date <= to
  )

  const previousRangeFilteredRecords = records.filter((r) => {
    if (!r.order_date || !from || !to) return false
    const currentFrom = new Date(from)
    const currentTo = new Date(to)
    const diff = currentTo.getTime() - currentFrom.getTime()
    const prevFrom = new Date(currentFrom.getTime() - diff)
    const prevTo = new Date(currentFrom.getTime() - 1)
    const orderDate = new Date(r.order_date)
    return orderDate >= prevFrom && orderDate <= prevTo
  })

  const handleClickWidget = (widget: DashboardWidget | DashboardTile) => {
    const builtFilters = buildFilterFromWidget(widget)
    console.log('[handleClickWidget]', {
      key: widget.key,
      rawFilter: (widget as any).filter,
      builtFilters
    })

    if (builtFilters.length > 0) {
      setFilters(builtFilters)
      setDrawerOpen(true)
    }
  }

  const handleFilter = (type: string) => (values: string[]) => {
    const updated = values.map((val) => ({ column: type, contains: val }))
    console.log('[handleFilter] updated filters:', updated)
    setFilters(updated)
    setDrawerOpen(true)
  }

  const filteredData =
    filters.length === 0 ? records : applyDataFilters(records, filters, config)

  useEffect(() => {
    console.log('[Drawer State]', {
      filters,
      drawerOpen: filters.length > 0
    })

    if (filters.length === 0) setDrawerOpen(false)
  }, [filters])

  return (
    <>
      <div className="flex justify-end mb-4">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">View Full Table</Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            aria-labelledby="drawer-title"
            className="w-full max-w-none sm:max-w-[92vw] lg:max-w-[1300px] xl:max-w-[1500px] 2xl:max-w-[1600px] overflow-auto">
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

        <div className="hidden" aria-hidden>
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent
              side="right"
              className="w-full max-w-none sm:max-w-[92vw] lg:max-w-[1300px] xl:max-w-[1500px] 2xl:max-w-[1600px] overflow-auto"
            >
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-4">Filtered Requisition Records</h2>
                <DataTable
                  key={filteredData.length + filters.map((f) => JSON.stringify(f)).join('|')}
                  data={filteredData}
                  columns={config.tableColumns}
                  rowIdKey={config.rowIdKey}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {config.widgets.map((w, i) => {
          const Comp = widgetMap[w.component]
          if (!Comp) return null

          const group = w.group ?? 'tiles'
          const configTiles =
            group === 'summary'
              ? config.summary ?? []
              : group === 'trends'
              ? config.trends ?? []
              : config.tiles ?? []

          const metricTiles = metrics[group] ?? []

          const commonProps: any = {
            config: w,
            from,
            to,
          }

          if (w.clickable) {
            commonProps.onClick = () => handleClickWidget(w)
          }

          if (w.filterType) {
            commonProps.onFilterChange = handleFilter(w.filterType)
          }

          if (w.component === 'SummaryCards' || w.component === 'SectionCards') {
            const calculatedTiles = tileCalculations(
              configTiles,
              metricTiles,
              rangeFilteredRecords,
              previousRangeFilteredRecords,
              records
            )

            commonProps.config = attachTileActions(
              calculatedTiles,
              w,
              (tile) => handleClickWidget(tile),
              (filter) => {
                setFilters([filter])
                setDrawerOpen(true)
              }
            )
          }

          const isChart = w.component !== 'SummaryCards' && w.component !== 'SectionCards'

          if (isChart) {
            const chartRecords = w.rulesKey
              ? records.map((row) => ({
                  ...row,
                  issue: evaluateDataQuality(row, config.dataQuality ?? []),
                }))
              : records

            commonProps.data = chartRecords

            if (w.rulesKey && config.dataQuality) {
              commonProps.rules = config.dataQuality
            }
          }

          const spanClass =
            Number(w.span) === 2
              ? 'col-span-12 lg:col-span-6'
              : Number(w.span) === 3
              ? 'col-span-12 lg:col-span-4'
              : 'col-span-12'

          return (
            <div key={i} className={`${spanClass} flex flex-col`}>
              <div className="flex-1 flex flex-col min-h-[280px]">
                <Comp {...commonProps} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
