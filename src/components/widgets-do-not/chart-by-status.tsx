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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Requisition = {
  order_date: string | null
  status: string
}

function isInRange(dateStr: string | null, range: '90d' | '180d' | 'all') {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  const cutoff = new Date(today)
  if (range === '90d') cutoff.setDate(today.getDate() - 90)
  else if (range === '180d') cutoff.setDate(today.getDate() - 180)
  else cutoff.setFullYear(today.getFullYear() - 1)
  return date >= cutoff && date <= today
}

export default function ChartByStatus({ data }: { data: Requisition[] }) {
  const [range, setRange] = useState<'90d' | '180d' | 'all'>('90d')

  const counts: Record<string, number> = {}
  for (const row of data) {
    if (!row.status || !isInRange(row.order_date, range)) continue
    counts[row.status] = (counts[row.status] || 0) + 1
  }

  const chartData = Object.entries(counts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="text-base">Requisitions by Status</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Based on creation date</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(val) => val && setRange(val as '90d' | '180d' | 'all')}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3M</ToggleGroupItem>
            <ToggleGroupItem value="180d">6M</ToggleGroupItem>
            <ToggleGroupItem value="all">12M</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 30, right: 10 }}>
            <defs>
              <linearGradient id="statusGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="status" type="category" tickLine={false} width={180} />
            <Tooltip />
            <Bar dataKey="count" fill="url(#statusGradient)">
              {chartData.map((_, index) => (
                <Cell key={index} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
