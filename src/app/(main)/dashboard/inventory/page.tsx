import GenericDashboardPage from '@/components/dashboard/page'
import { inventoryConfig } from '@/app/(main)/dashboard/inventory/config'

export default function InventoryPage() {
  return <GenericDashboardPage config={inventoryConfig} />
}
