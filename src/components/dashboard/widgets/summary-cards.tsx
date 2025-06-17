// ✅ FINAL version of summary-cards.tsx — fully dynamic + fallback safe

'use client'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

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

export type SummaryTile = {
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
  clickFilter?: { type: string; value: string }
}

type Props = {
  config: SummaryTile[]
  records?: Record<string, any>[]
  onClickFilter?: (type: string, value: string) => void
}

function isDateString(val: any): boolean {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)
}

function evaluateFilter(row: Record<string, any>, filter?: SummaryTile['filter']): boolean {
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

const statusColors: Record<'ok' | 'warning' | 'danger', string> = {
  ok: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
}

export default function SummaryCards({ config, records, onClickFilter }: Props) {
  const totalTile = config.find((t) => t.key === 'totalAllTime')
  const totalValue = typeof totalTile?.value === 'number' ? totalTile.value : undefined

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {config.map((tile, i) => {
        let value = tile.value ?? 0
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

        const percent =
          totalValue && tile.key !== 'totalAllTime' && typeof value === 'number'
            ? parseFloat(((value / totalValue) * 100).toFixed(1))
            : null

        const handleClick = () => {
          if (tile.clickFilter && onClickFilter) {
            onClickFilter(tile.clickFilter.type, tile.clickFilter.value)
          }
        }

        return (
          <Card
            key={i}
            className="@container/card relative cursor-pointer"
            onClick={tile.clickFilter && onClickFilter ? handleClick : undefined}
          >
            <CardHeader>
              <CardDescription>{tile.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
              </CardTitle>
              {percent !== null && (
                <div className="text-sm font-medium">{percent}%</div>
              )}
              {tile.subtitle && (
                <CardDescription className="text-muted-foreground text-sm">
                  {tile.subtitle}
                </CardDescription>
              )}
            </CardHeader>
            {status && (
              <div className="absolute right-3 top-3">
                <span className={`inline-block h-3 w-3 rounded-full ${statusColors[status]}`} />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
