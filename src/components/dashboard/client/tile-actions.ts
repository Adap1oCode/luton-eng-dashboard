import type { DashboardTile, DashboardWidget } from '@/components/dashboard/types'
import type { Filter } from '@/components/dashboard/client/data-filters'
import { isFastFilter } from '@/components/dashboard/client/fast-filter'

export function attachTileActions(
  tiles: DashboardTile[],
  widget: DashboardWidget,
  handleClickWidget: (tile: DashboardTile) => void,
  handleClickFilter: (filter: Filter) => void
): DashboardTile[] {
  return tiles.map((tile) => {
    const isClickable = tile.clickable === true && tile.filter && isFastFilter(tile.filter as Filter)
console.log('[attachTileActions]', {
  key: tile.key,
  clickable: tile.clickable,
  hasFilter: !!tile.filter,
  isFast: tile.filter ? isFastFilter(tile.filter as Filter) : false,
})

    return {
      ...tile,
      onClick: isClickable ? () => handleClickWidget(tile) : undefined,
      onClickFilter: tile.filter ? () => handleClickFilter(tile.filter as Filter) : undefined,
    }
  })
}
