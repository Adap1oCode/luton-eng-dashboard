'use client'

import { useState } from 'react'
import { DataTable } from '@/components/dashboard/widgets/data-table'
import SectionCards from '@/components/dashboard/widgets/section-cards'
import SummaryCards from '@/components/dashboard/widgets/summary-cards'
import ChartAreaInteractive from '@/components/dashboard/widgets/chart-area-interactive'
import ChartByStatus from '@/components/dashboard/widgets/chart-by-status'
import ChartByCreator from '@/components/dashboard/widgets/chart-by-creator'
import ChartByProject from '@/components/dashboard/widgets/chart-by-project'
import ChartBar from '@/components/dashboard/widgets/chart-bar'
import { evaluateDataQuality } from '@/components/dashboard/data-quality'
import { buildTiles } from '@/components/dashboard/client/build-tiles'
import { applyDataFilters } from '@/components/dashboard/client/data-filters'
import type { ClientDashboardConfig } from '@/components/dashboard/types'

const widgetMap: Record<string, any> = {
  SectionCards,
  SummaryCards,
  ChartAreaInteractive,
  ChartByStatus,
  ChartByCreator,
  ChartByProject,
  ChartBar,
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
  }

  const handleClickFilter = (type: string, value: string) => {
    if (!value || !config.filters[type]) return
    setFilters([{ type, value }])
  }

  const filteredData =
    filters.length === 0 ? records : applyDataFilters(records, filters, config)

  return (
    <div className="grid gap-4">
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
          from,
          to,
          onClickFilter: handleClickFilter,
        }

        if (
          w.component === 'SummaryCards' ||
          w.component === 'SectionCards'
        ) {
          commonProps.config = buildTiles(
            configTiles,
            metricTiles,
            rangeFilteredRecords,
            previousRangeFilteredRecords,
            records
          )
        }

        if (w.component === 'ChartAreaInteractive') {
          commonProps.data = records
          commonProps.config = w
        }

        if (
          w.component === 'ChartBar' ||
          w.component === 'ChartByStatus' ||
          w.component === 'ChartByCreator' ||
          w.component === 'ChartByProject'
        ) {
          const evaluated = records.map((row) => ({
            ...row,
            issue: evaluateDataQuality(row, config.dataQuality ?? []),
          }))

          commonProps.records = records
          commonProps.data = evaluated

          if (w.component === 'ChartBar') {
            commonProps.rules = config.dataQuality ?? []
            commonProps.title = 'Data Quality Issues'
commonProps.config = {
  ...w,
  key: 'issue',
  column: 'issue',
}
          }
        }

        if (w.filterType) {
          commonProps.onFilterChange = handleFilter(w.filterType)
        }

        return <Comp key={i} {...commonProps} />
      })}

      <DataTable
        key={filteredData.length + filters.map((f) => `${f.type}:${f.value}`).join('|')}
        data={filteredData}
        columns={config.tableColumns}
        rowIdKey={config.rowIdKey}
      />
    </div>
  )
}
