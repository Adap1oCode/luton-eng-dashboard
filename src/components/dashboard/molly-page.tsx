'use server'

import DashboardClient from '@/components/dashboard/molly-client'
import type { DashboardConfig, ClientDashboardConfig } from '@/components/dashboard/types'
import { resolveDateRange } from '@/components/dashboard/resolve-date-range'
import { headers } from 'next/headers'

type Props = {
  config: DashboardConfig
}

export default async function GenericDashboardPage({ config }: Props) {
  const header = await headers()
  const fullUrl = header.get('x-url') ?? ''
  const url = new URL(fullUrl, 'http://localhost') // required fallback for SSR parsing

  const range = url.searchParams.get('range') ?? config.range ?? '3m'
  const fromParam = url.searchParams.get('from') ?? undefined
  const toParam = url.searchParams.get('to') ?? undefined

  const { fromDate, toDate } = resolveDateRange(range, fromParam, toParam)
  const from = fromParam ?? fromDate
  const to = toParam ?? toDate

  console.log('✅ GenericDashboardPage: range', range, 'from', from, 'to', to)

  const metrics = config.fetchMetrics
    ? await config.fetchMetrics(range, from, to)
    : { summary: [], trends: [] }

  const records =
    config.fetchRecords.length === 1
      ? await config.fetchRecords(range)
      : await config.fetchRecords(range, from, to)

  const { fetchMetrics, fetchRecords, ...clientConfig } = config

  return (
    <DashboardClient
      config={{ ...clientConfig, range, from, to } as ClientDashboardConfig}
      metrics={metrics}
      records={records}
      from={from}
      to={to}
    />
  )
}
