'use client'

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
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
} from '@/components/ui/card'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

import { useIsMobile } from '@/hooks/use-mobile'
import type { DashboardWidget } from '@/components/dashboard/types'

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

export default function ChartBar({
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

  const values = rules.length
    ? rules
        .map((rule) => {
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
        .sort((a, b) => b.count - a.count)
    : []

  if (debug) {
    console.group('[ChartBar DEBUG]')
    console.log('📦 config:', config)
    console.log('📊 data.length:', data.length)
    console.log('🧮 rules:', rules)
    console.log('✅ values:', values)
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
  values.map((d, i) => [
    d.label,
    {
      label: d.label,
      color: `var(--color-${d.label.replace(/\s+/g, '-')})`,
    },
  ])
)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={values}
              layout="vertical"
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
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
                barSize={32}
                onClick={(entry) => onFilterChange?.([entry.key])}
                cursor="pointer"
              >
                {values.map((_, i) => (
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
