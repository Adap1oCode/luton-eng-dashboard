// ✅ FINAL version of section-cards.tsx — fully dynamic, safe, and now with full debug logging

'use client'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardAction,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'

export type TileFilter = {
  column: string
  eq?: string | number
  contains?: string
  not_contains?: string
  lt?: number | string
  gt?: number | string
  isNull?: boolean
}

export type Thresholds = {
  ok?: { lt?: number; gt?: number }
  warning?: { lt?: number; gt?: number }
  danger?: { lt?: number; gt?: number }
}

export type MetricTile = {
  key: string
  title: string
  subtitle?: string
  matchKey?: string
  value?: number | string | null
  filter?: TileFilter | { and: TileFilter[] } | { or: TileFilter[] }
  percentage?: {
    numerator: TileFilter | { and: TileFilter[] }
    denominator: TileFilter | { and: TileFilter[] }
  }
  average?: {
    start: string
    end: string
  }
  thresholds?: Thresholds
  trend?: string
  direction?: 'up' | 'down'
  clickFilter?: {
    type: string
    value: string
  }
}

type Props = {
  config: MetricTile[]
  records?: Record<string, any>[]
  onClickFilter?: (type: string, value: string) => void
}

function isDateString(val: any): boolean {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)
}

function evaluateFilter(row: Record<string, any>, filter?: MetricTile['filter']): boolean {
  if (!filter) return false

  const match = (f: TileFilter | { and: TileFilter[] } | { or: TileFilter[] }): boolean => {
    if ('and' in f) return f.and.every(match)
    if ('or' in f) return f.or.some(match)

    const field = row[f.column]
    const fieldIsDate = isDateString(field)

    if (f.eq !== undefined) return field === f.eq
    if (f.contains !== undefined) return typeof field === 'string' && field.toLowerCase().includes(f.contains.toLowerCase())
    if (f.not_contains !== undefined) return typeof field === 'string' && !field.toLowerCase().includes(f.not_contains.toLowerCase())
    if (f.lt !== undefined) {
      if (fieldIsDate && isDateString(f.lt)) return new Date(field) < new Date(f.lt)
      return field < f.lt
    }
    if (f.gt !== undefined) {
      if (fieldIsDate && isDateString(f.gt)) return new Date(field) > new Date(f.gt)
      return field > f.gt
    }
    if (f.isNull !== undefined) {
      return f.isNull
        ? field === null || field === undefined || field === ''
        : field !== null && field !== undefined && field !== ''
    }

    return false
  }

  return match(filter)
}

function getStatus(value: number, thresholds?: Thresholds): 'ok' | 'warning' | 'danger' | undefined {
  if (!thresholds) return undefined
  if (thresholds.ok && ((thresholds.ok.lt !== undefined && value < thresholds.ok.lt) || (thresholds.ok.gt !== undefined && value > thresholds.ok.gt))) return 'ok'
  if (thresholds.warning && ((thresholds.warning.lt !== undefined && value < thresholds.warning.lt) || (thresholds.warning.gt !== undefined && value > thresholds.warning.gt))) return 'warning'
  if (thresholds.danger && ((thresholds.danger.lt !== undefined && value < thresholds.danger.lt) || (thresholds.danger.gt !== undefined && value > thresholds.danger.gt))) return 'danger'
  return undefined
}

export default function SectionCards({ config, records, onClickFilter }: Props) {
  console.log('[DEBUG] SectionCards render start')
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {config.map((tile, i) => {
        console.log('[DEBUG] Rendering tile:', tile.key)
        let value: number | string | null = tile.value ?? 0
        let status: 'ok' | 'warning' | 'danger' | undefined

        if (records) {
          if (tile.percentage) {
            const num = records.filter((r) => evaluateFilter(r, tile.percentage!.numerator)).length
            const denom = records.filter((r) => evaluateFilter(r, tile.percentage!.denominator)).length || 1
            value = parseFloat(((num / denom) * 100).toFixed(1))
            status = getStatus(value, tile.thresholds)
          } else if (tile.average) {
            const valid = records.filter(
              (r) => isDateString(r[tile.average!.start]) && isDateString(r[tile.average!.end])
            )
            const deltas = valid.map((r) => {
              const diff = new Date(r[tile.average!.end]).getTime() - new Date(r[tile.average!.start]).getTime()
              return diff / (1000 * 60 * 60 * 24)
            })
            value = deltas.length ? parseFloat((deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1)) : 0
            status = getStatus(value, tile.thresholds)
          } else if (tile.filter) {
            const matches = records.filter((r) => evaluateFilter(r, tile.filter))
            value = matches.length
            status = getStatus(value, tile.thresholds)
          }
        }

        const handleClick = () => {
          console.log('[DEBUG] handleClick triggered for tile:', tile.key)
          if (tile.clickFilter && onClickFilter) {
            console.log('[CLICK] Tile clicked:', tile.key, tile.clickFilter)
            onClickFilter(tile.clickFilter.type, tile.clickFilter.value)
          } else {
            console.log('[SKIP] No clickFilter or onClickFilter for tile:', tile.key)
          }
        }

        return (
          <Card key={i} onClick={handleClick} className="@container/card cursor-pointer">
            <CardHeader>
              <CardDescription>{tile.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
              </CardTitle>
              {tile.trend && tile.direction && (
                <CardAction>
                  <Badge variant="outline">
                    {tile.direction === 'up' ? <TrendingUp className="mr-1 h-4 w-4" /> : <TrendingDown className="mr-1 h-4 w-4" />}
                    {tile.trend}
                  </Badge>
                </CardAction>
              )}
            </CardHeader>
            {tile.subtitle && (
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {tile.subtitle}
                  {tile.direction === 'up' ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                </div>
                <div className="text-muted-foreground">Last 3 months vs previous</div>
              </CardFooter>
            )}
          </Card>
        )
      })}
    </div>
  )
}
