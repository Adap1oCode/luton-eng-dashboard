'use client'

import * as React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert'
import { Terminal } from 'lucide-react'
import type { DashboardWidget } from '@/components/dashboard/types'

interface Props {
  widget: DashboardWidget
  data?: any[]
  from?: string
  to?: string
  rules?: any[]
    rawRecords?: { key: string; label: string; value: number }[] // ✅ Add this line
  children: React.ReactNode
}

// 🧠 Known requirements per chart component
const CHART_REQUIREMENTS: Record<string, (keyof DashboardWidget)[]> = {
  ChartBar: ['filterType', 'rulesKey'],
  ChartAreaInteractive: ['toggles'],
  ChartByStatus: ['filterType'],
  ChartByCreator: ['filterType'],
  ChartByProject: ['filterType'],
}

export function ChartDiagnostics({
  widget,
  data,
  from,
  to,
  rules = [],
  children,
}: Props) {
  const {
    component,
    title,
    description,
    debug = false,
  } = widget

  const errors: string[] = []

  // ⏳ Base runtime checks
  if (!from || !to) errors.push('Missing `from` or `to` date range.')
  if (!Array.isArray(data)) errors.push('Data is not an array.')
  else if (data.length === 0) errors.push('Data array is empty.')

  // 📋 Required widget config checks
  const requiredKeys = CHART_REQUIREMENTS[component] || []
  for (const key of requiredKeys) {
    if (widget[key] === undefined) {
      errors.push(`Missing required config: \`${key}\` for ${component}.`)
    }
  }

  // 🧪 Chart-specific logic
  if (component === 'ChartBar') {
    const hasRules = Array.isArray(rules) && rules.length > 0
    if (!hasRules) errors.push('No rules passed for ChartBar — check `rulesKey` or dataQuality config.')
  }

  if (debug) {
    console.warn(`[ChartDiagnostics] Debug: ${component}`, {
      from, to, data, widget, rules,
    })
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        {errors.length > 0 ? (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Chart not rendered</AlertTitle>
            <AlertDescription>
              <ul className="space-y-1">
                {errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
