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
    const canClick = tile.clickable === true && tile.filter

    console.log('[attachTileActions]', {
      key: tile.key,
      clickable: tile.clickable,
      hasFilter: !!tile.filter,
      isFast: tile.filter ? isFastFilter(tile.filter as Filter) : false,
      canClick,
    })

    return {
      ...tile,
      onClick: canClick ? () => handleClickWidget(tile) : undefined,
      onClickFilter: canClick ? () => handleClickFilter(tile.filter as Filter) : undefined,
    }
  })
}

