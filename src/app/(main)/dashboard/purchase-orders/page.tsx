import GenericDashboardPage from '@/components/dashboard/page'
import { purchaseOrdersConfig } from '@/app/(main)/dashboard/purchase-orders/config'

export default function RequisitionsPage() {
  return <GenericDashboardPage config={purchaseOrdersConfig} />
}
