import GenericDashboardPage from '@/components/dashboard/page'
import { purchaseOrdersConfig } from '@/app/(main)/dashboard/purchase-orders/config'
import { getPurchaseOrders } from '@/app/(main)/dashboard/purchase-orders/_components/data'

export default async function PurchaseOrdersPage() {
  const config = {
    ...purchaseOrdersConfig,
    fetchRecords: getPurchaseOrders,
  }
  
  return <GenericDashboardPage config={config} />
}
