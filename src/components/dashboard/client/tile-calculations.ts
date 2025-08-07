import { isDateString, compileFilter } from "./data-filters";

/** Helper: deep‑clone + replace all "__KEY__" placeholders in your filter tree */
function hydrateFilterTree(filter: any, key: string): any {
  if (Array.isArray(filter)) {
    return filter.map((f) => hydrateFilterTree(f, key));
  }
  if (typeof filter === "object" && filter !== null) {
    const out: any = {};
    for (const k in filter) {
      out[k] =
        k === "equals" && filter[k] === "__KEY__"
          ? key
          : hydrateFilterTree(filter[k], key);
    }
    return out;
  }
  return filter;
}

function getActiveRecords(tile: any, rangeFiltered: any[], full: any[]): any[] {
  return tile.noRangeFilter ? full : rangeFiltered;
}

function getValues(records: any[], field: string): number[] {
  return records
    .map((r) => parseFloat(r[field] ?? 0))
    .filter((n) => !isNaN(n));
}

function computeAggregation(values: number[], type: string): number {
  if (values.length === 0) return 0;
  switch (type) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }
    case "average": {
      const sum = values.reduce((a, b) => a + b, 0);
      return Math.round(sum / values.length);
    }
    default:
      return 0;
  }
}

function handleAggregationTile(tile: any, active: any[], previous: any[]) {
  const filterFn = tile.filter ? compileFilter(tile.filter) : () => true;
  const currMatches = active.filter(filterFn);
  const prevMatches = previous.filter(filterFn);

  const currentValues = getValues(currMatches, tile.field);
  const previousValues = getValues(prevMatches, tile.field);

  const value = computeAggregation(currentValues, tile.metric);
  const prev = computeAggregation(previousValues, tile.metric);

  let trend, direction, percent;
  if (!tile.noRangeFilter) {
    if (prev > 0) {
      const delta = ((value - prev) / prev) * 100;
      trend = `${Math.abs(delta).toFixed(1)}%`;
      direction = delta >= 0 ? "up" : "down";
      percent = parseFloat(delta.toFixed(1));
    } else if (value > 0) {
      trend = `+${value}`;
      direction = "up";
      percent = 100;
    } else {
      percent = 0;
    }
  }

  return { value, previous: prev, trend, direction, percent };
}

function handleGroupedAggregation(tile: any, active: any[]) {
  const filterFn = tile.filter ? compileFilter(tile.filter) : () => true;
  const matches = active.filter(filterFn);

  const grouped = matches.reduce((acc: Record<string, number[]>, row: any) => {
    const key = row[tile.column] ?? "Unknown";
    const val = parseFloat(row[tile.field] ?? 0);
    if (!isNaN(val)) {
      (acc[key] ||= []).push(val);
    }
    return acc;
  }, {});

  const tiles = Object.entries(grouped).map(([key, vals]) => ({
    key,
    title: key,
    value: computeAggregation(vals, tile.metric),
    filterType: tile.filterType,
    clickable: true,
    filter: { column: tile.column, equals: key },
  }));

  return { tiles };
}

function handleCountTile(tile: any, active: any[], previous: any[]) {
  const filterFn = compileFilter(tile.filter);
  let matches = active.filter(filterFn);
  let prevMatches = previous.filter(filterFn);

  // distinct?
  if (tile.distinct) {
    const col = tile.distinctColumn!;
    matches = Array.from(new Set(matches.map((r) => String(r[col]))));
    prevMatches = Array.from(
      new Set(
        previous
          .filter(filterFn)
          .map((r) => String(r[col]))
      )
    );
  }

  const value = matches.length;
  const prev = prevMatches.length;

  let trend, direction, percent;
  if (tile.noRangeFilter) {
    const baseTotal = tile.distinct
      ? new Set(active.map((r) => r[tile.distinctColumn!])).size
      : active.length || 1;
    percent = parseFloat(((value / baseTotal) * 100).toFixed(1));
  } else {
    if (prev > 0) {
      const delta = ((value - prev) / prev) * 100;
      trend = `${Math.abs(delta).toFixed(1)}%`;
      direction = delta >= 0 ? "up" : "down";
      percent = parseFloat(delta.toFixed(1));
    } else if (value > 0) {
      trend = `+${value}`;
      direction = "up";
      percent = 100;
    } else {
      percent = 0;
    }
  }

  return { value, previous: prev, trend, direction, percent };
}

