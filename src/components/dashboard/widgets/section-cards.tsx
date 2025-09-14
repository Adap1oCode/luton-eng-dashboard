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

import type { DashboardTile } from '@/components/dashboard/types'
import type { Filter } from '@/components/dashboard/client/data-filters'


type DashboardTileWithClick = DashboardTile & {
  onClick?: () => void
  debug?: boolean
  previous?: number
}

type Props = {
  config: DashboardTileWithClick[]
  from?: string
  to?: string
}

function formatContextLine(from?: string, to?: string, previous?: number): string {
  if (!from || !to || typeof previous !== 'number') return 'vs previous period'
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))

  if (Math.abs(diffDays - 365) <= 2) return `vs ${previous.toLocaleString()} in previous 12 months`
  if (Math.abs(diffDays - 180) <= 2) return `vs ${previous.toLocaleString()} in previous 6 months`
  if (Math.abs(diffDays - 90) <= 2) return `vs ${previous.toLocaleString()} in previous 3 months`
  return `vs ${previous.toLocaleString()} in previous ${diffDays} days`
}

function formatStatusLine(direction?: 'up' | 'down'): string {
  if (direction === 'up') return 'Trending up this period'
  if (direction === 'down') return 'Trending down this period'
  return 'No change this period'
}

export default function SectionCards({ config, from, to }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs">
      {config.map((tile) => {
        const value = typeof tile.value === 'number' ? tile.value : tile.value ?? '—'
        const trend = tile.trend
        const direction = tile.direction
        const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : null
        const isInteractive = !!tile.onClick

        if (tile.debug) {
          console.log(`[SectionCard] ${tile.key}`, {
            value,
            trend,
            direction,
            previous: tile.previous,
            filter: tile.filter,
          })
        }

        return (
<Card
  key={tile.key}
  role={isInteractive ? 'button' : undefined}
  onClick={() => {
  tile.onClick?.()
  tile.onClickFilter?.(tile.filter as Filter)
}}

  className={`@container/card relative ${
    isInteractive ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''
  }`}
>

            <CardHeader>
              <CardDescription>{tile.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {typeof value === 'number' ? value.toLocaleString() : value}
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
                {formatContextLine(from, to, typeof tile.previous === 'number' ? tile.previous : undefined)}
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
