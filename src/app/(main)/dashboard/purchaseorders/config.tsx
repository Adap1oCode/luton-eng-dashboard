// /dashboard/purchaseorders/config.ts

import { getPurchaseOrderMetrics, getPurchaseOrders } from '@/app/(main)/dashboard/purchaseorders/_components/data'
import type { DashboardConfig } from '@/components/dashboard/types'

export const purchaseOrdersConfig: DashboardConfig = {
  id: 'purchaseorders',
  title: 'Purchase Orders Dashboard',
  range: '3m',
  rowIdKey: 'po_number',

  fetchRecords: getPurchaseOrders,
  fetchMetrics: getPurchaseOrderMetrics,

  filters: {
    status: 'status',
    vendor: 'vendor_name',
    warehouse: 'warehouse',
    issue: true,
  },

  tiles: [
    { key: 'totalPOs', title: 'Total POs' },
    { key: 'closedPOs', title: 'Closed - Received Complete' },
    { key: 'missingOrderDate', title: 'Missing Order Date' },
    { key: 'missingDueDate', title: 'Missing Due Date' },
  ],


  widgets: [
    { component: 'SectionCards', key: 'tiles' },
    { component: 'ChartAreaInteractive' },
    { component: 'ChartMissingData', filterType: 'issue' },
    { component: 'ChartByStatus', filterType: 'status' },
    { component: 'ChartByCreator', filterType: 'vendor' },
    { component: 'ChartByProject', filterType: 'warehouse' }
  ],

  tableColumns: [
    { accessorKey: 'po_number', header: 'PO Number' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'vendor_name', header: 'Vendor' },
    { accessorKey: 'order_date', header: 'Order Date' },
    { accessorKey: 'due_date', header: 'Due Date' },
    { accessorKey: 'warehouse', header: 'Warehouse' },
    { accessorKey: 'grand_total', header: 'Grand Total' }
  ]
}
