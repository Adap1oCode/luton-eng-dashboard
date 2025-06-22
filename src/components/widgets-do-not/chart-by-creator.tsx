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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Requisition = {
  order_date: string | null
  created_by: string
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

const COLORS = ['#3b82f6', '#0ea5e9', '#6366f1', '#8b5cf6', '#f97316', '#10b981', '#ef4444']

export default function ChartDonut({ data }: { data: Requisition[] }) {
  const [range, setRange] = useState<'90d' | '180d' | 'all'>('90d')

  const counts: Record<string, number> = {}
  for (const row of data) {
    if (!row.created_by || !isInRange(row.order_date, range)) continue
    counts[row.created_by] = (counts[row.created_by] || 0) + 1
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const top5 = entries.slice(0, 5)
  const otherCount = entries.slice(5).reduce((sum, [, val]) => sum + val, 0)

  const chartData = top5.map(([name, value]) => ({ name, value }))
  if (otherCount > 0) chartData.push({ name: 'Other', value: otherCount })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="text-base">Requisitions by User</CardTitle>
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
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
