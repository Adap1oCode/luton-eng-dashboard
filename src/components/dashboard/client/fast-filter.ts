/**
 * Returns true if the filter is a flat, non-nested, single-condition filter.
 * These filters can be evaluated without recursion or deep logic.
 * Used for performance optimizations — not for correctness checking.
 */

import type { Filter } from '@/components/dashboard/client/data-filters'

export const FAST_FILTER_KEYS = [
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'lt',
  'lte',
  'gt',
  'gte',
  'isNull',
  'isNotNull',
] as const

export function isFastFilter(filter: Filter | null): boolean {
  if (!filter || typeof filter !== 'object') return false

  if ('column' in filter) {
    return FAST_FILTER_KEYS.some((key) => key in filter)
  }

  return false
}
