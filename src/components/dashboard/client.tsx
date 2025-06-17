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

function isDateString(val: any): boolean {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)
}

function evaluateFilter(row: Record<string, any>, filter?: any): boolean {
  if (!filter) return false

  const match = (f: any): boolean => {
    if ('and' in f) return f.and.every(match)
    if ('or' in f) return f.or.some(match)

    const field = row[f.column]
    const fieldIsDate = isDateString(field)

    if (f.eq !== undefined) return field === f.eq
    if (f.contains !== undefined) return typeof field === 'string' && field.toLowerCase().includes(f.contains.toLowerCase())
    if (f.not_contains !== undefined) return typeof field === 'string' && !field.toLowerCase().includes(f.not_contains.toLowerCase())
    if (f.lt !== undefined) {
      if (fieldIsDate && isDateString(f.lt)) return new Date(field) < new Date(f.lt)
      return field < f.lt
    }
    if (f.gt !== undefined) {
      if (fieldIsDate && isDateString(f.gt)) return new Date(field) > new Date(f.gt)
      return field > f.gt
    }
    if (f.isNull !== undefined) {
      return f.isNull
        ? field === null || field === undefined || field === ''
        : field !== null && field !== undefined && field !== ''
    }

    return false
  }

  return match(filter)
}

function isInRange(date: string, from?: string, to?: string): boolean {
  if (!date || !from || !to) return false
  const d = new Date(date)
  return d >= new Date(from) && d <= new Date(to)
}

function DashboardClient({ config, metrics, records }: Props) {
  const [filters, setFilters] = useState<{ type: string; value: string }[]>([])

  const handleFilter = (type: string) => (values: string[]) => {
    const updated = values.map((val) => ({ type, value: val }))
    setFilters(updated)
  }

  const handleClickFilter = (type: string, value: string) => {
    console.log('[CLICK] Tile clicked:', { type, value })
    setFilters([{ type, value }])
  }

  const { from, to } = config

  const rangeFilteredRecords = records.filter((r) =>
    r.order_date && isInRange(r.order_date, from, to)
  )

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

            return typeof row[field] === 'string'
              ? row[field].toLowerCase().includes(f.value.toLowerCase())
              : row[field] === f.value
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

            let value: number | string | null = tile.value ?? 0

            const dataset = tile.noRangeFilter ? records : rangeFilteredRecords

            if (tile.percentage) {
              const num = dataset.filter((r) => evaluateFilter(r, tile.percentage!.numerator)).length
              const denom = dataset.filter((r) => evaluateFilter(r, tile.percentage!.denominator)).length || 1
              value = parseFloat(((num / denom) * 100).toFixed(1))
            } else if (tile.average) {
              const valid = dataset.filter(
                (r) =>
                  isDateString(r[tile.average!.start]) &&
                  isDateString(r[tile.average!.end])
              )
              const deltas = valid.map((r) => {
                const diff =
                  new Date(r[tile.average!.end]).getTime() - new Date(r[tile.average!.start]).getTime()
                return diff / (1000 * 60 * 60 * 24)
              })
              value = deltas.length
                ? parseFloat((deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1))
                : 0
            } else {
              const matches = tile.filter
                ? dataset.filter((r) => evaluateFilter(r, tile.filter))
                : dataset
              value = matches.length
            }

            return {
              ...tile,
              value,
              trend: match?.trend,
              direction: match?.direction,
              subtitle: tile.subtitle ?? match?.subtitle,
            }
          })

          props.records = records
          props.onClickFilter = handleClickFilter
        } else {
          if (w.filterType === 'issue') {
            props.data = records.map((row) => ({
              ...row,
              issue: getIssues(row, config.dataQuality ?? []),
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
        key={filteredData.length + filters.map((f) => `${f.type}:${f.value}`).join('|')}
        data={filteredData}
        columns={config.tableColumns}
        rowIdKey={config.rowIdKey}
      />
    </div>
  )
}

export default DashboardClient
