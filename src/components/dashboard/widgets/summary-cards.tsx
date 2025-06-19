'use client'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

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
  thresholds?: Thresholds
  clickFilter?: { type: string; value: string }
}

type Props = {
  config: SummaryTile[]
  onClickFilter?: (type: string, value: string) => void
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

export default function SummaryCards({ config, onClickFilter }: Props) {
  const totalTile = config.find((t) => t.key === 'totalAllTime')
  const totalValue = typeof totalTile?.value === 'number' ? totalTile.value : undefined

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {config.map((tile, i) => {
        const value = tile.value ?? '—'
        const status = typeof value === 'number' ? getStatus(value, tile.thresholds) : undefined

        const percent =
          totalValue && typeof value === 'number'
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
                {typeof value === 'number' ? value.toLocaleString() : value}
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
