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
import { buildTiles } from '@/components/dashboard/client/build-tiles'
import { applyDataFilters } from '@/components/dashboard/client/data-filters'
import type { ClientDashboardConfig } from '@/components/dashboard/types'

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

type Props = {
  config: ClientDashboardConfig
  metrics: any
  records: any[]
  from: string
  to: string
}

export default function DashboardClient({ config, metrics, records, from, to }: Props) {
  const [filters, setFilters] = useState<{ type: string; value: string }[]>([])
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

  const handleFilter = (type: string) => (values: string[]) => {
    const updated = values.map((val) => ({ type, value: val }))
    setFilters(updated)
    setDrawerOpen(true)
  }

  const handleClickFilter = (type: string, value: string) => {
    if (!value || !config.filters[type]) return
    setFilters([{ type, value }])
    setDrawerOpen(true)
  }

  const filteredData =
    filters.length === 0 ? records : applyDataFilters(records, filters, config)

  useEffect(() => {
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
            className="w-full max-w-none sm:max-w-[92vw] lg:max-w-[1300px] xl:max-w-[1500px] 2xl:max-w-[1600px] overflow-auto"
          >
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4">Filtered Requisition Records</h2>
              <DataTable
                key={filteredData.length + filters.map((f) => `${f.type}:${f.value}`).join('|')}
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
                  key={filteredData.length + filters.map((f) => `${f.type}:${f.value}`).join('|')}
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
            onClickFilter: handleClickFilter,
          }

          if (w.filterType) {
            commonProps.onFilterChange = handleFilter(w.filterType)
          }

          if (w.component === 'SummaryCards' || w.component === 'SectionCards') {
            commonProps.config = buildTiles(
              configTiles,
              metricTiles,
              rangeFilteredRecords,
              previousRangeFilteredRecords,
              records
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