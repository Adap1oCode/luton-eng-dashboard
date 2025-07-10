import { isDateString, compileFilter } from "./data-filters";

function getActiveRecords(tile: any, rangeFiltered: any[], full: any[]): any[] {
  return tile.noRangeFilter ? full : rangeFiltered;
}

function getValues(records: any[], field: string): number[] {
  return records.map((r) => parseFloat(r[field] ?? 0)).filter((n) => !isNaN(n));
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
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
    case "average": {
      const sum = values.reduce((a, b) => a + b, 0);
      return Math.round(sum / values.length);
    }
    default:
      return 0;
  }
}

function handleAggregationTile(tile: any, activeRecords: any[], previousRecords: any[]) {
  const filterFn = tile.filter ? compileFilter(tile.filter) : () => true;
  const matches = activeRecords.filter(filterFn);
  const prevMatches = previousRecords.filter(filterFn);

  const currentValues = getValues(matches, tile.field);
  const previousValues = getValues(prevMatches, tile.field);

  const value = computeAggregation(currentValues, tile.metric);
  const previous = computeAggregation(previousValues, tile.metric);

  let trend, direction, percent;

  if (!tile.noRangeFilter) {
    if (previous > 0) {
      const delta = ((value - previous) / previous) * 100;
      trend = `${Math.abs(delta).toFixed(1)}%`;
      direction = delta >= 0 ? "up" : "down";
      percent = parseFloat(delta.toFixed(1));
    } else if (value > 0) {
      trend = `+${value}`;
      direction = "up";
      percent = 100;
    } else {
      trend = undefined;
      direction = undefined;
      percent = 0;
    }
  }

  return { value, previous, trend, direction, percent };
}

function handleGroupedAggregation(tile: any, activeRecords: any[]) {
  const filterFn = tile.filter ? compileFilter(tile.filter) : () => true;
  const matches = activeRecords.filter(filterFn);

  const grouped = matches.reduce((acc: Record<string, number[]>, row: any) => {
    const key = row[tile.column] ?? "Unknown";
    const val = parseFloat(row[tile.field] ?? 0);
    if (!isNaN(val)) {
      acc[key] = acc[key] || [];
      acc[key].push(val);
    }
    return acc;
  }, {});

  const tiles = Object.entries(grouped).map(([key, values]) => ({
    key,
    title: key,
    value: computeAggregation(values, tile.metric),
    filterType: tile.filterType,
    clickable: true,
    filter: { column: tile.column, equals: key },
  }));

  return { tiles };
}

function handleCountTile(tile: any, activeRecords: any[], previousRecords: any[]) {
  const filterFn = compileFilter(tile.filter);
  const matches = activeRecords.filter(filterFn);
  const prevMatches = previousRecords.filter(filterFn);

  const value = matches.length;
  const previous = prevMatches.length;

  let trend, direction, percent;

  if (tile.noRangeFilter) {
    const total = activeRecords.length ?? 1;
    percent = parseFloat(((value / total) * 100).toFixed(1));
  } else {
    if (previous > 0) {
      const delta = ((value - previous) / previous) * 100;
      trend = `${Math.abs(delta).toFixed(1)}%`;
      direction = delta >= 0 ? "up" : "down";
      percent = parseFloat(delta.toFixed(1));
    } else if (value > 0) {
      trend = `+${value}`;
      direction = "up";
      percent = 100;
    } else {
      trend = undefined;
      direction = undefined;
      percent = 0;
    }
  }

  return { value, previous, trend, direction, percent };
}

function handlePercentageTile(tile: any, activeRecords: any[]) {
  const numFn = compileFilter(tile.percentage.numerator);
  const denomFn = compileFilter(tile.percentage.denominator);

  const numerator = activeRecords.filter(numFn).length;
  const denominator = activeRecords.filter(denomFn).length ?? 1;
  const value = parseFloat(((numerator / denominator) * 100).toFixed(1));

  return { value, previous: 0, trend: undefined, direction: undefined, percent: undefined };
}

function handleAverageTile(tile: any, activeRecords: any[]) {
  const valid = activeRecords
    .filter((r) => isDateString(r[tile.average!.start]) && isDateString(r[tile.average!.end]))
    .filter(tile.filter ? compileFilter(tile.filter) : () => true);

  const deltas = valid
    .map((r) => {
      const start = new Date(r[tile.average.start]);
      const end = new Date(r[tile.average.end]);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((d) => !isNaN(d));

  const value = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;

  return { value, previous: 0, trend: undefined, direction: undefined, percent: undefined };
}

function resolveTileResult(tile: any, activeRecords: any[], previousRecords: any[]): any {
  const hasFilter = tile.filter && !tile.average && !tile.percentage && !tile.metric;

  if (
    tile.metric &&
    tile.field &&
    tile.column &&
    (tile.component?.includes("ChartBar") || tile.component?.includes("ChartPie"))
  ) {
    return handleGroupedAggregation(tile, activeRecords);
  }

  if (
    (tile.metric === "sum" ||
      tile.metric === "min" ||
      tile.metric === "max" ||
      tile.metric === "median" ||
      tile.metric === "average") &&
    tile.field
  ) {
    return handleAggregationTile(tile, activeRecords, previousRecords);
  }
  if (hasFilter) {
    return handleCountTile(tile, activeRecords, previousRecords);
  }
  if (tile.percentage) {
    return handlePercentageTile(tile, activeRecords);
  }
  if (tile.average) {
    return handleAverageTile(tile, activeRecords);
  }
  if (typeof tile.value === "number") {
    return { value: tile.value, previous: 0, trend: undefined, direction: undefined, percent: undefined };
  }

  return { value: 0, previous: 0, trend: undefined, direction: undefined, percent: undefined };
}

function processTile(
  tile: any,
  metricTiles: any[],
  rangeFilteredRecords: any[],
  previousRangeFilteredRecords: any[],
  allRecords: any[],
) {
  const match = metricTiles.find((m: any) => m.key === tile.matchKey || m.key === tile.key);

  const activeRecords = getActiveRecords(tile, rangeFilteredRecords, allRecords);
  const previousRecords = getActiveRecords(tile, previousRangeFilteredRecords, allRecords);

  const result: any = resolveTileResult(tile, activeRecords, previousRecords);

  const clickFilter =
    tile.clickFilter ?? (tile.filter && tile.matchKey ? { column: tile.matchKey, contains: tile.key } : undefined);

  return {
    ...tile,
    value: result.value,
    trend: result.trend,
    direction: result.direction,
    previous: result.previous,
    subtitle: tile.subtitle ?? match?.subtitle,
    clickFilter,
    clickable: tile.clickable ?? Boolean(clickFilter),
    percent: result.percent,
    tiles: result.tiles,
  };
}

export function tileCalculations(
  configTiles: any[],
  metricTiles: any[],
  rangeFilteredRecords: any[],
  previousRangeFilteredRecords: any[],
  allRecords: any[],
): any[] {
  return configTiles.map((tile) =>
    processTile(tile, metricTiles, rangeFilteredRecords, previousRangeFilteredRecords, allRecords),
  );
}
