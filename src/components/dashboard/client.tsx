'use client'

import { sub } from 'date-fns'

import SectionCards from '@/components/dashboard/widgets/section-cards'
import SummaryCards from '@/components/dashboard/widgets/summary-cards'
import ChartAreaInteractive from '@/components/dashboard/widgets/chart-area-interactive'
import ChartByStatus from '@/components/dashboard/widgets/chart-by-status'
import ChartDonut from '@/components/dashboard/widgets/chart-donut'
import ChartByProject from '@/components/dashboard/widgets/chart-by-project'
import ChartBarVertical from '@/components/dashboard/widgets/chart-bar-vertical'
import ChartBarHorizontal from '@/components/dashboard/widgets/chart-bar-horizontal'

import { evaluateDataQuality } from '@/components/dashboard/data-quality'
import { tileCalculations } from '@/components/dashboard/client/tile-calculations'
import { attachTileActions } from '@/components/dashboard/client/tile-actions'
import { isFastFilter } from '@/components/dashboard/client/fast-filter'
import type { ClientDashboardConfig, DashboardWidget, DashboardTile } from '@/components/dashboard/types'
import { useDataViewer, DataViewer } from '@/components/dashboard/client/data-viewer'
import type { Filter } from '@/components/dashboard/client/data-filters'

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
  return isFastFilter(filter) ? [filter] : [filter]
}

type Props = {
  config: ClientDashboardConfig
  metrics: any
  records: any[]
  from: string
  to: string
}

export default function DashboardClient({ config, metrics, records, from, to }: Props) {
const currentFrom = new Date(from)
const currentTo = new Date(to)
const duration = currentTo.getTime() - currentFrom.getTime()

const prevFrom = new Date(currentFrom.getTime() - duration).toISOString()
const prevTo = new Date(currentTo.getTime() - duration).toISOString()

const rangeFilteredRecords = records.filter(
  (r) => r.order_date && r.order_date >= from && r.order_date <= to
)

const previousRangeFilteredRecords = records.filter(
  (r) => r.order_date && r.order_date >= prevFrom && r.order_date <= prevTo
)


  const {
    filters,
    setFilters,
    drawerOpen,
    setDrawerOpen,
    filteredData,
    handleClickWidget,
    handleFilter,
  } = useDataViewer({ config, records })

  return (
    <>
      <DataViewer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        filteredData={filteredData}
        filters={filters}
        config={config}
      />

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

          if (w.clickable && w.key) {
            commonProps.onClick = () => handleClickWidget(w as DashboardTile)
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