function handlePercentageTile(tile: any, active: any[]) {
  const numFn = compileFilter(tile.percentage.numerator);
  const denomFn = compileFilter(tile.percentage.denominator);
  const num = active.filter(numFn).length;
  const den = active.filter(denomFn).length || 1;
  const value = parseFloat(((num / den) * 100).toFixed(1));
  return { value, previous: 0, trend: undefined, direction: undefined, percent: undefined };
}

function handleAverageTile(tile: any, active: any[]) {
  const valid = active
    .filter((r) => isDateString(r[tile.average!.start]))
    .filter((r) => isDateString(r[tile.average!.end]))
    .filter(tile.filter ? compileFilter(tile.filter) : () => true);

  const deltas = valid
    .map((r) => {
      const start = new Date(r[tile.average.start]);
      const end = new Date(r[tile.average.end]);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((d) => !isNaN(d));

  const value = deltas.length
    ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
    : 0;

  return { value, previous: 0, trend: undefined, direction: undefined, percent: undefined };
}

function resolveTileResult(tile: any, active: any[], previous: any[]): any {
  // summary cards or single‑value pre‑calc
  if (tile.preCalculated && !tile.valueField) {
    const val = typeof tile.value === "number" ? tile.value : 0;
    return { value: val, previous: 0, trend: undefined, direction: undefined, percent: undefined };
  }

  // grouped aggregation for bar/pie charts
  const hasGrouped = tile.metric && tile.field && tile.column &&
    (tile.component?.includes("ChartBar") || tile.component?.includes("ChartPie"));

  if (hasGrouped) {
    return handleGroupedAggregation(tile, active);
  }

  // metric‑based aggregation (sum, min, max, median, average)
  if (["sum", "min", "max", "median", "average"].includes(tile.metric) && tile.field) {
    return handleAggregationTile(tile, active, previous);
  }

  // count or distinct count
  if (tile.filter && !tile.percentage && !tile.average && !tile.metric) {
    return handleCountTile(tile, active, previous);
  }

  // percentage
  if (tile.percentage) {
    return handlePercentageTile(tile, active);
  }

  // average duration
  if (tile.average) {
    return handleAverageTile(tile, active);
  }

  // literal value fallback
  if (typeof tile.value === "number") {
    return { value: tile.value, previous: 0, trend: undefined, direction: undefined, percent: undefined };
  }

  return { value: 0, previous: 0, trend: undefined, direction: undefined, percent: undefined };
}

export function tileCalculations(
  configTiles: any[],
  metricTiles: any[],
  rangeFilteredRecords: any[],
  previousRangeFilteredRecords: any[],
  allRecords: any[]
): any[] {
  const allTiles = configTiles
    .map((tile) => {
      const active = getActiveRecords(tile, rangeFilteredRecords, allRecords);
      const previous = getActiveRecords(tile, previousRangeFilteredRecords, allRecords);

      // precalc branch: one tile per metric row
      if (tile.preCalculated && (tile as any).valueField) {
        const keyCol = tile.column!;
        const valField = (tile as any).valueField;
        return metricTiles.map((m) => {
          const contextKey = m[keyCol] ?? "Unknown";
          return {
            ...tile,
            key: contextKey,
            title: contextKey,
            value: parseFloat(m[valField] ?? 0),
            filter: hydrateFilterTree(tile.filter, contextKey),
            clickable: true,
            rpcName: tile.rpcName,
            preCalculated: true,
          };
        });
      }

      // otherwise, compute single tile or grouped tiles
      const result = resolveTileResult(tile, active, previous);
      const clickFilter =
        tile.clickFilter ??
        (tile.filter && tile.matchKey
          ? { column: tile.matchKey, contains: tile.key }
          : undefined);

      return {
        ...tile,
        value: result.value,
        previous: result.previous,
        trend: result.trend,
        direction: result.direction,
        percent: result.percent,
        subtitle: tile.subtitle,
        clickFilter,
        clickable: tile.clickable ?? Boolean(clickFilter),
        tiles: (result as any).tiles ?? [],
      };
    })
    .flat();

  console.log(
    "▶ tileCalculations output keys:",
    allTiles.map((t) => t.key),
    "(total rows):",
    allTiles.length
  );

  return allTiles;
}
