import DashboardClient from '@/components/dashboard/client'
import type { DashboardConfig, ClientDashboardConfig } from '@/components/dashboard/types'

type Props = {
  config: DashboardConfig
  searchParams?: {
    range?: string
    from?: string
    to?: string
  }
}

export default async function GenericDashboardPage({ config, searchParams }: Props) {
  const range = searchParams?.range ?? config.range
  const from = searchParams?.from
  const to = searchParams?.to

  // ✅ Backward-compatible: support both 1-arg and 3-arg fetch functions
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
