import type { Filter } from "@/components/dashboard/client/data-filters";

import { normalizeFieldValue } from "@/components/dashboard/client/normalize"; // ✅ import
import type { DashboardTile, DashboardWidget } from "@/components/dashboard/types";

type FilterTree = { and: Filter[] } | { or: Filter[] };

/**
 * Recursively clone a Filter or FilterTree and replace every "__KEY__" placeholder with the actual tile key.
 */
function hydrateFilterTree<T extends object>(tree: T, key: string): T {
  const clone: any = JSON.parse(JSON.stringify(tree));
  function walk(obj: any) {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === "__KEY__") {
        obj[k] = key;
      } else if (typeof v === "object" && v !== null) {
        walk(v);
      }
    }
  }
  walk(clone);
  return clone;
}

/**
 * Attach click actions to each DashboardTile, inheriting RPC and pre-calculated flags
 * from widget-level when absent on tile. Supports two modes:
 *   1) Pre-calculated widgets with a filter TEMPLATE (with "__KEY__" placeholders).
 *   2) Legacy per-tile filters.
 */
export function attachTileActions(
  tiles: DashboardTile[],
  widget: DashboardWidget & { filter?: Filter | FilterTree },
  handleClickWidget: (tile: DashboardTile) => void,
  handleClickFilter: (filter: Filter) => void,
): DashboardTile[] {
  console.log(`[attachTileActions] Processing ${tiles.length} tiles for widget ${widget.key}`);
  return tiles.map((tile) => {
    // inherit rpcName and preCalculated
    const rpcName = tile.rpcName ?? (widget as any).rpcName;
    const preCalculated = tile.preCalculated ?? (widget as any).preCalculated;

    // clickable if tile flagged and we have either a rpcName or a template filter or a tile.filter
    const hasTemplate = preCalculated && widget.filter !== undefined;
    const hasTileFilter = tile.filter !== undefined;
    const canClick = tile.clickable === true && (Boolean(rpcName) || hasTemplate || hasTileFilter);
    
    // Debug logging for outOfStockCount tile
    if (tile.key === 'outOfStockCount') {
      console.log(`[attachTileActions] DEBUG for ${tile.key}:`, {
        tileClickable: tile.clickable,
        rpcName,
        hasTemplate,
        hasTileFilter,
        canClick,
        tileFilter: tile.filter,
        widgetFilter: widget.filter
      });
    }

    console.groupCollapsed(`[attachTileActions] Tile: ${tile.key}`);
    console.debug({
      rpcName,
      preCalculated,
      hasTemplate,
      hasTileFilter,
      isFastFilter: false, // Simplified - removed fast-filter dependency
      assignedClick: canClick,
      tileClickable: tile.clickable,
      widgetRpcName: (widget as any).rpcName,
    });
    console.groupEnd();

    return {
      ...tile,
      rpcName,
      preCalculated,

      // If we have an RPC function, use onClick (RPC call)
      // Otherwise, use onClickFilter (client-side filtering)
      onClick: canClick && rpcName
        ? () => {
            console.debug(`[attachTileActions] onClick for tile=${tile.key} (RPC: ${rpcName})`);
            handleClickWidget(tile);
          }
        : (() => {
            if (canClick && !rpcName) {
              console.debug(`[attachTileActions] No onClick for tile=${tile.key} - no RPC function`);
            } else if (!canClick) {
              console.debug(`[attachTileActions] No onClick for tile=${tile.key} - not clickable`);
            }
            return undefined;
          })(),

      onClickFilter: canClick && !rpcName
        ? () => {
            console.groupCollapsed(`[attachTileActions] onClickFilter for tile=${tile.key}`);
            // 1) Pre-calculated branch: use widget.filter as a TEMPLATE
            if (hasTemplate) {
              console.debug("  using widget.filter template:", widget.filter);
              const templ = widget.filter as Filter | FilterTree;
              const rawTree = hydrateFilterTree(templ, tile.key);

              console.debug("  hydrated filter tree:", rawTree);

              // flatten into clauses
              let clauses: Filter[];
              if ("and" in rawTree) clauses = rawTree.and;
              else if ("or" in rawTree) clauses = rawTree.or;
              else clauses = [rawTree as unknown as Filter];

              console.debug("  emitting clauses:", clauses);
              clauses.forEach((f) => handleClickFilter(f));
              console.groupEnd();
              return;
            }

            // 2) Legacy tile.filter branch
            if (hasTileFilter) {
              console.debug("  using tile.filter:", tile.filter);
              handleClickFilter(tile.filter as Filter);
            } else {
              console.debug("  no filter to apply");
            }
            console.groupEnd();
          }
        : undefined,
    };
  });
}
