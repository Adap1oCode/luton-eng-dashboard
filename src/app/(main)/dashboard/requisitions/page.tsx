import GenericDashboardPage from '@/components/dashboard/page'
import { requisitionsConfig } from '@/app/(main)/dashboard/requisitions/config'

export default function RequisitionsPage() {
  return <GenericDashboardPage config={requisitionsConfig} />
}
