'use client'

import * as React from 'react'
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
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

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useIsMobile } from '@/hooks/use-mobile'
import { getTimeBuckets } from './chart-utils'

type DataItem = { [key: string]: any }

type Field = {
  key: string
  label: string
  type: string
  band?: string
  color: string
}

type Toggle = {
  key: string
  title: string
  description?: string
  fields: Field[]
}

type Props = {
  data: DataItem[]
  from?: string
  to?: string
  config?: {
    toggles?: Toggle[]
  }
}

const accessorMap: Record<string, (row: DataItem, band?: string) => string | null | undefined> = {
  created: (row) => row?.order_date ?? null,
  due: (row) => row?.due_date ?? null,
  lateness: (row, band) => {
    const status = row?.status?.toLowerCase()
    const dueStr = row?.due_date
    if (!dueStr || status?.includes('complete') || status?.includes('cancel')) return null

    const due = new Date(dueStr)
    const today = new Date()
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))

    if (band === '1-7' && diff > 0 && diff <= 7) return dueStr
    if (band === '8-30' && diff > 7 && diff <= 30) return dueStr
    if (band === '30+' && diff > 30) return dueStr
    return null
  },
}

// ✅ Keep original hardcoded toggle logic
const toggleWidgets: Toggle[] = [
  {
    key: 'created_vs_due',
    title: 'Created vs Due',
    fields: [
      { key: 'created', label: 'Created', type: 'created', color: 'var(--chart-1)' },
      { key: 'due', label: 'Due', type: 'due', color: 'var(--chart-2)' },
    ],
  },
  {
    key: 'lateness_breakdown',
    title: 'Lateness Breakdown',
    description: 'Tracks how overdue items are, grouped by when they were due',
    fields: [
      { key: 'late_1_7', label: '1–7 days late', type: 'lateness', band: '1-7', color: 'var(--chart-1)' },
      { key: 'late_8_30', label: '8–30 days late', type: 'lateness', band: '8-30', color: 'var(--chart-2)' },
      { key: 'late_30_plus', label: '30+ days late', type: 'lateness', band: '30+', color: 'var(--chart-3)' },
    ],
  },
]

export default function ChartAreaInteractive({ data, from, to, config }: Props) {
  const isMobile = useIsMobile()

  const configToggleWidgets = config?.toggles ?? []
  const [testActiveKey, setTestActiveKey] = React.useState<string>(configToggleWidgets[0]?.key ?? '')
  const testActiveToggle = configToggleWidgets.find((w) => w.key === testActiveKey)



  // ✅ Console debug for verification
  console.log('✅ props.config.toggles:', configToggleWidgets)

  // ✅ Render test output (non-breaking visual)
  const showDebug = configToggleWidgets.length > 0

  const [activeKey, setActiveKey] = React.useState<string>(toggleWidgets[0]?.key ?? '')
  const activeToggle = toggleWidgets.find((w) => w.key === activeKey)

if (!from || !to) return null
if (!Array.isArray(data) || data.length === 0) return null
if (!activeToggle) return null

  const fields = activeToggle.fields.map((f) => ({
    ...f,
    accessor: (row: DataItem) => accessorMap[f.type]?.(row, f.band),
  }))

  const chartData = getTimeBuckets(data, { from, to, fields })

  const summary = fields.map((f) => {
    const total = chartData.reduce((sum, row) => sum + (row[f.key] || 0), 0)
    return { key: f.key, label: f.label, color: f.color, total }
  })

  return (
    <>
      {showDebug && (
        <div className="border border-dashed p-4 mb-6 rounded-md bg-muted/30">
          <h2 className="font-semibold mb-2 text-sm text-muted-foreground">🧪 Testing config.toggles</h2>
          <pre className="text-xs bg-background p-2 rounded-md overflow-x-auto max-h-40">
            {JSON.stringify(configToggleWidgets, null, 2)}
          </pre>

          <Card className="mt-4 border-dashed bg-muted/40 text-muted-foreground">
  <CardHeader>
    <CardTitle className="text-base">🧪 Config-driven Chart Area (placeholder)</CardTitle>
  </CardHeader>
  <CardContent>
    <p>This chart will eventually be driven from <code>props.config.toggles</code>.</p>
    <p className="mt-1 text-xs">Toggle count: {configToggleWidgets.length}</p>

    {configToggleWidgets.length > 1 && (
      <div className="mt-4">
        <ToggleGroup
          type="single"
          value={testActiveKey}
          onValueChange={(val) => setTestActiveKey(val ?? configToggleWidgets[0]?.key ?? '')}
          variant="outline"
        >
          {configToggleWidgets.map((w) => (
            <ToggleGroupItem
              key={w.key}
              value={w.key}
              disabled={!w.key}
            >
              {w.title || w.key || 'Unnamed'}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    )}
{testActiveToggle?.fields && (
  <div className="mt-4">
    <p className="text-xs font-medium text-muted-foreground mb-1">Fields for selected toggle:</p>
    <pre className="text-xs bg-background p-2 rounded-md overflow-x-auto max-h-40">
      {JSON.stringify(testActiveToggle.fields, null, 2)}
    </pre>
  </div>
)}
  </CardContent>
</Card>

        </div>
      )}

      {/* 🔒 Real Chart — untouched, still works */}
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{activeToggle.title || 'Records Over Time'}</CardTitle>
              {activeToggle.description && (
                <CardDescription>{activeToggle.description}</CardDescription>
              )}
            </div>
            {toggleWidgets.length > 1 && (
              <ToggleGroup
                type="single"
                value={activeKey}
                onValueChange={(val) => setActiveKey(val ?? toggleWidgets[0]?.key ?? '')}
                variant="outline"
              >
                {toggleWidgets.map((w) => (
                  <ToggleGroupItem key={w.key} value={w.key} disabled={!w.key}>
                    {w.title || w.key || 'Unnamed'}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
          <div className="mb-2 flex justify-end gap-4 text-xs text-muted-foreground px-2">
            {summary.map((s) => (
              <div key={s.key} className="flex items-center gap-1">
                <span className="font-medium text-foreground">{s.total}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="mb-2 flex justify-end gap-4 text-sm text-muted-foreground px-2">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <div className="h-2 w-4 rounded-sm" style={{ backgroundColor: f.color }} />
                {f.label}
              </div>
            ))}
          </div>

          <ChartContainer
            config={Object.fromEntries(fields.map((f) => [f.key, { label: f.label, color: f.color }]))}
            className="aspect-auto h-[260px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                {fields.map((f) => (
                  <linearGradient key={f.key} id={`fill-${f.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={f.color} stopOpacity={1.0} />
                    <stop offset="95%" stopColor={f.color} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                defaultIndex={isMobile ? -1 : 10}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(val) => `Week of ${val}`}
                  />
                }
              />
              {fields.map((f) => (
                <Area
                  key={f.key}
                  dataKey={f.key}
                  type="monotone"
                  fill={`url(#fill-${f.key})`}
                  stroke={f.color}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  )
}
