"use client"

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import SectionCards from '@/components/dashboard/widgets/section-cards'
import SummaryCards from '@/components/dashboard/widgets/summary-cards'
import ChartAreaInteractive from '@/components/dashboard/widgets/chart-area-interactive'
import ChartByStatus from '@/components/dashboard/widgets/chart-by-status'
import ChartDonut from '@/components/dashboard/widgets/chart-donut'
import ChartByProject from '@/components/dashboard/widgets/chart-by-project'
import ChartBarVertical from '@/components/dashboard/widgets/chart-bar-vertical'
import ChartBarHorizontal from '@/components/dashboard/widgets/chart-bar-horizontal'
import ChartBarAggregate from '@/components/dashboard/widgets/chart-bar-aggregate'

import { tileCalculations } from '@/components/dashboard/client/tile-calculations'
import { attachTileActions } from '@/components/dashboard/client/tile-actions'
import { isFastFilter } from '@/components/dashboard/client/fast-filter'
import type { ClientDashboardConfig, DashboardWidget, DashboardTile } from '@/components/dashboard/types'
import { useDataViewer, DataViewer } from '@/components/dashboard/client/data-viewer'
import type { Filter } from '@/components/dashboard/client/data-filters'
import { normalizeFieldValue } from '@/components/dashboard/client/normalize'

const widgetMap: Record<string, any> = {
  SectionCards,
  SummaryCards,
  ChartAreaInteractive,
  ChartByStatus,
  ChartDonut,
  ChartByProject,
  ChartBarVertical,
  ChartBarHorizontal,
  ChartBarAggregate,
}

export default function DashboardClient({
  config,
  metrics,
  records,
  from,
  to,
}: {
  config: ClientDashboardConfig
  metrics: any
  records: any[]
  from?: string
  to?: string
}) {
  // global date-search toggle (default on)
  const dateSearchEnabled = config.dateSearchEnabled ?? true

  // normalize records
  const normalizedRecords = records.map((r) => ({
    ...r,
    vendor_name: normalizeFieldValue(r.vendor_name),
    project_number: normalizeFieldValue(r.project_number),
    created_by: normalizeFieldValue(r.created_by),
  }))

  // filtered vs. full datasets
  let rangeFilteredRecords = normalizedRecords
  let previousRangeFilteredRecords = normalizedRecords

  // compute date-based slices only when enabled and valid dates provided
  if (dateSearchEnabled && from && to) {
    const currentFrom = new Date(from)
    const currentTo = new Date(to)
    const duration = currentTo.getTime() - currentFrom.getTime()
    const prevFrom = new Date(currentFrom.getTime() - duration).toISOString()
    const prevTo = new Date(currentTo.getTime() - duration).toISOString()

    rangeFilteredRecords = normalizedRecords.filter(
      (r) => r.order_date && r.order_date >= from && r.order_date <= to
    )
    previousRangeFilteredRecords = normalizedRecords.filter(
      (r) => r.order_date && r.order_date >= prevFrom && r.order_date <= prevTo
    )
  }

  // data viewer handles drawer, filters, table view
  const {
    filters,
    setFilters,
    drawerOpen,
    setDrawerOpen,
    filteredData,
    handleClickWidget,
    handleFilter,
  } = useDataViewer({ config, records: normalizedRecords })

  // handle viewTable query param
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const shouldOpen = searchParams.get('viewTable') === 'true'

  useEffect(() => {
    if (shouldOpen) setDrawerOpen(true)
  }, [shouldOpen])

  const handleDrawerClose = (open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('viewTable')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }

  return (
    <>
      <DataViewer
        drawerOpen={drawerOpen}
        setDrawerOpen={handleDrawerClose}
        filteredData={filteredData}
        filters={filters}
        config={config}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        {config.widgets.map((w: DashboardWidget, i) => {
          const Comp = widgetMap[w.component]
          if (!Comp) return null

          // determine widget group and tiles
          const group = w.group ?? 'tiles'
          const configTiles =
            group === 'summary'
              ? config.summary ?? []
              : group === 'trends'
              ? config.trends ?? []
              : group === 'dataQuality'
              ? config.dataQuality ?? []
              : config.tiles ?? []
          const metricTiles = metrics[group] ?? []

          // apply global and per-widget date filtering
          const useFiltered = dateSearchEnabled && w.noRangeFilter !== true
          const dataset = useFiltered ? rangeFilteredRecords : normalizedRecords

          // ▶ NEW: decide whether to feed raw rows or pre-aggregated metrics
          const isMetricWidget = Boolean((w as any).valueField || (w as any).preCalculated)
          const inputData = isMetricWidget ? metrics ?? [] : dataset

          // common props for every widget
          const commonProps: any = {
            config: w,
            from,
            to,
            data: inputData,
          }

          // handle clickable tiles
          if (w.clickable && w.key) {
            commonProps.onClick = () => handleClickWidget(w as DashboardTile)
          }

          // handle filter-type widgets
          if (w.filterType) {
            commonProps.onFilterChange = handleFilter(w.filterType)
          }

          // clickable non-filter widgets open drawer
          if (typeof Comp === 'function' && w.clickable && !w.filterType) {
            commonProps.onFilterChange = (filters: Filter[]) => {
              const fullFilters = useFiltered
                ? [
                    { column: 'order_date', gte: from },
                    { column: 'order_date', lte: to },
                    ...filters,
                  ]
                : [...filters]

              setFilters(fullFilters)
              setDrawerOpen(true)
            }
          }

          // tile-based groups (summary, trends, dataQuality, tiles)
          const isTileGroup = ['summary', 'trends', 'dataQuality', 'tiles'].includes(
            group
          )

          if (isTileGroup) {
            const calculatedTiles = tileCalculations(
              configTiles,
              metricTiles,
              rangeFilteredRecords,
              previousRangeFilteredRecords,
              normalizedRecords
            )

            const interactiveTiles = attachTileActions(
              calculatedTiles,
              w,
              (tile) => handleClickWidget(tile),
              (filter) => {
                const wrapped = useFiltered
                  ? [
                      { column: 'order_date', gte: from },
                      { column: 'order_date', lte: to },
                      filter,
                    ]
                  : [filter]

                setFilters(wrapped)
                setDrawerOpen(true)
              }
            )

            if (['SummaryCards', 'SectionCards'].includes(w.component)) {
              commonProps.config = interactiveTiles
            } else {
              commonProps.tiles = interactiveTiles
            }
          }

          // summary/section cards expect no data prop
          if (['SummaryCards', 'SectionCards'].includes(w.component)) {
            delete commonProps.data
          }

          // grid span logic
          const spanClass =
            Number(w.span) === 2
              ? 'col-span-12 lg:col-span-6'
              : Number(w.span) === 3
              ? 'col-span-12 lg:col-span-4'
              : 'col-span-12'

          return (
            <div key={i} className={`${spanClass} flex flex-col`}>
              <div
                className={`flex-1 flex flex-col ${
                  !['SummaryCards', 'SectionCards'].includes(w.component)
                    ? 'min-h-[280px]'
                    : ''
                }`}
              >
                <Comp {...commonProps} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
