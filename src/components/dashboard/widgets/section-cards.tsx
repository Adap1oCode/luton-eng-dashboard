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
  from?: string
  to?: string
  onClickFilter?: (type: string, value: string) => void
}

function formatContextLine(from?: string, to?: string): string {
  if (!from || !to) return 'vs previous period'
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  if (Math.abs(diffDays - 365) <= 2) return 'vs previous 12 months'
  if (Math.abs(diffDays - 180) <= 2) return 'vs previous 6 months'
  if (Math.abs(diffDays - 90) <= 2) return 'vs previous 3 months'
  return `vs previous ${diffDays} days`
}

function formatStatusLine(direction?: 'up' | 'down'): string {
  if (direction === 'up') return 'Trending up this period'
  if (direction === 'down') return 'Trending down this period'
  return 'No change this period'
}

export default function SectionCards({ config, from, to, onClickFilter }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs">
    {config.map((tile, i) => {
        const current = typeof tile.value === 'number' ? tile.value : 0
        const trend = tile.trend
        const direction = tile.direction

        const handleClick = () => {
          if (tile.clickFilter && onClickFilter) {
            onClickFilter(tile.clickFilter.type, tile.clickFilter.value)
          }
        }

        const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : null

        return (
          <Card key={i} onClick={handleClick} className="@container/card cursor-pointer">
            <CardHeader>
              <CardDescription>{tile.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {typeof current === 'number' ? current.toLocaleString() : current ?? '—'}
              </CardTitle>
              {trend && direction && (
                <CardAction>
                  <Badge variant="outline">
                    {Icon && <Icon className="mr-1 h-4 w-4" />}
                    {trend}
                  </Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {formatStatusLine(direction)}
                {Icon && <Icon className="size-4" />}
              </div>
              <div className="text-muted-foreground">
                {formatContextLine(from, to)}
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
