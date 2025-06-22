'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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

import type { DashboardWidget } from '@/components/dashboard/types'

type Props = {
  config: DashboardWidget & {
    column?: string
    debug?: boolean
  }
  data: Record<string, any>[]
  from: string
  to: string
  onFilterChange?: (values: string[]) => void
}

export default function ChartDonut({
  config,
  data,
  from,
  to,
  onFilterChange,
}: Props) {
  if (!config) {
    console.warn('[ChartDonut] Missing config prop — chart will not render')
    return null
  }

  const {
    title,
    description,
    column,
    debug,
  } = config

  if (!column) {
    if (debug) console.warn('[ChartDonut] Missing config.column')
    return null
  }

  // ...rest of logic


  const fromDate = new Date(from)
  const toDate = new Date(to)

  const counts: Record<string, number> = {}
  for (const row of data) {
    if (!row.order_date) continue

    const orderDate = new Date(row.order_date)
    if (orderDate >= fromDate && orderDate <= toDate) {
      const key = row[column] ?? 'Unknown'
      counts[key] = (counts[key] ?? 0) + 1
    }
  }

  const chartData = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (debug) {
    console.group('[ChartDonut DEBUG]')
    console.log('📦 config:', config)
    console.log('📊 filtered data.length:', data.length)
    console.log('🧮 generated chartData:', chartData)
    console.groupEnd()
  }

  return (
    <Card className="@container/card rounded-2xl shadow-sm border bg-card text-card-foreground">
      <CardHeader className="p-6 pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <ChartContainer
          className="min-h-[260px] h-auto w-full"
          config={Object.fromEntries(chartData.map((d) => [d.name, { label: d.name }]))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={4}
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${Math.round(percent * 100)}%)`
                }
                onClick={(entry) => onFilterChange?.([entry.name])}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(label) => label}
                  />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
