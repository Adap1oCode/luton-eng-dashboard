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

    if (tile.filter && !tile.average && !tile.percentage) {
      const filterFn = compileFilter(tile.filter)
      const matches = currentRecords.filter(filterFn)
      const prevMatches = previousRecords.filter(filterFn)

      console.log(`[TileCalc] [${tile.key}] Matches (current): ${matches.length}`)
      console.log(`[TileCalc] [${tile.key}] Matches (previous): ${prevMatches.length}`)

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

      console.log(`[TileCalc] [${tile.key}] Trend: ${trend} | Direction: ${direction}`)
    }

    else if (tile.percentage) {
      const numFn = compileFilter(tile.percentage.numerator)
      const denomFn = compileFilter(tile.percentage.denominator)
      const num = currentRecords.filter(numFn).length
      const denom = currentRecords.filter(denomFn).length || 1
      value = parseFloat(((num / denom) * 100).toFixed(1))

      console.log(`[TileCalc] [${tile.key}] Percentage → Numerator: ${num}, Denominator: ${denom}, Value: ${value}`)
    }

    else if (tile.average) {
      console.log(`[TileCalc] [${tile.key}] Starting average calc from ${tile.average.start} to ${tile.average.end}`)
      console.log(`[TileCalc] [${tile.key}] Raw currentRecords: ${currentRecords.length}`)

      const valid = currentRecords
        .filter((r) => isDateString(r[tile.average!.start]) && isDateString(r[tile.average!.end]))
        .filter(tile.filter ? compileFilter(tile.filter) : () => true)

      console.log(`[TileCalc] [${tile.key}] Valid records after date+filter check: ${valid.length}`)

      const deltas = valid
        .map((r) => {
          const start = new Date(r[tile.average.start])
          const end = new Date(r[tile.average.end])
          const diff = end.getTime() - start.getTime()
          return diff / (1000 * 60 * 60 * 24)
        })
        .filter((d) => !isNaN(d))

      console.log(`[TileCalc] [${tile.key}] Day deltas:`, deltas)

      value = deltas.length
        ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
        : 0

      console.log(`[TileCalc] [${tile.key}] Average result: ${value}`)

      trend = undefined
      direction = undefined
    }

    const clickFilter = tile.clickFilter || (
      tile.filter && tile.matchKey ? { column: tile.matchKey, contains: tile.key } : undefined
    )

let percent: number | undefined

if (!tile.average && typeof value === 'number') {
  const baseRecords = useFiltered ? rangeFilteredRecords : allRecords
  const total = baseRecords.length

  if (total > 0) {
    percent = parseFloat(((value / total) * 100).toFixed(1))
    console.log(`[TileCalc] [${tile.key}] Percent of base records (${value}/${total}): ${percent}%`)
  } else {
    console.log(`[TileCalc] [${tile.key}] No base records to calculate percent`)
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
