// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/filters.meta.ts
// TYPE: Server-safe filter metadata
// PURPOSE: Minimal filter definitions for server-side parsing (ids + transforms only)
// -----------------------------------------------------------------------------

import { statusToQuery } from "./filters";

/**
 * Minimal filter metadata for server-side parsing.
 * Contains only id and toQueryParam (no UI fields like label, options).
 */
export type QuickFilterMeta = {
  id: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

export const stockAdjustmentsFilterMeta: QuickFilterMeta[] = [
  {
    id: "status",
    toQueryParam: statusToQuery,
  },
];

// Re-export for convenience
export { statusToQuery };


