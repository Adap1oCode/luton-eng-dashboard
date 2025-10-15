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
