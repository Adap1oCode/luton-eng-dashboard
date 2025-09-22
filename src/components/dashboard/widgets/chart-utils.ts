export type DataItem = { [key: string]: any };

export type BucketUnit = "week";

export type ChartField = {
  key: string;
  label: string;
  color: string;
  accessor?: (row: any) => string | null | undefined;
};

export type BarChartOptions = {
  /** Toggle to use pre-aggregated values directly */
  preCalculated?: boolean;
  fields?: { key: string; label?: string }[];
  sortBy?: "label" | "value";
  limit?: number;
  valueField?: string;
  metric?: "count" | "sum" | "average" | "min" | "max";
};

type BucketOptions = {
  from: string;
  to: string;
  unit?: BucketUnit;
  fields: ChartField[];
};

// 🔧 Normalize dates to start of the week (Monday)
function getBucketStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function formatLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function safeDate(input?: string | null): Date | null {
  if (!input) return null;
  const raw = new Date(input);
  if (isNaN(raw.getTime())) return null;
  return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()));
}

/**
 * Area chart: time-bucketed aggregation by weekly period.
 */
export function getTimeBuckets(data: DataItem[], options: BucketOptions): { label: string; [key: string]: any }[] {
  const fromDate = new Date(options.from);
  const toDate = new Date(options.to);
  toDate.setUTCHours(23, 59, 59, 999);

  const bucketMap = new Map<string, { date: Date; [key: string]: any }>();
  const cursor = getBucketStart(fromDate);

  while (cursor <= toDate) {
    const key = cursor.toISOString().slice(0, 10);
    const base: { date: Date; [key: string]: any } = { date: new Date(cursor) };
    for (const f of options.fields) base[f.key] = 0;
    bucketMap.set(key, base);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  for (const row of data) {
    for (const field of options.fields) {
      if (!field.accessor) continue;
      const dateStr = field.accessor(row);
      const parsed = safeDate(dateStr);
      if (!parsed || parsed < fromDate || parsed > toDate) continue;
      const bucket = getBucketStart(parsed).toISOString().slice(0, 10);
      if (bucketMap.has(bucket)) {
        bucketMap.get(bucket)![field.key] += 1;
      }
    }
  }

  return Array.from(bucketMap.values()).map((entry) => {
    const obj: any = { label: formatLabel(entry.date) };
    for (const f of options.fields) obj[f.key] = entry[f.key];
    return obj;
  });
}

/**
 * Bar chart: grouped aggregation logic, now supports sum/avg/min/max/count
 * and direct pre-calculated passthrough when flagged.
 */
export function getBarChartData(
  data: any[],
  key: string | undefined,
  options: BarChartOptions = {},
): { key: string; label: string; value: number }[] {
  const { fields = [], sortBy = "value", limit, valueField, metric = "count", preCalculated = false } = options;

  // ─── 1) PRE-CALCULATED PASS-THROUGH ─────────────────────────────────────
  if (preCalculated && valueField) {
    let output = data.map((row) => {
      const rawKey = (key ? String(row[key]) : "") || "Unknown";
      const label = fields.find((f) => f.key === rawKey)?.label ?? rawKey;
      const value = Number(row[valueField]) ?? 0;
      return { key: rawKey, label, value };
    });
    // apply sorting
    if (sortBy === "label") {
      output.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      output.sort((a, b) => b.value - a.value);
    }
    // apply limit
    if (limit && limit > 0) {
      output = output.slice(0, limit);
    }
    return output;
  }

  // ─── 2) STANDARD GROUPING & AGGREGATION ─────────────────────────────────
  const groups: Record<string, number[]> = {};
  if (key) {
    for (const row of data) {
      if (!(key in row)) continue;
      const raw = row[key];
      if (!raw) continue;

      const keys = String(raw)
        .split(",")
        .map((k) => k.trim());
      for (const k of keys) {
        if (!k) continue;
        const val = Number(valueField ? (row[valueField] ?? 0) : 1);
        if (!groups[k]) groups[k] = [];
        groups[k].push(val);
      }
    }
  }

  let output = Object.entries(groups).map(([label, values]) => {
    let value = 0;
    if (metric === "sum") {
      value = values.reduce((a, b) => a + b, 0);
    } else if (metric === "average") {
      value = values.reduce((a, b) => a + b, 0) / values.length;
    } else if (metric === "min") {
      value = Math.min(...values);
    } else if (metric === "max") {
      value = Math.max(...values);
    } else {
      value = values.length;
    }

    const matchedLabel = fields.find((f) => f.key === label)?.label ?? label;
    return { key: label, label: matchedLabel, value };
  });

  // apply sorting
  if (sortBy === "label") {
    output.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    output.sort((a, b) => b.value - a.value);
  }

  // apply limit
  if (limit && limit > 0) {
    output = output.slice(0, limit);
  }

  return output;
}
