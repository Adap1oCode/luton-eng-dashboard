import { isDateString, compileFilter } from './data-filters'

function getActiveRecords(tile: any, rangeFiltered: any[], full: any[]): any[] {
  return tile.noRangeFilter ? full : rangeFiltered
}

export function tileCalculations(
  configTiles: any[],
  metricTiles: any[],
  rangeFilteredRecords: any[],
  previousRangeFilteredRecords: any[],
  allRecords: any[]
): any[] {
  return configTiles.map((tile) => {
    const match = metricTiles.find((m: any) => m.key === tile.matchKey || m.key === tile.key)

    const activeRecords = getActiveRecords(tile, rangeFilteredRecords, allRecords)
    const previousRecords = getActiveRecords(tile, previousRangeFilteredRecords, allRecords)

    let value: number | string | null = tile.value ?? 0
    let previous = 0
    let trend: string | undefined
    let direction: 'up' | 'down' | undefined
    let percent: number | undefined

    // Standard count-based value
    if (tile.filter && !tile.average && !tile.percentage) {
      const filterFn = compileFilter(tile.filter)
      const matches = activeRecords.filter(filterFn)
      const prevMatches = previousRecords.filter(filterFn)

      value = matches.length
      previous = prevMatches.length

      if (previous > 0) {
        const delta = ((Number(value) - previous) / previous) * 100
        trend = `${Math.abs(delta).toFixed(1)}%`
        direction = delta >= 0 ? 'up' : 'down'
        percent = parseFloat(delta.toFixed(1))
      } else if (value > 0) {
        trend = `+${value}`
        direction = 'up'
        percent = 100
      } else {
        trend = undefined
        direction = undefined
        percent = 0
      }

      console.log(`[TileCalc] [${tile.key}] Matches: ${matches.length}, Previous: ${prevMatches.length}`)
      console.log(`[TileCalc] [${tile.key}] Trend: ${trend} | Direction: ${direction}`)
    }

    // Percentage-based
    else if (tile.percentage) {
      const numFn = compileFilter(tile.percentage.numerator)
      const denomFn = compileFilter(tile.percentage.denominator)

      const numerator = activeRecords.filter(numFn).length
      const denominator = activeRecords.filter(denomFn).length || 1

      value = parseFloat(((numerator / denominator) * 100).toFixed(1))
      trend = undefined
      direction = undefined
      percent = undefined

      console.log(`[TileCalc] [${tile.key}] Percentage → Numerator: ${numerator}, Denominator: ${denominator}, Value: ${value}`)
    }

    // Average day calculation
    else if (tile.average) {
      console.log(`[TileCalc] [${tile.key}] Starting average calc from ${tile.average.start} to ${tile.average.end}`)

      const valid = activeRecords
        .filter((r) => isDateString(r[tile.average!.start]) && isDateString(r[tile.average!.end]))
        .filter(tile.filter ? compileFilter(tile.filter) : () => true)

      const deltas = valid
        .map((r) => {
          const start = new Date(r[tile.average.start])
          const end = new Date(r[tile.average.end])
          return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        })
        .filter((d) => !isNaN(d))

      value = deltas.length
        ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
        : 0

      trend = undefined
      direction = undefined
      percent = undefined

      console.log(`[TileCalc] [${tile.key}] Average from ${valid.length} records → ${value} days`)
    }

    const clickFilter = tile.clickFilter || (
      tile.filter && tile.matchKey ? { column: tile.matchKey, contains: tile.key } : undefined
    )

    return {
      ...tile,
      value,
      trend,
      direction,
      previous,
      subtitle: tile.subtitle ?? match?.subtitle,
      clickFilter,
      clickable: tile.clickable ?? Boolean(clickFilter),
      percent,
    }
  })
}
