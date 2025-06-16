import DashboardClient from '@/components/dashboard/client'
import type { DashboardConfig, ClientDashboardConfig } from '@/components/dashboard/types'

type Props = {
  config: DashboardConfig // ✅ Keep full type here for server-side usage
}

export default async function GenericDashboardPage({ config }: Props) {
  const metrics = await config.fetchMetrics(config.range)
  const records = await config.fetchRecords(config.range)

  // ✅ Remove server-only functions before passing to client
  const { fetchMetrics, fetchRecords, ...clientConfig } = config as DashboardConfig

  return (
    <DashboardClient
      config={clientConfig as ClientDashboardConfig}
      metrics={metrics}
      records={records}
    />
  )
}
