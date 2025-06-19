'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format, subMonths } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function SearchDialog() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const preset = searchParams.get('range') ?? '3m'
  const paramFrom = searchParams.get('from')
  const paramTo = searchParams.get('to')

  const [from, setFrom] = React.useState<Date | undefined>(paramFrom ? new Date(paramFrom) : undefined)
  const [to, setTo] = React.useState<Date | undefined>(paramTo ? new Date(paramTo) : undefined)

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

  const applyCustomRange = (fromDate: Date, toDate: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', 'custom')
    params.set('from', format(fromDate, 'yyyy-MM-dd'))
    params.set('to', format(toDate, 'yyyy-MM-dd'))
    router.push(`${pathname}?${params.toString()}`)
    router.refresh() // ✅ Ensure data is refreshed on manual date change
  }

  const handleDateChange = (key: 'from' | 'to', date: Date | undefined) => {
    if (key === 'from') setFrom(date)
    else setTo(date)

    const effectiveFrom = key === 'from' ? date : from
    const effectiveTo = key === 'to' ? date : to

    if (effectiveFrom && effectiveTo) {
      applyCustomRange(effectiveFrom, effectiveTo)
    }
  }

  const handlePreset = (value: string) => {
    const today = new Date()
    let fromDate: Date
    const toDate = today

    if (value === '3m') fromDate = subMonths(today, 3)
    else if (value === '6m') fromDate = subMonths(today, 6)
    else fromDate = subMonths(today, 12)

    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    params.set('from', format(fromDate, 'yyyy-MM-dd'))
    params.set('to', format(toDate, 'yyyy-MM-dd'))
    router.push(`${pathname}?${params.toString()}`)
    router.refresh() // ✅ Ensure data is refreshed on preset click

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
    onSelect: (date: Date) => void
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
            onSelect={(date) => {
              if (date) onSelect(date)
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
      <DateInput label="From" value={from} onSelect={(date) => handleDateChange('from', date)} />
      <DateInput label="To" value={to} onSelect={(date) => handleDateChange('to', date)} />

      <ToggleGroup
        type="single"
        value={preset !== 'custom' ? preset : undefined}
        onValueChange={(val) => val && handlePreset(val)}
        className="bg-muted px-2 py-1 rounded-md border"
      >
        <ToggleGroupItem value="3m" className="text-xs px-3 py-1">
          Last 3M
        </ToggleGroupItem>
        <ToggleGroupItem value="6m" className="text-xs px-3 py-1">
          Last 6M
        </ToggleGroupItem>
        <ToggleGroupItem value="12m" className="text-xs px-3 py-1">
          Last 12M
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}