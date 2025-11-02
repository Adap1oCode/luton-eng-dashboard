// Generic helpers for Next 15 server components (SSR pages that read searchParams)
export type SPValue = string | string[] | undefined;
export type SPRecord = Record<string, SPValue>;

export async function resolveSearchParams(sp?: Promise<SPRecord> | SPRecord): Promise<SPRecord> {
  return sp instanceof Promise ? await sp : (sp ?? {});
}

function firstString(v: SPValue) { return Array.isArray(v) ? v[0] : v; }

export function parsePositiveInt(
  value: SPValue,
  fallback: number,
  { min = 1, max }: { min?: number; max?: number } = {},
) {
  const raw = firstString(value);
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  const clampedMin = Math.max(n, min);
  return typeof max === "number" ? Math.min(clampedMin, max) : clampedMin;
}

export function parsePagination(
  sp: SPRecord,
  { defaultPage = 1, defaultPageSize = 200, min = 1, max = 500 } = {}
) {
  const page = parsePositiveInt(sp.page, defaultPage, { min });
  const pageSize = parsePositiveInt(sp.pageSize, defaultPageSize, { min, max });
  return { page, pageSize };
}

/**
 * Parse pagination and filters from search params.
 * Single source of truth for list view param parsing.
 */
export function parseListParams(
  sp: SPRecord,
  quickFilterMeta: Array<{ id: string; toQueryParam?: (value: string) => Record<string, any> }> = [],
  paginationOpts: { defaultPage?: number; defaultPageSize?: number; max?: number } = {}
): { page: number; pageSize: number; filters: Record<string, string> } {
  const { page, pageSize } = parsePagination(sp, {
    defaultPage: paginationOpts.defaultPage ?? 1,
    defaultPageSize: paginationOpts.defaultPageSize ?? 5,
    max: paginationOpts.max ?? 500,
  });
  
  const filters: Record<string, string> = {};
  quickFilterMeta.forEach(meta => {
    const rawValue = sp[meta.id];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value && typeof value === 'string') {
      filters[meta.id] = value;
    }
  });
  
  return { page, pageSize, filters };
}