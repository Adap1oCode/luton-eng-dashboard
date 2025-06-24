'use client'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

import type { Filter } from '@/components/dashboard/client/data-filters'
import type { DashboardTile, Thresholds} from '@/components/dashboard/types'

const statusColors: Record<'ok' | 'warning' | 'danger', string> = {
  ok: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
}

type Props = {
  config: DashboardTile[]
  onClickFilter?: (filter: Filter) => void
}

function getStatus(value: number, thresholds?: Thresholds): 'ok' | 'warning' | 'danger' | undefined {
  if (!thresholds) return undefined
  if (thresholds.ok && ((thresholds.ok.lt !== undefined && value < thresholds.ok.lt) || (thresholds.ok.gt !== undefined && value > thresholds.ok.gt))) return 'ok'
  if (thresholds.warning && ((thresholds.warning.lt !== undefined && value < thresholds.warning.lt) || (thresholds.warning.gt !== undefined && value > thresholds.warning.gt))) return 'warning'
  if (thresholds.danger && ((thresholds.danger.lt !== undefined && value < thresholds.danger.lt) || (thresholds.danger.gt !== undefined && value > thresholds.danger.gt))) return 'danger'
  return undefined
}

export default function SummaryCards({ config, onClickFilter }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {config.map((tile, i) => {
        const value = tile.value ?? '—'
        const status = typeof value === 'number' ? getStatus(value, tile.thresholds) : undefined
        const hasClickHandler = !!tile.onClick || !!tile.onClickFilter

        const handleClick = () => {
          if (tile.onClick) {
            tile.onClick()
          } else if (tile.onClickFilter && tile.filter) {
            tile.onClickFilter(tile.filter)
          }
        }

        return (
          <Card
            key={i}
            role={hasClickHandler ? 'button' : undefined}
            onClick={hasClickHandler ? handleClick : undefined}
            className={`@container/card relative ${hasClickHandler ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
          >
            <CardHeader>
              <CardDescription>{tile.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </CardTitle>
              {tile.percent !== undefined && (
                <div className="text-sm font-medium">{tile.percent}%</div>
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