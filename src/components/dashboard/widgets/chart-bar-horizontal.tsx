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
  column: string
  type: string
  value?: any
  pattern?: string
}

type Props = {
  config: DashboardWidget & {
    column?: string
    debug?: boolean
  }
  data: Record<string, any>[]
  rules?: Rule[]
  onFilterChange?: (values: string[]) => void
}

export default function ChartBarHorizontal({
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
      const count = data.reduce((acc, row) => {
        const val = row[rule.column]
        switch (rule.type) {
          case 'is_null':
            return acc + (val === null || val === undefined || val === '' ? 1 : 0)
          case 'regex':
            return acc + (!new RegExp(rule.pattern || '').test(val) ? 1 : 0)
          case 'equals':
            return acc + (val !== rule.value ? 1 : 0)
          case 'gt':
            return acc + (val <= rule.value ? 1 : 0)
          case 'lt':
            return acc + (val >= rule.value ? 1 : 0)
          default:
            return acc
        }
      }, 0)
      return { key: rule.key, label: rule.label, count }
    })
  } else {
    chartData = generateColumnCounts(data, column)
  }

  if (debug) {
    console.group('[ChartBarHorizontal DEBUG]')
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

      <CardContent className="p-6 pt-0">
        <ChartContainer
          className="min-h-[260px] h-auto w-full"
          config={Object.fromEntries(
            chartData.map((d) => [d.label, { label: d.label }])
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 24, left: 24, bottom: 90 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontWeight: 400 }}
                interval={0}
                angle={-40}
                textAnchor="end"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontWeight: 400 }}
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
                onClick={(entry) => onFilterChange?.([entry.key])}
                cursor="pointer"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
