/**
 * Normalizes list API payloads to a consistent shape.
 * Handles both {rows, total} and {data, count} response formats.
 */
export function normalizeListPayload(payload: any): { rows: any[]; total: number } {
  if (!payload || typeof payload !== "object") {
    return { rows: [], total: 0 };
  }
  const rows = (payload.rows ?? payload.data ?? []) as any[];
  const totalCandidate = Number(payload.total ?? payload.count);
  const total = Number.isFinite(totalCandidate) ? totalCandidate : rows.length;

  return { rows, total };
}

