import { isDateString, compileFilter } from './data-filters'

export function tileCalculations(
  configTiles: any[],
  metricTiles: any[],
  rangeFilteredRecords: any[],
  previousRangeFilteredRecords: any[],
  allRecords: any[]
): any[] {
  return configTiles.map((tile) => {
    const match = metricTiles.find((m: any) => m.key === tile.matchKey || m.key === tile.key)

    const useFiltered = !tile.noRangeFilter
    const currentRecords = useFiltered ? rangeFilteredRecords : allRecords
    const previousRecords = useFiltered ? previousRangeFilteredRecords : allRecords

    let value: number | string | null = tile.value ?? 0
    let previous = 0
    let trend: string | undefined
    let direction: 'up' | 'down' | undefined

    if (tile.filter) {
      const filterFn = compileFilter(tile.filter)
      const matches = currentRecords.filter(filterFn)
      const prevMatches = previousRecords.filter(filterFn)
      value = matches.length
      previous = prevMatches.length

      if (previous > 0) {
        const delta = ((Number(value) - previous) / previous) * 100
        trend = `${Math.abs(delta).toFixed(1)}%`
        direction = delta >= 0 ? 'up' : 'down'
      } else if (value > 0) {
        trend = `+${value}`
        direction = 'up'
      } else {
        trend = undefined
        direction = undefined
      }
    } else if (tile.percentage) {
      const numFn = compileFilter(tile.percentage.numerator)
      const denomFn = compileFilter(tile.percentage.denominator)
      const num = currentRecords.filter(numFn).length
      const denom = currentRecords.filter(denomFn).length || 1
      value = parseFloat(((num / denom) * 100).toFixed(1))
      trend = undefined
      direction = undefined
    } else if (tile.average) {
      const valid = currentRecords.filter(
        (r) => isDateString(r[tile.average.start]) && isDateString(r[tile.average.end])
      )
      const deltas = valid
        .map((r) => {
          const start = new Date(r[tile.average.start])
          const end = new Date(r[tile.average.end])
          const diff = end.getTime() - start.getTime()
          return diff / (1000 * 60 * 60 * 24)
        })
        .filter((d) => !isNaN(d))

      value = deltas.length
        ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
        : 0
      trend = undefined
      direction = undefined
    }

    const clickFilter = tile.clickFilter || (
      tile.filter && tile.matchKey ? { column: tile.matchKey, contains: tile.key } : undefined
    )

    let percent: number | undefined
    if (tile.key !== 'totalAllTime' && typeof value === 'number') {
      const total = metricTiles.find((m: any) => m.key === 'totalAllTime')?.value
      if (typeof total === 'number' && total > 0) {
        percent = parseFloat(((value / total) * 100).toFixed(1))
      }
    }

    return {
      ...tile,
      value,
      trend,
      direction,
      subtitle: tile.subtitle ?? match?.subtitle,
      clickFilter,
      clickable: tile.clickable ?? Boolean(clickFilter),
      percent,
    }
  })
}
