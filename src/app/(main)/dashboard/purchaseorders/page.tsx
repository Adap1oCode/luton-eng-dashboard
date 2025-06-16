import GenericDashboardPage from '@/components/dashboard/page'
import { purchaseOrdersConfig } from '@/app/(main)/dashboard/purchaseorders/config'

export default function PurchaseOrdersPage() {
  return <GenericDashboardPage config={purchaseOrdersConfig} />
}
