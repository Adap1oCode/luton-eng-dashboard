// utils/resolveDateRange.ts

import { subMonths } from 'date-fns'

export function resolveDateRange(
  range: string,
  from?: string,
  to?: string
): { fromDate: string; toDate: string } {
  const today = new Date()
  let fromDate: Date
  const toDate = today

  if (range === 'custom' && from && to) {
    return { fromDate: from, toDate: to }
  }

  if (range === '6m') fromDate = subMonths(today, 6)
  else if (range === '12m') fromDate = subMonths(today, 12)
  else fromDate = subMonths(today, 3)

  return {
    fromDate: fromDate.toISOString().split('T')[0],
    toDate: toDate.toISOString().split('T')[0],
  }
}
