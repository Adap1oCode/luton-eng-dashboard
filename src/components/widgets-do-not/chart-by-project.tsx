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
} from 'recharts'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

type Requisition = {
  project_number: string | null
}

export default function ChartByProject({ data, className = '' }: { data: Requisition[], className?: string }) {
  const [range] = useState<'90d'>('90d') // You can add filter logic later

  const grouped: Record<string, number> = {}

  for (const row of data) {
    if (!row.project_number) continue
    grouped[row.project_number] = (grouped[row.project_number] || 0) + 1
  }

  const sorted = Object.entries(grouped)
    .map(([label, count]) => ({ label: label.slice(0, 50), count }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card className={`@container/card ${className}`}>
      <CardHeader>
        <CardTitle className="text-base">Requisitions by Project</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Based on project number
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sorted} margin={{ top: 4, right: 16, left: 16, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              angle={-40}
              textAnchor="end"
              height={70}
              interval={0}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="rgba(59,130,246,0.6)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
