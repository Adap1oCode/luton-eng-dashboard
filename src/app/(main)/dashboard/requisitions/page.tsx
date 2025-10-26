import GenericDashboardPage from '@/components/dashboard/page'
import { requisitionsConfig } from '@/app/(main)/dashboard/requisitions/config'
import { getRequisitions } from '@/app/(main)/dashboard/requisitions/_components/data'

export default async function RequisitionsPage() {
  const config = {
    ...requisitionsConfig,
    fetchRecords: getRequisitions,
  }
  
  return <GenericDashboardPage config={config} />
}
