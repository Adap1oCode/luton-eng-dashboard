import type { DashboardTile, DashboardWidget } from '@/components/dashboard/types'
import type { Filter } from '@/components/dashboard/client/data-filters'
import { isFastFilter } from '@/components/dashboard/client/fast-filter'
import { normalizeFieldValue } from '@/components/dashboard/client/normalize' // ✅ import

export function attachTileActions(
  tiles: DashboardTile[],
  widget: DashboardWidget,
  handleClickWidget: (tile: DashboardTile) => void,
  handleClickFilter: (filter: Filter) => void
): DashboardTile[] {
  return tiles.map((tile) => {
    const canClick = tile.clickable === true && tile.filter

    console.groupCollapsed(`[attachTileActions] Tile: ${tile.key}`)
    console.log({
      clickable: tile.clickable,
      hasFilter: !!tile.filter,
      isFastFilter: tile.filter ? isFastFilter(tile.filter as Filter) : false,
      assignedClick: canClick,
    })
    console.groupEnd()

    return {
      ...tile,
      onClick: canClick ? () => handleClickWidget(tile) : undefined,
      onClickFilter: canClick ? () => handleClickFilter(tile.filter as Filter) : undefined,
    }
  })
}

export function buildClickFilters({
  column,
  value,
  from,
  to,
  noRangeFilter = false,
}: {
  column: string;
  value: string;
  from: string;
  to: string;
  noRangeFilter?: boolean;
}): Filter[] {
  console.group(`[buildClickFilters]`)
  console.log("column:", column)
  console.log("value:", value)
  console.log("from:", from)
  console.log("to:", to)
  console.log("noRangeFilter:", noRangeFilter)

  const filters: Filter[] = []

  if (!noRangeFilter) {
    filters.push({ column: 'order_date', gte: from })
    filters.push({ column: 'order_date', lte: to })
  }

  // ✅ Normalize the value before using in equals filter
  filters.push({ column, equals: normalizeFieldValue(value) })

  console.log("🧾 Final filters:", filters)
  console.groupEnd()
  return filters
}
