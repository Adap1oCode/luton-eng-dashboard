import type { Filter } from "@/components/dashboard/client/data-filters";
import { normalizeFieldValue } from "@/components/dashboard/client/normalize"; // ✅ import
import type { DashboardTile, DashboardWidget } from "@/components/dashboard/types";

type FilterTree = { and: Filter[] } | { or: Filter[] };

/**
 * Recursively clone a Filter or FilterTree and replace every "__KEY__" placeholder with the actual tile key.
 */
function cloneFilterWithKey(filter: Filter | FilterTree, key: string): Filter | FilterTree {
  if ("and" in filter) {
    return { and: filter.and.map((f) => cloneFilterWithKey(f, key) as Filter) };
  }
  if ("or" in filter) {
    return { or: filter.or.map((f) => cloneFilterWithKey(f, key) as Filter) };
  }

  // It's a plain Filter
  const cloned = { ...filter };
  Object.keys(cloned).forEach((k) => {
    const v = (cloned as any)[k];
    if (typeof v === "string" && v.includes("__KEY__")) {
      (cloned as any)[k] = v.replace(/__KEY__/g, key);
    }
  });
  return cloned;
}

/**
 * Attach click actions to tiles based on their configuration.
 */
export function attachTileActions(
  tiles: DashboardTile[],
  widget: DashboardWidget,
  onClick: (tile: DashboardTile) => void,
  onFilterChange: (filters: Filter[]) => void,
): DashboardTile[] {
  console.log(`[attachTileActions] Processing ${tiles.length} tiles for widget ${widget.key}`);
  
  return tiles.map((tile) => {
    const canClick = tile.clickable || widget.clickable;
    const hasTemplate = Boolean((tile as any).template);
    const hasTileFilter = Boolean(tile.filter);
    const isFastFilter = false; // Simplified - removed fast-filter dependency
    const assignedClick = canClick && (hasTileFilter || (widget as any).rpcName);

    console.log(`[attachTileActions] Tile: ${tile.key}`);
    console.log(`  {
    rpcName: ${JSON.stringify((tile as any).rpcName)},
    preCalculated: ${JSON.stringify((tile as any).preCalculated)},
    hasTemplate: ${JSON.stringify(hasTemplate)},
    hasTileFilter: ${JSON.stringify(hasTileFilter)},
    isFastFilter: ${JSON.stringify(isFastFilter)},
    assignedClick: ${JSON.stringify(assignedClick)},
    tileClickable: ${JSON.stringify(tile.clickable)},
    widgetRpcName: ${JSON.stringify((widget as any).rpcName)}
  }`);

    if (!assignedClick) {
      console.log(`[attachTileActions] No onClick for tile=${tile.key} - not clickable`);
      return tile;
    }

    // Determine the RPC name and filter to use
    const rpcName = (tile as any).rpcName || (widget as any).rpcName;
    const tileFilter = tile.filter;
    const widgetFilter = (widget as any).filter;

    // Debug logging for outOfStockCount tile
    if (tile.key === 'outOfStockCount') {
      console.log(`[attachTileActions] DEBUG for outOfStockCount: {
  tileClickable: ${tile.clickable},
  rpcName: ${JSON.stringify(rpcName)},
  hasTemplate: ${JSON.stringify(hasTemplate)},
  hasTileFilter: ${JSON.stringify(hasTileFilter)},
  canClick: ${canClick},
  tileFilter: ${JSON.stringify(tileFilter)},
  widgetFilter: ${JSON.stringify(widgetFilter)}
}`);
    }

    // Create the onClick handler
    const onClickHandler = () => {
      console.log(`[attachTileActions] onClick for tile=${tile.key} (RPC: ${rpcName})`);
      onClick(tile);
    };

    // Create the onFilter handler if needed
    const onFilterHandler = tileFilter ? (filter: Filter) => onFilterChange([filter]) : undefined;

    return {
      ...tile,
      onClick: onClickHandler,
      onClickFilter: onFilterHandler,
    };
  });
}
