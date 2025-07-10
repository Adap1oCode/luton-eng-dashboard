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
    creator: "created_by",
    project: "project_number",
    issue: true,
  },

  summary: [
    {
      key: "totalAllTime",
      title: "Total Purchase Orders",
      subtitle: "All Time",
      filter: { column: "po_number", isNotNull: true },
      clickable: true,
      noRangeFilter: true,
      sql: "SELECT COUNT(*) FROM purchaseorders",
    },
    {
      key: "issued",
      title: "Open",
      subtitle: "All Time",
      filter: { column: "status", contains: "open" },
      thresholds: {},
      clickable: true,
      noRangeFilter: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE status ILIKE '%open%'",
    },
    {
      key: "inProgress",
      title: "In Progress",
      subtitle: "All Time",
      filter: { column: "status", contains: "progress" },
      thresholds: {},
      clickable: true,
      noRangeFilter: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE status ILIKE '%progress%'",
    },
    {
      key: "completed",
      title: "Completed",
      subtitle: "All Time",
      filter: { column: "status", contains: "complete" },
      thresholds: {},
      clickable: true,
      noRangeFilter: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE status ILIKE '%complete%'",
    },
    {
      key: "total_po_value",
      title: "Total PO Value",
      subtitle: "All Time",
      metric: "sum",
      field: "grand_total",
      filter: { and: [{ column: "is_deleted", equals: false }] },
      noRangeFilter: true,
      format: "currency",
      thresholds: {
        warning: { lt: 10000 },
        danger: { lt: 1000 },
      },
    },
    {
      key: "avg_po_value",
      title: "Avg PO Value",
      subtitle: "All Time",
      metric: "average",
      field: "grand_total",
      noRangeFilter: true,
      filter: {
        and: [
          { column: "is_deleted", equals: false },
          { column: "grand_total", isNotNull: true },
        ],
      },
      sql: "SELECT ROUND(AVG(grand_total)) FROM purchaseorders WHERE is_deleted = false AND grand_total IS NOT NULL",
    },
    {
      key: "missingOrderDate",
      title: "Missing Order Date",
      filter: { column: "order_date", isNull: true },
      thresholds: { warning: { gt: 0 } },
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE order_date IS NULL",
    },
    {
      key: "missingDueDate",
      title: "Missing Due Date",
      filter: { column: "due_date", isNull: true },
      thresholds: { warning: { gt: 0 } },
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE due_date IS NULL",
    },
  ],

  trends: [
    {
      key: "totalPOs",
      title: "Total POs",
      filter: { column: "po_number", isNotNull: true },
      thresholds: {},
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE po_number IS NOT NULL",
    },
    {
      key: "closedPOs",
      title: "Closed - Pick Complete",
      filter: { column: "status", contains: "closed" },
      thresholds: {},
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE status ILIKE '%closed%'",
    },
  ],

  dataQuality: [
    {
      key: "missing_due_date",
      title: "Missing Due Date",
      filter: {
        or: [
          { column: "due_date", isNull: true },
          { column: "due_date", equals: "" },
        ],
      },
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE due_date IS NULL",
    },
    {
      key: "missing_order_date",
      title: "Missing Order Date",
      filter: {
        or: [
          { column: "order_date", isNull: true },
          { column: "order_date", equals: "" },
        ],
      },
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE order_date IS NULL",
    },
    {
      key: "missing_reference_number",
      title: "Missing Reference Number",
      filter: {
        or: [
          { column: "reference_number", isNull: true },
          { column: "reference_number", equals: "" },
        ],
      },
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE project_number IS NULL",
    },
    {
      key: "missing_warehouse",
      title: "Missing Warehouse",
      filter: {
        or: [
          { column: "warehouse", isNull: true },
          { column: "warehouse", equals: "" },
        ],
      },
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE warehouse IS NULL",
    },
    {
      key: "missing_vendor",
      title: "Missing Vendor",
      filter: {
        or: [
          { column: "vendor_name", isNull: true },
          { column: "vendor_name", equals: "" },
        ],
      },
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE supplier IS NULL",
    },
    {
      key: "missing_grand_total",
      title: "Missing Grand Total",
      filter: {
        or: [
          { column: "grand_total", isNull: true },
          { column: "grand_total", equals: "" },
        ],
      },
      clickable: true,
      sql: "SELECT COUNT(*) FROM purchaseorders WHERE supplier IS NULL",
    },
  ],

  tiles: [],

  widgets: [
    { component: "SummaryCards", key: "tiles", group: "summary" },
    { component: "SectionCards", key: "tiles", group: "trends" },
    {
      component: "ChartBarVertical",
      key: "data_quality_chart",
      title: "Data Quality Issues",
      description: "Breakdown of validation issues found in current dataset",
      clickable: true,
      sortBy: "label-asc",
      debug: true,
    },
    {
      component: "ChartBarVertical",
      key: "status_chart",
      title: "Records by Status",
      description: "Status distribution of purchase orders in current range",
      column: "status",
      clickable: true,
      sortBy: "value-desc",
      span: 2,
      debug: true,
    },
    {
      key: "records_by_creator",
      component: "ChartDonut",
      title: "Records by Creator",
      description: "Breakdown of records grouped by created_by",
      column: "created_by",
      filterType: "creator",
      span: 2,
      debug: true,
    },
    {
      key: "po_value_by_vendor",
      component: "ChartBarHorizontal",
      title: "PO Value by Vendor",
      description: "Sum of grand_total grouped by vendor_name",
      column: "vendor_name", // 👈 group by this field
      valueField: "grand_total", // 👈 sum this field
      metric: "sum", // 👈 type of aggregation
      format: "currency-no-decimals", // 👈 optional: clean display
      filterType: "vendor_name", // 👈 enables click-to-filter
      clickable: true, // 👈 optional: can be inferred
      filter: {
        and: [{ column: "is_deleted", equals: false }],
      },
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
