import { isDateString, evaluateFilter } from './data-filters'

export function buildTiles(
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
      const matches = currentRecords.filter((r) => evaluateFilter(r, tile.filter))
      const prevMatches = previousRecords.filter((r) => evaluateFilter(r, tile.filter))
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
      const num = currentRecords.filter((r) => evaluateFilter(r, tile.percentage!.numerator)).length
      const denom = currentRecords.filter((r) => evaluateFilter(r, tile.percentage!.denominator)).length || 1
      value = parseFloat(((num / denom) * 100).toFixed(1))
      trend = undefined
      direction = undefined
    } else if (tile.average) {
      const valid = currentRecords.filter(
        (r) => isDateString(r[tile.average!.start]) && isDateString(r[tile.average!.end])
      )
      const deltas = valid.map((r) => {
        const diff =
          new Date(r[tile.average!.end]).getTime() - new Date(r[tile.average!.start]).getTime()
        return diff / (1000 * 60 * 60 * 24)
      })
      value = deltas.length
        ? parseFloat((deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1))
        : 0
      trend = undefined
      direction = undefined
    }

    // Ensure clickable + filter propagate through
    const clickFilter = tile.clickFilter || (
      tile.filter && tile.matchKey ? { type: tile.matchKey, value: tile.key } : undefined
    )

    return {
      ...tile,
      value,
      trend,
      direction,
      subtitle: tile.subtitle ?? match?.subtitle,
      clickFilter,
      clickable: tile.clickable ?? Boolean(clickFilter),
    }
  })
}
