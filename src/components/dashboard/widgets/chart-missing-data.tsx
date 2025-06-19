'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card'

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

import type { Requisition } from '@/app/(main)/dashboard/requisitions/_components/data'


const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

type Props = {
  data: Requisition[]
  onFilterChange?: (values: string[]) => void
  rules?: {
    key: string
    label: string
    column: string
    type: string
    value?: any
    pattern?: string
  }[]
}

export default function ChartMissingData({ data, onFilterChange, rules = [] }: Props) {
  const [range, setRange] = useState<'90d' | '180d' | 'all'>('90d')

  const now = new Date()
  const cutoff = new Date(now)
  if (range === '90d') cutoff.setDate(now.getDate() - 90)
  else if (range === '180d') cutoff.setDate(now.getDate() - 180)
  else cutoff.setFullYear(now.getFullYear() - 1)

  const counts: Record<string, number> = {}

  for (const row of data) {
    const createdDate = row.order_date ? new Date(row.order_date) : null
    if (createdDate && (createdDate < cutoff || createdDate > now)) continue

    for (const rule of rules) {
      const { key, column, type, value, pattern } = rule
const field = (row as Record<string, any>)[column]

      let match = false
      switch (type) {
        case 'is_null':
          match = field === null || field === undefined || field === ''
          break
        case 'regex':
          match = typeof field === 'string' && typeof pattern === 'string' && !new RegExp(pattern).test(field)
          break
        case 'equals':
          match = field !== value
          break
        case 'gt':
          match = field <= value
          break
        case 'lt':
          match = field >= value
          break
      }

      if (match) {
        counts[key] = (counts[key] ?? 0) + 1
      }
    }
  }

  const chartData = rules
    .filter((r) => counts[r.key] > 0)
    .map((r) => ({
      issue: r.key,
      label: r.label,
      count: counts[r.key],
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Data Quality Issues</CardTitle>
        <CardDescription>Click any bar to filter the data below</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(val) => val && setRange(val as '90d' | '180d' | 'all')}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex">
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="180d">Last 6 months</ToggleGroupItem>
            <ToggleGroupItem value="all">Last 12 months</ToggleGroupItem>
          </ToggleGroup>

          <Select value={range} onValueChange={(val) => val && setRange(val as '90d' | '180d' | 'all')}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm">
              <SelectValue placeholder="Select a range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="180d">Last 6 months</SelectItem>
              <SelectItem value="all">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 30, right: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: 'var(--foreground)', fontWeight: 500 }}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={220}
              tick={{ fontSize: 12, fill: 'var(--foreground)', fontWeight: 500 }}
            />
            <Tooltip
              wrapperClassName="text-xs"
              content={({ payload }) =>
                payload?.length ? (
                  <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-sm">
                    <div className="font-medium text-foreground">
                      {payload[0].payload.label}
                    </div>
                    <div className="text-muted-foreground">
                      Count: {payload[0].value}
                    </div>
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="count"
              onClick={({ issue }: { issue: string }) =>
                onFilterChange?.([issue])
              }
              cursor="pointer"
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
