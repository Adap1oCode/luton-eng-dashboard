// ✅ FINAL version of DashboardClient.tsx — dynamic, safe, regression-free

'use client'

import { useState } from 'react'

import SectionCards from '@/components/dashboard/widgets/section-cards'
import SummaryCards from '@/components/dashboard/widgets/summary-cards'
import ChartAreaInteractive from '@/components/dashboard/widgets/chart-area-interactive'
import ChartByStatus from '@/components/dashboard/widgets/chart-by-status'
import ChartByCreator from '@/components/dashboard/widgets/chart-by-creator'
import ChartByProject from '@/components/dashboard/widgets/chart-by-project'
import ChartMissingData from '@/components/dashboard/widgets/chart-missing-data'
import { DataTable } from '@/components/dashboard/widgets/data-table'
import { getIssues, type IssueType } from '@/components/dashboard/shared/get-issues'
import type { ClientDashboardConfig } from '@/components/dashboard/types'

const widgetMap: Record<string, any> = {
  SectionCards,
  SummaryCards,
  ChartAreaInteractive,
  ChartByStatus,
  ChartByCreator,
  ChartByProject,
  ChartMissingData,
}

type Props = {
  config: ClientDashboardConfig
  metrics: any
  records: any[]
}

function DashboardClient({ config, metrics, records }: Props) {
  const [filters, setFilters] = useState<{ type: string; value: string }[]>([])

  const handleFilter = (type: string) => (values: string[]) => {
    const updated = values.map((val) => ({ type, value: val }))
    setFilters(updated)
  }

  const filteredData =
    filters.length === 0
      ? records
      : records.filter((row) =>
          filters.every((f) => {
            if (f.type === 'issue') {
              return getIssues(row, config.dataQuality ?? []).includes(f.value as IssueType)
            }

            const field = config.filters[f.type] as string | undefined
            if (!field) return true

            return row[field] === f.value
          })
        )

  return (
    <div className="grid gap-4">
      {config.widgets.map((w, i) => {
        const Comp = widgetMap[w.component]
        if (!Comp) return null

        const props: any = {}

        if (w.component === 'SectionCards' || w.component === 'SummaryCards') {
          const group = w.group ?? 'tiles'

          const configTiles: any[] =
            group === 'summary'
              ? config.summary ?? []
              : group === 'trends'
              ? config.trends ?? []
              : config.tiles ?? []

          const metricTiles: any[] = metrics[group] ?? []

          props.config = configTiles.map((tile) => {
            const match = metricTiles.find(
              (m: any) => m.key === tile.matchKey || m.key === tile.key
            )

            const needsClientCalc = tile.filter || tile.percentage || tile.average

            return {
              ...tile,
              value: !needsClientCalc ? match?.value ?? tile.value ?? 0 : undefined,
              trend: match?.trend,
              direction: match?.direction,
              subtitle: tile.subtitle ?? match?.subtitle,
            }
          })

          props.records = records
        } else {
          if (w.filterType === 'issue') {
            props.data = records.map((row) => ({
              ...row,
              issue: getIssues(row, config.dataQuality ?? [])
            }))
          } else {
            props.data = records
          }

          if (w.filterType) props.onFilterChange = handleFilter(w.filterType)

          if (w.component === 'ChartMissingData') {
            props.rules = config.dataQuality ?? []
          }
        }

        return <Comp key={i} {...props} />
      })}

      <DataTable
        data={filteredData}
        columns={config.tableColumns}
        rowIdKey={config.rowIdKey}
      />
    </div>
  )
}

export default DashboardClient
