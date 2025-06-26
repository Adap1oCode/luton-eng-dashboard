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
      isNull?: boolean
      isNotNull?: boolean
      matches?: string               // ✅ NEW
      notMatches?: string           // ✅ NEW

    }
  | { and: Filter[] }
  | { or: Filter[] }

export function isDateString(value: any): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// ✅ Compile a single filter into a test function
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

    if (filter.isNull === true) return raw === null || raw === undefined
    if (filter.isNotNull === true) return raw !== null && raw !== undefined

    if (filter.equals !== undefined)
      return isString
        ? val === filter.equals.toString().toLowerCase()
        : raw === filter.equals

    if (filter.notEquals !== undefined)
      return isString
        ? val !== filter.notEquals.toString().toLowerCase()
        : raw !== filter.notEquals

    if (filter.lt !== undefined) return raw < filter.lt
    if (filter.lte !== undefined) return raw <= filter.lte
    if (filter.gt !== undefined) return raw > filter.gt
    if (filter.gte !== undefined) return raw >= filter.gte

    if (filter.contains !== undefined && isString)
      return val.includes(filter.contains.toLowerCase())

    if (filter.notContains !== undefined && isString)
      return !val.includes(filter.notContains.toLowerCase())

    if (filter.matches !== undefined && isString)
      return new RegExp(filter.matches).test(raw)

    if (filter.notMatches !== undefined && isString)
      return !new RegExp(filter.notMatches).test(raw)

    if (filter.in)
      return filter.in.some(
        (v) =>
          (isString ? val : raw) ===
          (typeof v === 'string' ? v.toLowerCase() : v)
      )

    if (filter.notIn)
      return !filter.notIn.some(
        (v) =>
          (isString ? val : raw) ===
          (typeof v === 'string' ? v.toLowerCase() : v)
      )

    return true
  }
}

// ✅ Memoized application of filters to dataset
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

// ✅ Used in SummaryCards, SectionCards, Chart click
export function getClickFilter(tile: any): Filter | null {
  if (!tile || !tile.clickable) return null
  return tile.filter ?? null
}
