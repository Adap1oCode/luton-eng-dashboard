import { subMonths } from 'date-fns'

export function resolveDateRange(
  range: string,
  from?: string,
  to?: string
): { fromDate: string; toDate: string } {
  const today = new Date()
  const toDate = today

  // If custom range provided and both dates are present, return as-is
  if (range === 'custom' && from && to) {
    return {
      fromDate: new Date(from).toISOString().split('T')[0],
      toDate: new Date(to).toISOString().split('T')[0],
    }
  }

  // Fallbacks based on preset range
  const fromDate =
    range === '6m'
      ? subMonths(today, 6)
      : range === '12m'
      ? subMonths(today, 12)
      : subMonths(today, 3)

  return {
    fromDate: fromDate.toISOString().split('T')[0],
    toDate: toDate.toISOString().split('T')[0],
  }
}
