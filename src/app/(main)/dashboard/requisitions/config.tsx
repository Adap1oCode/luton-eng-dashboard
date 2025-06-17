import { getRequisitions } from '@/app/(main)/dashboard/requisitions/_components/data'
import type { DashboardConfig } from '@/components/dashboard/types'

export const requisitionsConfig: DashboardConfig = {
  id: 'requisitions',
  title: 'Requisitions Dashboard',
  range: '3m',
  rowIdKey: 'requisition_order_number',

  fetchRecords: getRequisitions,

  filters: {
    status: 'status',
    creator: 'created_by',
    project: 'project_number',
    issue: true,
  },

  summary: [
{
  key: 'totalAllTime',
  title: 'Total Requisitions',
  subtitle: 'All Time',
  matchKey: 'totalAllTime',
  filter: { column: 'status', isNull: false },
  thresholds: {},
  noRangeFilter: true,
},

    {
      key: 'issued',
      title: 'Issued',
      subtitle: 'All Time',
      filter: { column: 'status', contains: 'issued' },
      thresholds: {},
      clickFilter: { type: 'status', value: 'issued' },
      noRangeFilter: true,
    },
    {
      key: 'inProgress',
      title: 'In Progress',
      subtitle: 'All Time',
      filter: { column: 'status', contains: 'in progress' },
      thresholds: {},
      clickFilter: { type: 'status', value: 'in progress' },
      noRangeFilter: true,
    },
    {
      key: 'completed',
      title: 'Completed',
      subtitle: 'All Time',
      filter: { column: 'status', contains: 'complete' },
      thresholds: {},
      clickFilter: { type: 'status', value: 'complete' },
      noRangeFilter: true,
    },
    {
      key: 'cancelled',
      title: 'Cancelled',
      subtitle: 'All Time',
      filter: { column: 'status', contains: 'cancel' },
      thresholds: {},
      clickFilter: { type: 'status', value: 'cancel' },
      noRangeFilter: true,
    },
    {
      key: 'late',
      title: 'Late',
      subtitle: 'All Time',
      filter: {
        and: [
          { column: 'due_date', lt: new Date().toISOString().split('T')[0] },
          {
            or: [
              { column: 'status', not_contains: 'complete' },
              { column: 'status', not_contains: 'cancel' },
            ],
          },
        ],
      },
      thresholds: { danger: { gt: 0 } },
      clickFilter: { type: 'status', value: 'late' },
      noRangeFilter: true,
    },
    {
      key: 'old_open_reqs',
      title: 'Previous Requistions',
      subtitle: 'All Time',
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
      thresholds: { danger: { gt: 0 } },
      noRangeFilter: true,
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
      noRangeFilter: true,
    },
  ],

  trends: [
    {
      key: 'totalReqs',
      title: 'Total Reqs',
      filter: { column: 'status', isNull: false },
      thresholds: {},
      clickFilter: { type: 'status', value: 'all' },
    },
    {
      key: 'closedReqs',
      title: 'Closed - Pick Complete',
      filter: { column: 'status', contains: 'closed' },
      thresholds: {},
      clickFilter: { type: 'status', value: 'closed' },
    },
    {
      key: 'missingOrderDate',
      title: 'Missing Order Date',
      filter: { column: 'order_date', isNull: true },
      thresholds: { warning: { gt: 0 } },
      clickFilter: { type: 'issue', value: 'missing_order_date' },
    },
    {
      key: 'missingDueDate',
      title: 'Missing Due Date',
      filter: { column: 'due_date', isNull: true },
      thresholds: { warning: { gt: 0 } },
      clickFilter: { type: 'issue', value: 'missing_due_date' },
    },
  ],

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

  tiles: [],

  widgets: [
    { component: 'SummaryCards', key: 'tiles', group: 'summary' },
    { component: 'SectionCards', key: 'tiles', group: 'trends' },
    { component: 'ChartAreaInteractive' },
    { component: 'ChartMissingData', filterType: 'issue' },
    { component: 'ChartByStatus', filterType: 'status' },
    { component: 'ChartByCreator', filterType: 'creator' },
    { component: 'ChartByProject', filterType: 'project' },
  ],

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
