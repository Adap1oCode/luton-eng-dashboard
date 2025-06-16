import { getRequisitionMetrics, getRequisitions } from '@/app/(main)/dashboard/requisitions/_components/data'
import type { DashboardConfig } from '@/components/dashboard/types'

export const requisitionsConfig: DashboardConfig = {
  // Basic Config
  id: 'requisitions',
  title: 'Requisitions Dashboard',
  range: '12m',
  rowIdKey: 'requisition_order_number',

  // Data Sources
  fetchRecords: getRequisitions,
  fetchMetrics: getRequisitionMetrics,

  // Filter Mapping
  filters: {
    status: 'status',
    creator: 'created_by',
    project: 'project_number',
    issue: true,
  },

  // Summary Tiles (Top-Level Metrics)
  summary: [
  {
    key: 'totalAllTime',
    title: 'Total Requisitions',
    subtitle: 'All Time',
    matchKey: 'totalAllTime',
  },
  {
    key: 'issued',
    title: 'Issued',
    subtitle: 'Current',
    matchKey: 'issued',
  },
  {
    key: 'inProgress',
    title: 'In Progress',
    subtitle: 'Current',
    matchKey: 'inProgress',
  },
  {
    key: 'completed',
    title: 'Completed',
    subtitle: 'Current',
    matchKey: 'completed',
  },
  {
    key: 'cancelled',
    title: 'Cancelled',
    subtitle: 'Current',
    matchKey: 'cancelled',
  },
  {
    key: 'late',
    title: 'Late',
    subtitle: 'Due date passed',
    filter: {
      and: [
        { column: 'due_date', lt: new Date().toISOString().split('T')[0] },
        {
          or: [
            { column: 'status', not_contains: 'complete' },
            { column: 'status', not_contains: 'cancelled' },
          ],
        },
      ],
    },
    thresholds: {
      danger: { gt: 0 },
    },
  },
  {
    key: 'old_open_reqs',
    title: 'Old Open Reqs',
    subtitle: 'Created before 31 Jan 2025',
    filter: {
      and: [
        { column: 'order_date', lt: '2025-01-31' },
        {
          or: [
            { column: 'status', contains: 'issued' },
            { column: 'status', contains: 'in progress' },
          ],
        },
      ],
    },
    thresholds: {
      danger: { gt: 0 },
    },
  },
  {
    key: 'avgTimeToClose',
    title: 'Avg Time to Close',
    subtitle: 'Days between Order & Due',
    average: {
      start: 'order_date',
      end: 'due_date',
    },
    thresholds: {
      warning: { gt: 7 },
      danger: { gt: 14 },
    },
  },
],

  // Trend Cards (SectionCards)
  trends: [
    { key: 'totalReqs', title: 'Total Reqs' },
    { key: 'closedReqs', title: 'Closed - Pick Complete' },
    { key: 'missingOrderDate', title: 'Missing Order Date' },
    { key: 'missingDueDate', title: 'Missing Due Date' },
  ],

  // Data Quality Checks (used in ChartMissingData)
  dataQuality: [
    {
      key: 'missing_due_date',
      label: 'Missing Due Date',
      column: 'due_date',
      type: 'is_null',
    },
    {
      key: 'missing_order_date',
      label: 'Missing Order Date',
      column: 'order_date',
      type: 'is_null',
    },
    {
      key: 'missing_created_by',
      label: 'Missing Created By',
      column: 'created_by',
      type: 'is_null',
    },
    {
      key: 'missing_project_number',
      label: 'Missing Project Number',
      column: 'project_number',
      type: 'is_null',
    },
    {
      key: 'missing_warehouse',
      label: 'Missing Warehouse',
      column: 'warehouse',
      type: 'is_null',
    },
    {
      key: 'invalid_requisition_order_number',
      label: 'Invalid Requisition Order Number',
      column: 'requisition_order_number',
      type: 'regex',
      pattern:
        '^LUT[-/]REQ[-/](BP1|BP2|AMC|AM|BDI|CCW|RTZ|BC)[-/]([\\d\\-]+)[-/](\\d{2})[-/](\\d{2}|\\d{4})(?:-\\d{1,3})?$',
    },
  ],

  // Tile Overrides (currently unused but placeholder)
  tiles: [],

  // Widget Components
  widgets: [
    { component: 'SummaryCards', key: 'tiles', group: 'summary' },
    { component: 'SectionCards', key: 'tiles', group: 'trends' },
    { component: 'ChartAreaInteractive' },
    { component: 'ChartMissingData', filterType: 'issue' },
    { component: 'ChartByStatus', filterType: 'status' },
    { component: 'ChartByCreator', filterType: 'creator' },
    { component: 'ChartByProject', filterType: 'project' },
  ],

  // Table Columns
  tableColumns: [
    { accessorKey: 'requisition_order_number', header: 'Req Number' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'created_by', header: 'Created By' },
    { accessorKey: 'project_number', header: 'Project' },
    { accessorKey: 'order_date', header: 'Order Date' },
    { accessorKey: 'due_date', header: 'Due Date' },
    { accessorKey: 'warehouse', header: 'Warehouse' },
  ],
}
