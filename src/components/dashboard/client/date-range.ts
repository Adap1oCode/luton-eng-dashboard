// File: src/components/dashboard/client/date-range.ts

import { useState } from 'react'

export type RangePreset = '3m' | '6m' | '12m'

export function getRangeForPreset(preset: RangePreset): { from: string; to: string } {
  const to = new Date()
  const from = new Date()

  if (preset === '3m') from.setMonth(from.getMonth() - 3)
  if (preset === '6m') from.setMonth(from.getMonth() - 6)
  if (preset === '12m') from.setMonth(from.getMonth() - 12)

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

export function useClientDateRange(defaultPreset: RangePreset = '3m') {
  const [range, setRange] = useState(() => getRangeForPreset(defaultPreset))

  const setPreset = (preset: RangePreset) => {
    setRange(getRangeForPreset(preset))
  }

  return {
    from: range.from,
    to: range.to,
    setRange,
    setPreset,
  }
}
