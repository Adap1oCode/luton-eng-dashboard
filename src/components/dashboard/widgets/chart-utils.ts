type DataItem = { [key: string]: any }

export type BucketUnit = 'week'

export type ChartField = {
  key: string
  label: string
  color: string
  accessor?: (row: any) => string | null | undefined
}

type BucketOptions = {
  from: string
  to: string
  unit?: BucketUnit
  fields: ChartField[]
}

function getBucketStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  d.setUTCDate(diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function formatLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function safeDate(input?: string | null): Date | null {
  if (!input) return null
  const raw = new Date(input)
  if (isNaN(raw.getTime())) return null
  return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()))
}

export function getTimeBuckets(
  data: DataItem[],
  options: BucketOptions
): { label: string; [key: string]: any }[] {
  const unit: BucketUnit = 'week' // 🔒 Force weekly always
  const fromDate = new Date(options.from)
  const toDate = new Date(options.to)
  toDate.setUTCHours(23, 59, 59, 999)

  const bucketMap = new Map<string, { date: Date; [key: string]: any }>()
  const cursor = getBucketStart(fromDate)

  while (cursor <= toDate) {
    const key = cursor.toISOString().slice(0, 10)
    const base: { date: Date; [key: string]: any } = { date: new Date(cursor) }
    for (const f of options.fields) base[f.key] = 0
    bucketMap.set(key, base)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  for (const row of data) {
    for (const field of options.fields) {
      if (!field.accessor) continue
      const dateStr = field.accessor(row)
      const parsed = safeDate(dateStr)
      if (!parsed || parsed < fromDate || parsed > toDate) continue
      const bucket = getBucketStart(parsed).toISOString().slice(0, 10)
      if (bucketMap.has(bucket)) {
        bucketMap.get(bucket)![field.key] += 1
      }
    }
  }

  return Array.from(bucketMap.values()).map((entry) => {
    const obj: any = { label: formatLabel(entry.date) }
    for (const f of options.fields) obj[f.key] = entry[f.key]
    return obj
  })
}
