import DashboardClient from '@/components/dashboard/client'
import type { DashboardConfig, ClientDashboardConfig } from '@/components/dashboard/types'
import { resolveDateRange } from '@/components/dashboard/shared/resolve-date-range'

type Props = {
  config: DashboardConfig
  searchParams?: {
    range?: string
    from?: string
    to?: string
  }
}

export default async function GenericDashboardPage({ config, searchParams }: Props) {
  const range = searchParams?.range ?? config.range ?? '3m'

  const { fromDate, toDate } = resolveDateRange(range, searchParams?.from, searchParams?.to)

  const from = searchParams?.from ?? fromDate
  const to = searchParams?.to ?? toDate

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
    />
  )
}
