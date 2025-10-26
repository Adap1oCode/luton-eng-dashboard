import { normalizeFieldValue } from "@/components/dashboard/client/normalize"

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
      matches?: string
      notMatches?: string
    }
  | { and: Filter[] }
  | { or: Filter[] }

export function isDateString(value: any): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// ✅ Compile a single filter into a test function
export function compileFilter(filter: Filter): (row: Record<string, any>) => boolean {
  if ("and" in filter) {
    const subs = filter.and.map(compileFilter)
    return (row) => subs.every((fn) => fn(row))
  }

  if ("or" in filter) {
    const subs = filter.or.map(compileFilter)
    return (row) => subs.some((fn) => fn(row))
  }

  const col = filter.column
  return (row) => {
    const raw = row[col]
    const rowVal = normalizeFieldValue(raw)

    if (filter.isNull === true) return raw === null || raw === undefined
    if (filter.isNotNull === true) return raw !== null && raw !== undefined

    if (filter.equals !== undefined) {
      // For numeric comparisons, use direct comparison
      if (typeof raw === 'number' && typeof filter.equals === 'number') {
        const match = raw === filter.equals
        console.group(`[FILTER.equals] Comparing row[${col}] (numeric)`)
        console.log("📄 raw value     →", raw)
        console.log("🎯 target value  →", filter.equals)
        console.log("✅ match         →", match)
        console.groupEnd()
        return match
      }
      
      // For string comparisons, use normalization
      const target = normalizeFieldValue(filter.equals)
      const match = rowVal === target

      console.group(`[FILTER.equals] Comparing row[${col}] (string)`)
      console.log("📄 raw value     →", raw)
      console.log("🎯 target value  →", filter.equals)
      console.log("🔁 normalized row→", rowVal)
      console.log("🔁 normalized tgt→", target)
      console.log("✅ match         →", match)
      console.groupEnd()

      return match
    }

    if (filter.notEquals !== undefined) {
      const target = normalizeFieldValue(filter.notEquals)
      return rowVal !== target
    }

    if (filter.lt !== undefined) return raw < filter.lt
    if (filter.lte !== undefined) return raw <= filter.lte
    if (filter.gt !== undefined) return raw > filter.gt
    if (filter.gte !== undefined) return raw >= filter.gte

    if (filter.contains !== undefined && typeof rowVal === "string")
      return rowVal.includes(normalizeFieldValue(filter.contains))

    if (filter.notContains !== undefined && typeof rowVal === "string")
      return !rowVal.includes(normalizeFieldValue(filter.notContains))

    if (filter.matches !== undefined && typeof raw === "string")
      return new RegExp(filter.matches).test(raw)

    if (filter.notMatches !== undefined && typeof raw === "string")
      return !new RegExp(filter.notMatches).test(raw)

    if (filter.in)
      return filter.in.some((v) => rowVal === normalizeFieldValue(v))

    if (filter.notIn)
      return !filter.notIn.some((v) => rowVal === normalizeFieldValue(v))

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
  console.debug("[FILTERS APPLIED]", list)

  const compiled = list.map((f) => {
    if (filterCache.has(f)) return filterCache.get(f)!
    const fn = compileFilter(f)
    filterCache.set(f, fn)
    return fn
  })

  const result = records.filter((row) => compiled.every((fn) => fn(row)))
  console.debug(`[FILTER RESULT] ${result.length} of ${records.length} records match`)
  return result
}

// ✅ Used in SummaryCards, SectionCards, Chart click
export function getClickFilter(tile: any): Filter | null {
  if (!tile || !tile.clickable) return null
  return tile.filter ?? null
}
