// File: src/components/dashboard/client/data-filters.ts

import type { ClientDashboardConfig, DashboardTile } from '@/components/dashboard/types'

export function isDateString(val: any): boolean {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)
}

export function isInRange(date: string, from?: string, to?: string): boolean {
  if (!date || !from || !to) return false
  const d = new Date(date)
  return d >= new Date(from) && d <= new Date(to)
}

export function evaluateFilter(row: Record<string, any>, filter?: any): boolean {
  if (!filter) return false

  const match = (f: any): boolean => {
    if ('and' in f) return f.and.every(match)
    if ('or' in f) return f.or.some(match)

    const field = row[f.column]
    const fieldIsDate = isDateString(field)

    if (f.eq !== undefined) return field === f.eq
    if (f.contains !== undefined) return typeof field === 'string' && field.toLowerCase().includes(f.contains.toLowerCase())
    if (f.not_contains !== undefined) return typeof field === 'string' && !field.toLowerCase().includes(f.not_contains.toLowerCase())
    if (f.lt !== undefined) {
      if (fieldIsDate && isDateString(f.lt)) return new Date(field) < new Date(f.lt)
      return field < f.lt
    }
    if (f.gt !== undefined) {
      if (fieldIsDate && isDateString(f.gt)) return new Date(field) > new Date(f.gt)
      return field > f.gt
    }
    if (f.isNull !== undefined) {
      return f.isNull
        ? field === null || field === undefined || field === ''
        : field !== null && field !== undefined && field !== ''
    }

    return false
  }

  return match(filter)
}

export function applyDataFilters(
  records: any[],
  filters: { type: string; value: string }[],
  config: ClientDashboardConfig
): any[] {
  return records.filter((row) => {
    return filters.every((f) => {
      if (f.type === 'issue') {
        const issues = config.dataQuality ? config.dataQuality.map(rule => rule.key) : []
        return issues.includes(f.value)
      }

      const field = config.filters[f.type] as string | undefined
      if (!field) return true

      const rowVal = row[field]
      if (f.value === '') return true

      if (typeof rowVal === 'string') {
        return rowVal.toLowerCase().includes(f.value.toLowerCase())
      }

      return rowVal === f.value
    })
  })
}

export function getClickFilter(tile: DashboardTile): { type: string; value: string } | null {
  const filter = tile.filter as any
  if (!tile.clickable || !filter) return null

  if ('column' in filter && 'contains' in filter) {
    return { type: filter.column, value: filter.contains }
  }

  if ('column' in filter && 'eq' in filter) {
    return { type: filter.column, value: String(filter.eq) }
  }

  return null
}
