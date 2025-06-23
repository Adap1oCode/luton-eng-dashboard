// data-filters.ts

export type Filter =
  | {
      column: string
      type?: string
      equals?: string | number | boolean
      notEquals?: string | number | boolean
      lt?: number | string
      lte?: number | string
      gt?: number | string
      gte?: number | string
      contains?: string
      notContains?: string
      in?: (string | number)[]
      notIn?: (string | number)[]
    }
  | {
      and: Filter[]
    }
  | {
      or: Filter[]
    }

export function isDateString(value: any): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// ✅ Core: compile any filter to a performant function
export function compileFilter(filter: Filter): (row: Record<string, any>) => boolean {
  if ('and' in filter) {
    const subs = filter.and.map(compileFilter)
    return (row) => subs.every((fn) => fn(row))
  }

  if ('or' in filter) {
    const subs = filter.or.map(compileFilter)
    return (row) => subs.some((fn) => fn(row))
  }

  const col = filter.column

  return (row) => {
    const raw = row[col]
    const isString = typeof raw === 'string'
    const val = isString ? raw.toLowerCase() : raw

    if (filter.equals !== undefined) return raw === filter.equals
    if (filter.notEquals !== undefined) return raw !== filter.notEquals
    if (filter.lt !== undefined) return raw < filter.lt
    if (filter.lte !== undefined) return raw <= filter.lte
    if (filter.gt !== undefined) return raw > filter.gt
    if (filter.gte !== undefined) return raw >= filter.gte
    if (filter.contains !== undefined && isString) return val.includes(filter.contains.toLowerCase())
    if (filter.notContains !== undefined && isString) return !val.includes(filter.notContains.toLowerCase())
    if (filter.in) return filter.in.includes(raw)
    if (filter.notIn) return !filter.notIn.includes(raw)

    return true
  }
}

// ✅ Main API: applies one or many filters (memoized compile)
const filterCache = new WeakMap<Filter, (row: Record<string, any>) => boolean>()

export function applyDataFilters(
  records: any[],
  filters: Filter | Filter[] = [],
  config?: any
): any[] {
  if (!filters || records.length === 0) return records

  const list = Array.isArray(filters) ? filters : [filters]
  const compiled = list.map((f) => {
    if (filterCache.has(f)) return filterCache.get(f)!
    const fn = compileFilter(f)
    filterCache.set(f, fn)
    return fn
  })

  return records.filter((row) => compiled.every((fn) => fn(row)))
}

// ✅ Used in clickable tiles (e.g. SummaryCards)
export function getClickFilter(tile: any): Filter | null {
  if (!tile || !tile.filterType || tile.value === undefined || tile.value === null) return null

  return {
    column: tile.filterType,
    equals: tile.value,
  }
}
