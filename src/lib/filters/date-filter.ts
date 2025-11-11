// -----------------------------------------------------------------------------
// FILE: src/lib/filters/date-filter.ts
// TYPE: Shared filter utility
// PURPOSE: Date filter → query parameter conversion (used by multiple screens)
// -----------------------------------------------------------------------------

/**
 * Date filter → query parameter mapping.
 * Converts "LAST_X_DAYS" to updated_at_gte with ISO date string.
 * 
 * @param dateFilter - Filter value like "ALL", "LAST_7_DAYS", "LAST_30_DAYS", etc.
 * @returns Query parameters object with updated_at_gte if valid, empty object otherwise
 */
export function dateFilterToQuery(dateFilter: string): Record<string, any> {
  if (dateFilter === "ALL") return {};
  
  const days = parseInt(dateFilter.replace("LAST_", "").replace("_DAYS", ""));
  if (isNaN(days)) return {};
  
  // Calculate date X days ago
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0); // Start of day
  
  // Return ISO string for Supabase
  return { updated_at_gte: date.toISOString() };
}
