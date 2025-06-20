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
        if (!w || !w.component || !(w.component in widgetMap)) {
          console.warn('[DashboardClient] ❌ Invalid or unrecognized widget component:', w)
          return null
        }

        const Comp = widgetMap[w.component]

        return (
          <Comp
            key={i}
            widget={w}
            records={records}
            from={from}
            to={to}
            filters={filters}
            onFilterChange={handleFilter}
            onClickFilter={handleClickFilter}
            metrics={metrics}
            config={config}
          />
        )
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
