import { getPurchaseOrders } from "@/app/(main)/dashboard/purchase-orders/_components/data";
import type { DashboardConfig } from "@/components/dashboard/types";

export const purchaseOrdersConfig: DashboardConfig = {
  id: "purchaseorders",
  title: "Purchase Orders Dashboard",
  range: "3m",
  rowIdKey: "po_number",
  fetchRecords: getPurchaseOrders,

  filters: {
    status: "status",
    vendor: "vendor_name",
    warehouse: "warehouse",
    issue: true,
  },

  tiles: [
],

  widgets: [
    {
      key: "po_value_by_vendor",
      component: "ChartBarAggregate",
      title: "PO Value by Vendor",
      description: "Total PO value grouped by vendor",
      column: "vendor_name",       // group by
      valueField: "grand_total",   // numeric field
      metric: "sum",               // aggregation type
      limit: 10,
      debug: true,
    },
  ],

  tableColumns: [
    { accessorKey: "po_number", header: "PO Number" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "order_date", header: "Order Date" },
    { accessorKey: "due_date", header: "Due Date" },
    { accessorKey: "warehouse", header: "Warehouse" },
    { accessorKey: "vendor_name", header: "Vendor" },
    { accessorKey: "grand_total", header: "Grand Total" },
  ],
};
