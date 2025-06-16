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

interface TileProps {
  title: string
  value: number
  trend: string
  direction: 'up' | 'down'
  subtitle: string
}

interface Props {
  data: any[]
}

export default function TileRow({ data }: Props) {
  const total = data?.length || 0
  const closed = data?.filter(r => r.status === 'Closed - Pick Complete')?.length || 0
  const missingOrder = data?.filter(r => !r.order_date)?.length || 0
  const missingDue = data?.filter(r => !r.due_date)?.length || 0

  const tiles: TileProps[] = [
    {
      title: 'Total Reqs',
      value: total,
      trend: '+8.2%',
      direction: 'up',
      subtitle: 'Up this quarter',
    },
    {
      title: 'Closed - Pick Complete',
      value: closed,
      trend: '-1.3%',
      direction: 'down',
      subtitle: 'Slight dip from Q1',
    },
    {
      title: 'Missing Order Date',
      value: missingOrder,
      trend: '+3.4%',
      direction: 'up',
      subtitle: 'Should be reviewed',
    },
    {
      title: 'Missing Due Date',
      value: missingDue,
      trend: '+2.6%',
      direction: 'up',
      subtitle: 'Needs clean up',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map(tile => (
        <Tile key={tile.title} {...tile} />
      ))}
    </div>
  )
}

function Tile({
  title,
  value,
  trend,
  direction,
  subtitle,
}: TileProps) {
  const TrendIcon = direction === 'up' ? TrendingUp : TrendingDown

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value.toLocaleString()}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <TrendIcon className="mr-1 h-4 w-4" />
            {trend}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {subtitle}
          <TrendIcon className="size-4" />
        </div>
        <div className="text-muted-foreground">Last 3 months vs previous</div>
      </CardFooter>
    </Card>
  )
}
