/**
 * Status filter → query parameter mapping.
 * Shared between server (SSR) and client (React Query) to ensure consistency.
 */
export function statusToQuery(status: string): Record<string, any> {
  if (status === "ACTIVE") return { qty_gt: 0, qty_not_null: true };
  if (status === "ZERO") return { qty_eq: 0 };
  return {};
}


