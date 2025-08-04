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
  from: string
  to: string
}) {
  const normalizedRecords = records.map((r) => ({
    ...r,
    vendor_name: normalizeFieldValue(r.vendor_name),
    project_number: normalizeFieldValue(r.project_number),
    created_by: normalizeFieldValue(r.created_by),
  }))

  const currentFrom = new Date(from)
  const currentTo = new Date(to)
  const duration = currentTo.getTime() - currentFrom.getTime()

  const prevFrom = new Date(currentFrom.getTime() - duration).toISOString()
  const prevTo = new Date(currentTo.getTime() - duration).toISOString()

  const rangeFilteredRecords = normalizedRecords.filter(
    (r) => r.order_date && r.order_date >= from && r.order_date <= to
  )

  const previousRangeFilteredRecords = normalizedRecords.filter(
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
  } = useDataViewer({ config, records: normalizedRecords })

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
        {config.widgets.map((w, i) => {
          const Comp = widgetMap[w.component]
          if (!Comp) return null

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

          const useFiltered = w.noRangeFilter !== true
          const dataset = useFiltered ? rangeFilteredRecords : normalizedRecords

          const commonProps: any = {
            config: w,
            from,
            to,
            data: dataset,
          }

          if (w.clickable && w.key) {
            commonProps.onClick = () => handleClickWidget(w as DashboardTile)
          }

          if (w.filterType) {
            commonProps.onFilterChange = handleFilter(w.filterType)
          }

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

          const isTileGroup = ['summary', 'trends', 'dataQuality', 'tiles'].includes(group)

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

          if (['SummaryCards', 'SectionCards'].includes(w.component)) {
            delete commonProps.data
          }

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
