'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format, subMonths } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/**
 * SearchDialog renders date filters in the sidebar,
 * but is hard-coded to never render on the Inventory dashboard.
 */
export function SearchDialog() {
  // 1️⃣ Hooks must always run in the same order:
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const preset   = searchParams.get('range') ?? '3m'
  const paramFrom = searchParams.get('from')
  const paramTo   = searchParams.get('to')

  const [from, setFrom] = React.useState<Date | undefined>(
    paramFrom ? new Date(paramFrom) : undefined
  )
  const [to, setTo] = React.useState<Date | undefined>(
    paramTo ? new Date(paramTo) : undefined
  )

  React.useEffect(() => {
    if (!paramFrom || !paramTo) {
      const today = new Date()
      let fromDate: Date

      if (preset === '3m') fromDate = subMonths(today, 3)
      else if (preset === '6m') fromDate = subMonths(today, 6)
      else fromDate = subMonths(today, 12)

      setFrom(fromDate)
      setTo(today)
    }
  }, [])

  // 2️⃣ Now we can safely bail out based on pathname:
  if (pathname.includes('/dashboard/inventory')) {
    return null
  }

  // 3️⃣ Remainder of the UI
  const applyCustomRange = (fromDate: Date, toDate: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', 'custom')
    params.set('from', format(fromDate, 'yyyy-MM-dd'))
    params.set('to',   format(toDate,   'yyyy-MM-dd'))
    router.push(`${pathname}?${params.toString()}`)
    router.refresh()
  }

  const handleDateChange = (key: 'from' | 'to', date: Date | undefined) => {
    if (key === 'from') setFrom(date)
    else                setTo(date)

    const f = key === 'from' ? date : from
    const t = key === 'to'   ? date : to
    if (f && t) applyCustomRange(f, t)
  }

  const handlePreset = (value: string) => {
    const today = new Date()
    let fromDate: Date

    if (value === '3m') fromDate = subMonths(today, 3)
    else if (value === '6m') fromDate = subMonths(today, 6)
    else                 fromDate = subMonths(today, 12)

    const toDate = today
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    params.set('from',  format(fromDate, 'yyyy-MM-dd'))
    params.set('to',    format(toDate,   'yyyy-MM-dd'))
    router.push(`${pathname}?${params.toString()}`)
    router.refresh()

    setFrom(fromDate)
    setTo(toDate)
  }

  const DateInput = ({
    label,
    value,
    onSelect,
  }: {
    label: string
    value: Date | undefined
    onSelect: (d: Date) => void
  }) => {
    const [open, setOpen] = React.useState(false)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <CalendarIcon className="size-4" />
            {value ? format(value, 'dd MMM yyyy') : `Select ${label}`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (d) onSelect(d)
              setOpen(false)
            }}
            initialFocus
            required
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
      <DateInput label="From" value={from} onSelect={(d) => handleDateChange('from', d)} />
      <DateInput label="To"   value={to}   onSelect={(d) => handleDateChange('to',   d)} />

      <ToggleGroup
        type="single"
        value={preset !== 'custom' ? preset : undefined}
        onValueChange={(val) => val && handlePreset(val)}
        className="gap-1"
      >
        <ToggleGroupItem value="3m"  className="text-xs px-3 py-1">Last 3M</ToggleGroupItem>
        <ToggleGroupItem value="6m"  className="text-xs px-3 py-1">Last 6M</ToggleGroupItem>
        <ToggleGroupItem value="12m" className="text-xs px-3 py-1">Last 12M</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
