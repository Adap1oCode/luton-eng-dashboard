'use client'

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

import { useIsMobile } from '@/hooks/use-mobile'
import type { DashboardWidget } from '@/components/dashboard/types'
import { applyDataFilters, Filter } from '@/components/dashboard/client/data-filters' // ✅ NEW

/** ✅ Utility to generate fallback values from generic column count */
function generateColumnCounts(records: any[], column: string) {
  const counts: Record<string, number> = {}
  for (const row of records) {
    const val = row[column] ?? 'Unknown'
    counts[val] = (counts[val] ?? 0) + 1
  }
  return Object.entries(counts).map(([key, count]) => ({
    key,
    label: key,
    count,
  }))
}

type Rule = {
  key: string
  label: string
  filter: Filter
}

type Props = {
  config: DashboardWidget & {
    column?: string
    debug?: boolean
  }
  data: Record<string, any>[]
  rules?: Rule[]
  onFilterChange?: (keys: string[]) => void
}

export default function ChartBarVertical({
  config,
  data,
  rules = [],
  onFilterChange,
}: Props) {
  const isMobile = useIsMobile()
  const {
    title,
    description,
    column = 'key',
    debug,
  } = config

  let chartData: { key: string; label: string; count: number }[] = []

  if (rules.length > 0) {
    chartData = rules.map((rule) => {
      const count = applyDataFilters(data, rule.filter).length // ✅ use shared filter logic
      return { key: rule.key, label: rule.label, count }
    })
  } else {
    chartData = generateColumnCounts(data, column)
  }

  if (debug) {
    console.group('[ChartBarVertical DEBUG]')
    console.log('📦 config:', config)
    console.log('📊 data.length:', data.length)
    console.log('🧮 rules:', rules)
    console.log('✅ new values output:', chartData)
    console.groupEnd()
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="h-[260px] w-full"
          config={Object.fromEntries(
            chartData.map((d) => [d.label, { label: d.label }])
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
                horizontal={false}
              />

              <YAxis
                type="category"
                dataKey="label"
                width={180}
                tick={{
                  fontSize: 12,
                  fill: 'var(--foreground)',
                  fontWeight: 500,
                  dx: 4,
                }}
                axisLine={false}
                tickLine={false}
              />

              <XAxis
                type="number"
                domain={[0, 'dataMax']}
                tick={{
                  fontSize: 12,
                  fill: 'var(--muted-foreground)',
                }}
                axisLine={false}
                tickLine={false}
              />

              <ChartTooltip
                cursor={{ fill: 'var(--muted)' }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(label) => label}
                  />
                }
              />

              <Bar
                dataKey="count"
                radius={[5, 5, 5, 5]}
                onClick={(entry) => onFilterChange?.([entry.key])} // ✅ passed key from clicked bar
                cursor="pointer"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
