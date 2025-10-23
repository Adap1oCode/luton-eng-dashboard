"use client";

import type { Filter } from "@/components/dashboard/client/data-filters";
import type { DashboardTile, Thresholds } from "@/components/dashboard/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const statusColors: Record<"ok" | "warning" | "danger", string> = {
  ok: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
};

type DashboardTileWithKey = DashboardTile & { key: string };

type Props = {
  config: DashboardTileWithKey[];
  onClickFilter?: (filter: Filter) => void;
};

function getStatus(value: number, thresholds?: Thresholds): "ok" | "warning" | "danger" | undefined {
  if (!thresholds) return undefined;
  if (
    thresholds.ok &&
    ((thresholds.ok.lt !== undefined && value < thresholds.ok.lt) ??
      (thresholds.ok.gt !== undefined && value > thresholds.ok.gt))
  )
    return "ok";
  if (
    thresholds.warning &&
    ((thresholds.warning.lt !== undefined && value < thresholds.warning.lt) ??
      (thresholds.warning.gt !== undefined && value > thresholds.warning.gt))
  )
    return "warning";
  if (
    thresholds.danger &&
    ((thresholds.danger.lt !== undefined && value < thresholds.danger.lt) ??
      (thresholds.danger.gt !== undefined && value > thresholds.danger.gt))
  )
    return "danger";
  return undefined;
}

export default function SummaryCards({ config, onClickFilter }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {config.map((tile) => {
        const value = tile.value ?? "—";
        const status = typeof value === "number" ? getStatus(value, tile.thresholds) : undefined;
        const isInteractive = !!(tile.onClick || tile.onClickFilter);
        
        // Debug logging for tile click handlers
        if (tile.key === 'outOfStockCount') {
          console.log(`[SummaryCard] ${tile.key} click handlers:`, {
            onClick: !!tile.onClick,
            onClickFilter: !!tile.onClickFilter,
            isInteractive,
            rpcName: tile.rpcName,
            clickable: tile.clickable
          });
        }

        if (tile.debug) {
          console.log(`[SummaryCard] ${tile.key}`, {
            value,
            thresholds: tile.thresholds,
            filter: tile.filter,
          });
        }

        return (
          <Card
            key={tile.key}
            role={isInteractive ? "button" : undefined}
            onClick={isInteractive ? (() => {
              if (tile.onClickFilter) {
                // Create a default filter for the tile
                const defaultFilter = { column: tile.key, equals: tile.value ?? undefined };
                tile.onClickFilter(defaultFilter);
              } else if (tile.onClick) {
                tile.onClick();
              }
            }) : undefined}
            className={`@container/card relative ${isInteractive ? "hover:bg-muted/50 cursor-pointer transition-colors" : ""}`}
          >
            <CardHeader>
              <CardDescription>{tile.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {typeof value === "number"
                  ? value.toLocaleString(undefined, {
                      notation: "compact",
                      compactDisplay: "short",
                      maximumFractionDigits: 2,
                    })
                  : value}
              </CardTitle>
              {tile.percent !== undefined && <div className="text-sm font-medium">{tile.percent}%</div>}
              {tile.subtitle && (
                <CardDescription className="text-muted-foreground text-sm">{tile.subtitle}</CardDescription>
              )}
            </CardHeader>
            {status && (
              <div className="absolute top-3 right-3">
                <span className={`inline-block h-3 w-3 rounded-full ${statusColors[status]}`} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
