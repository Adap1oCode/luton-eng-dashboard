import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  title: string
  value: string
  subtitle: string
  trend: string
  trendDirection: 'up' | 'down'
}

export function TileCard({ title, value, subtitle, trend, trendDirection }: Props) {
  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
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
