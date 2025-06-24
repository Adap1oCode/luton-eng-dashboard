/**
 * Returns true if the filter is a flat, non-nested, single-condition filter.
 * These filters can be evaluated without recursion or deep logic.
 * Used for performance optimizations — not for correctness checking.
 */


import type { Filter } from '@/components/dashboard/client/data-filters'

export function isFastFilter(filter: Filter | null): boolean {
  if (!filter || typeof filter !== 'object') return false

  if ('column' in filter) {
    return (
      'equals' in filter ||
      'notEquals' in filter ||
      'contains' in filter ||
      'notContains' in filter ||
      'lt' in filter ||
      'lte' in filter ||
      'gt' in filter ||
      'gte' in filter ||
      'isNull' in filter ||
      'isNotNull' in filter
    )
  }

  return false
}
