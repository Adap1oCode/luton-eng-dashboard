'use client'

import * as React from 'react'
import { AreaChart, Area, CartesianGrid, XAxis } from 'recharts'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-mobile'

type Requisition = {
  order_date: string | null
  due_date: string | null
}

function getWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(d.setUTCDate(diff))
  weekStart.setUTCHours(0, 0, 0, 0)
  return weekStart
}

function formatLabel(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

export default function ChartMonthly({ data }: { data: Requisition[] }) {
  if (!Array.isArray(data) || data.length === 0) return null

  const isMobile = useIsMobile()
  const [range, setRange] = React.useState<'90d' | '180d' | 'all'>('90d')

  const today = new Date()
  const start = new Date(today)
 if (range === '90d') {
  start.setDate(today.getDate() - 90)
} else if (range === '180d') {
  start.setDate(today.getDate() - 180)
} else if (range === 'all') {
  start.setFullYear(today.getFullYear() - 1)
}


  // Initialize buckets per week
  const weekMap: Map<string, { date: Date; created: number; due: number }> = new Map()
  const iter = new Date(getWeekStart(start))
  while (iter <= today) {
    const key = iter.toISOString().slice(0, 10)
    weekMap.set(key, {
      date: new Date(iter),
      created: 0,
      due: 0,
    })
    iter.setDate(iter.getDate() + 7)
  }

  // Count requisitions by created/due week
  for (const row of data) {
    if (row.order_date) {
      const createdWeek = getWeekStart(new Date(row.order_date))
      const key = createdWeek.toISOString().slice(0, 10)
      if (weekMap.has(key)) weekMap.get(key)!.created += 1
    }
    if (row.due_date) {
      const dueWeek = getWeekStart(new Date(row.due_date))
      const key = dueWeek.toISOString().slice(0, 10)
      if (weekMap.has(key)) weekMap.get(key)!.due += 1
    }
  }

  const chartData = Array.from(weekMap.values()).map((entry) => ({
    label: formatLabel(entry.date),
    created: entry.created,
    due: entry.due,
  }))

  const chartConfig = {
    created: { label: 'Created', color: 'var(--chart-1)' },
    due: { label: 'Due', color: 'var(--chart-2)' },
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Requisitions Per Week</CardTitle>
        <CardDescription>Created and Due per week</CardDescription>
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
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a range"
            >
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
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-created)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillDue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-due)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-due)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(val) => `Week of ${val}`}
                />
              }
            />
            <Area dataKey="created" type="monotone" fill="url(#fillCreated)" stroke="var(--color-created)" />
            <Area dataKey="due" type="monotone" fill="url(#fillDue)" stroke="var(--color-due)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
