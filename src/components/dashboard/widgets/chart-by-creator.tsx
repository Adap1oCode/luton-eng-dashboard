'use client'

import { useState } from 'react'
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

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

type Props = {
  data: any[]
  accessor?: string
  onFilterChange?: (values: string[]) => void
}

export default function ChartByCreator({
  data,
  accessor = 'created_by',
  onFilterChange,
}: Props) {
  const [range, setRange] = useState<'90d' | '180d' | 'all'>('90d')

  const now = new Date()
  const cutoff = new Date(now)
  if (range === '90d') cutoff.setDate(now.getDate() - 90)
  else if (range === '180d') cutoff.setDate(now.getDate() - 180)
  else cutoff.setFullYear(now.getFullYear() - 1)

  const counts: Record<string, number> = {}
  for (const row of data) {
    if (!row[accessor] || !row.order_date) continue
    const orderDate = new Date(row.order_date)
    if (orderDate >= cutoff && orderDate <= now) {
      const key = row[accessor]
      counts[key] = (counts[key] || 0) + 1
    }
  }

  const chartData = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Records by {accessor.replace('_', ' ')}</CardTitle>
        <CardDescription>Based on creation date</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(val) => val && setRange(val as '90d' | '180d' | 'all')}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="180d">Last 6 months</ToggleGroupItem>
            <ToggleGroupItem value="all">Last 12 months</ToggleGroupItem>
          </ToggleGroup>

          <Select value={range} onValueChange={(val) => val && setRange(val as '90d' | '180d' | 'all')}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm" aria-label="Select a range">
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
              <SelectItem value="180d" className="rounded-lg">Last 6 months</SelectItem>
              <SelectItem value="all" className="rounded-lg">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ResponsiveContainer width="100%" height={260}>
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
              onClick={(entry: { name: string }) => onFilterChange?.([entry.name])}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              wrapperClassName="text-xs"
              content={({ payload }) =>
                payload && payload.length ? (
                  <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-sm">
                    <div className="font-medium text-foreground">
                      {payload[0].name}
                    </div>
                    <div className="text-muted-foreground">
                      Count: {payload[0].value}
                    </div>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
