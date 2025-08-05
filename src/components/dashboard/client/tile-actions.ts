import type { DashboardTile, DashboardWidget } from '@/components/dashboard/types'
import type { Filter } from '@/components/dashboard/client/data-filters'
import { isFastFilter } from '@/components/dashboard/client/fast-filter'
import { normalizeFieldValue } from '@/components/dashboard/client/normalize' // ✅ import

/**
 * Attach click actions to each DashboardTile, inheriting RPC and pre-calculated flags from widget-level when absent on tile.
 */
export function attachTileActions(
  tiles: DashboardTile[],
  widget: DashboardWidget,
  handleClickWidget: (tile: DashboardTile) => void,
  handleClickFilter: (filter: Filter) => void
): DashboardTile[] {
  return tiles.map((tile) => {
    // Inherit rpcName and preCalculated from widget config if not set directly on tile
    const rpcName       = tile.rpcName ?? (widget as any).rpcName
    const preCalculated = tile.preCalculated ?? (widget as any).preCalculated

    const canClick = tile.clickable === true && (tile.filter !== undefined || Boolean(rpcName))

    console.groupCollapsed(`[attachTileActions] Tile: ${tile.key}`)
    console.debug({
      clickable: tile.clickable,
      hasFilter: !!tile.filter,
      hasRpc: !!rpcName,
      preCalculated,
      isFastFilter: tile.filter ? isFastFilter(tile.filter as Filter) : false,
      assignedClick: canClick,
    })
    console.groupEnd()

    return {
      ...tile,
      rpcName,
      preCalculated,
      onClick: canClick ? () => handleClickWidget(tile) : undefined,
      onClickFilter:
        canClick && tile.filter
          ? () => handleClickFilter(tile.filter as Filter)
          : undefined,
    }
  })
}

/**
 * Build a set of Filters for drill-downs based on column/value and optional date range.
 */
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
  console.debug('column:', column)
  console.debug('value:', value)
  console.debug('from:', from)
  console.debug('to:', to)
  console.debug('noRangeFilter:', noRangeFilter)

  const filters: Filter[] = []

  if (!noRangeFilter) {
    filters.push({ column: 'order_date', gte: from })
    filters.push({ column: 'order_date', lte: to })
  }

  // Normalize field value (e.g. trim, lowercase) before filtering
  filters.push({ column, equals: normalizeFieldValue(value) })

  console.debug('🧾 Final filters:', filters)
  console.groupEnd()
  return filters
}
