// src/components/data-table/utils/auto-column-widths.ts

export type AnyRow = Record<string, unknown>;
export type AnyCol = {
  id: string;
  accessorKey?: string;
  header?: unknown;
  meta?: {
    // OPTIONAL hints/overrides you can add in your column defs if ever needed:
    widthPct?: number;  // hard override for this column (e.g., 14)
    minPct?: number;    // floor (e.g., 6)
    maxPct?: number;    // cap (e.g., 28)
    kind?: "text" | "number" | "date" | "longtext";
    routingOnly?: boolean;
  };
};

export type AutoPctOptions = {
  sampleRows?: number;                        // default: 50
  overrides?: Record<string, number>;         // optional final overrides { colId: pct }
  floorPct?: number;                           // default: 6
  capPct?: number;                             // default: 28
  ignoreIds?: string[];                        // e.g. ["id", "__select", "__expander", "__actions"]
};

function textLen(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "string") return v.length;
  if (typeof v === "number") return String(v).length;
  if (v instanceof Date) return 10;
  return String(v).length;
}

function headerText(h: unknown, fallback: string): string {
  if (typeof h === "string") return h;
  if (h && typeof h === "object") return "H";
  if (typeof h === "function") return "H";
  return fallback;
}

function inferKindFromData(col: AnyCol, sampleRows: AnyRow[]): "text" | "number" | "date" | "longtext" {
  const key = (col.accessorKey ?? col.id) as keyof AnyRow;
  for (const r of sampleRows) {
    const v = r?.[key];
    if (v == null) continue;
    if (typeof v === "number") return "number";
    if (v instanceof Date) return "date";
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return "date";
    if (/^\d+(\.\d+)?$/.test(s)) return "number";
    if (s.length > 40) return "longtext";
    return "text";
  }
  // fallback to header guess
  const h = headerText(col.header, col.id).toLowerCase();
  if (/(qty|amount|total|#|count)/.test(h)) return "number";
  if (/(date|updated|time)/.test(h)) return "date";
  if (/(note|description|remark|comment)/.test(h)) return "longtext";
  return "text";
}

/**
 * Compute smart percentage widths for columns from real data (first N rows).
 * - Type-aware (numbers/dates narrower; long text wider)
 * - Uses header length + longest sample cell
 * - Applies floors/caps and normalizes to ~100%
 * - Respects meta.widthPct and final overrides map
 */
export function computeAutoColumnPercents(
  columns: AnyCol[],
  rows: AnyRow[],
  opts: AutoPctOptions = {},
): Record<string, number> {
  const {
    sampleRows = 50,
    overrides = {},
    floorPct = 6,
    capPct = 28,
    ignoreIds = [],
  } = opts;

  const sample = rows.slice(0, sampleRows);

  // Tunable type weights
  const typeWeight: Record<string, number> = {
    number: 0.7,   // slim by default
    date: 0.85,    // also slim-ish
    text: 1.0,
    longtext: 1.35 // give more space to free text
  };

  // 1) Build raw weights
  const weights: Record<string, number> = {};
  for (const col of columns) {
    if (!col?.id) continue;
    if (col.meta?.routingOnly || ignoreIds.includes(col.id)) continue;

    // Hard override in meta wins immediately
    if (col.meta?.widthPct != null) {
      weights[col.id] = Math.max(0.01, col.meta.widthPct);
      continue;
    }

    const kind = col.meta?.kind ?? inferKindFromData(col, sample);
    const k = typeWeight[kind] ?? 1.0;

    const hLen = textLen(headerText(col.header, col.id));
    const acc = (col.accessorKey ?? col.id) as keyof AnyRow;
    let maxLen = 0;
    for (const r of sample) {
      const v = r?.[acc];
      maxLen = Math.max(maxLen, textLen(v));
    }

    // Weighted by kind; header matters a bit, content matters more
    const raw = (hLen * 0.6 + maxLen * 1.2) * k;
    weights[col.id] = Math.max(1, raw);
  }

  // If everything was ignored, bail gracefully
  const weightSum = Object.values(weights).reduce((s, n) => s + n, 0);
  if (weightSum === 0) return {};

  // 2) Normalize -> %; apply per-column floors/caps
  const basePct: Record<string, number> = {};
  for (const [id, w] of Object.entries(weights)) {
    const col = columns.find(c => c.id === id)!;
    const min = col.meta?.minPct ?? floorPct;
    const max = col.meta?.maxPct ?? capPct;
    const v = (w / weightSum) * 100;
    basePct[id] = Math.min(max, Math.max(min, v));
  }

  // 3) Re-normalize to ~100% after floors/caps
  const total = Object.values(basePct).reduce((s, n) => s + n, 0) || 1;
  const scale = 100 / total;
  const pct: Record<string, number> = {};
  for (const [id, v] of Object.entries(basePct)) {
    pct[id] = +(v * scale).toFixed(2);
  }

  // 4) Final explicit overrides (e.g. from a view config)
  for (const [id, v] of Object.entries(overrides)) {
    pct[id] = v;
  }

  return pct;
}
