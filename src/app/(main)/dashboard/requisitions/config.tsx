/**
 * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 * ┃ 📊 CONFIG STRUCTURE — VALIDATION RULES                   
 * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 * 
 * ✅ summary[]:
 * - Required: key, title, filter or average, noRangeFilter, thresholds
 * - NEW: sql (Raw SQL string for validator comparison)
 * 
 * ✅ trends[]:
 * - Required: key, title, filter, thresholds
 * - NEW: sql
 * 
 * ✅ dataQuality[]:
 * - Required: key, column, type
 * - NEW: sql (auto-generated if type = is_null or regex)
 * 
 * ⚠️ NOTE:
 * - sql must match the tile’s frontend logic (filter or average)
 * - Do not include `expected` in config — validator calculates live
 * 
 * 🔪 This file powers both the frontend UI and the tile validator script.
 */

import { getRequisitions } from '@/app/(main)/dashboard/requisitions/_components/data'
import type { DashboardConfig } from '@/components/dashboard/types'

const chartWidgets = [
  {
    key: 'requisition_trends',
    component: 'ChartAreaInteractive',
    title: 'Requisition Trends',
    group: 'timeline',
    toggles: [
      {
        key: 'created_vs_due',
        title: 'Created vs Due - Dynamic',
        fields: [
          { key: 'created', label: 'Created', type: 'created', color: 'var(--chart-1)' },
          { key: 'due', label: 'Due', type: 'due', color: 'var(--chart-2)' },
        ]
      },
      {
        key: 'lateness_breakdown',
        title: 'Lateness Breakdown',
        description: 'Tracks how overdue items are, grouped by when they were due',
        fields: [
          { key: 'late_1_7', label: '1–7 days late', type: 'lateness', band: '1-7', color: 'var(--chart-1)' },
          { key: 'late_8_30', label: '8–30 days late', type: 'lateness', band: '8-30', color: 'var(--chart-2)' },
          { key: 'late_30_plus', label: '30+ days late', type: 'lateness', band: '30+', color: 'var(--chart-3)' },
        ]
      }
    ]
  }
]


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
  filter: { column: 'requisition_order_number', isNotNull: true }, // ✅ cleaner than fudge
  clickable: true,
  noRangeFilter: true,
  sql: "SELECT COUNT(*) FROM requisitions"
},
  {
    key: 'issued',
    title: 'Issued',
    subtitle: 'All Time',
    filter: { column: 'status', contains: 'issued' },
    thresholds: {},
    clickable: true,
    noRangeFilter: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE status ILIKE '%issued%'"
  },
  {
    key: 'inProgress',
    title: 'In Progress',
    subtitle: 'All Time',
    filter: { column: 'status', contains: 'in progress' },
    thresholds: {},
    clickable: true,
    noRangeFilter: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE status ILIKE '%in progress%'"
  },
  {
    key: 'completed',
    title: 'Completed',
    subtitle: 'All Time',
    filter: { column: 'status', contains: 'complete' },
    thresholds: {},
    clickable: true,
    noRangeFilter: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE status ILIKE '%complete%'"
  },
  {
    key: 'cancelled',
    title: 'Cancelled',
    subtitle: 'All Time',
    filter: { column: 'status', contains: 'cancel' },
    thresholds: {},
    clickable: true,
    noRangeFilter: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE status ILIKE '%cancel%'"
  },
  {
    key: 'late',
    title: 'Late',
    subtitle: 'All Time',
    filter: {
      and: [
        { column: 'due_date', lt: new Date().toISOString().split('T')[0] },
        {
          and: [
            { column: 'status', notContains: 'complete' },
            { column: 'status', notContains: 'cancel' },
          ],
        },
      ],
    },
    thresholds: { danger: { gt: 0 } },
    clickable: true,
    noRangeFilter: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE due_date < CURRENT_DATE AND status NOT ILIKE '%complete%' AND status NOT ILIKE '%cancel%'"
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
    clickable: true,
    noRangeFilter: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE order_date < '2025-01-31' AND (status ILIKE '%issued%' OR status ILIKE '%in progress%')"
  },
  {
  key: 'avgTimeToClose',
  title: 'Avg Time to Close',
  subtitle: 'Days between Order & Due',
  average: {
    start: 'order_date',
    end: 'due_date',
  },
  filter: {
    and: [
      { column: 'order_date', isNotNull: true },
      { column: 'due_date', isNotNull: true }
    ]
  },
  thresholds: {
    warning: { gt: 7 },
    danger: { gt: 14 },
  },
  clickable: false,
  noRangeFilter: true,
  sql: "SELECT ROUND(AVG(DATE_PART('day', due_date - order_date))) FROM requisitions WHERE order_date IS NOT NULL AND due_date IS NOT NULL"
}
],

  trends: [
    {
      key: 'totalReqs',
      title: 'Total Reqs',
      filter: { column: 'requisition_order_number', isNotNull: true  },
      thresholds: {},
      clickable: true,
      sql: "SELECT COUNT(*) FROM requisitions WHERE status IS NOT NULL"
    },
    {
      key: 'closedReqs',
      title: 'Closed - Pick Complete',
      filter: { column: 'status', contains: 'closed' },
      thresholds: {},
      clickable: true,
      sql: "SELECT COUNT(*) FROM requisitions WHERE status ILIKE '%closed%'"
    },
    {
      key: 'missingOrderDate',
      title: 'Missing Order Date',
      filter: { column: 'order_date', isNull: true },
      thresholds: { warning: { gt: 0 } },
      clickable: true,
      sql: "SELECT COUNT(*) FROM requisitions WHERE order_date IS NULL"
    },
    {
      key: 'missingDueDate',
      title: 'Missing Due Date',
      filter: { column: 'due_date', isNull: true },
      thresholds: { warning: { gt: 0 } },
      clickable: true,
      sql: "SELECT COUNT(*) FROM requisitions WHERE due_date IS NULL"
    }
  ],

  dataQuality: [
    {
      key: 'missing_due_date',
      label: 'Missing Due Date',
      column: 'due_date',
      type: 'is_null',
      rulesKey: 'default',
      sql: "SELECT COUNT(*) FROM requisitions WHERE due_date IS NULL"
    },
    {
      key: 'missing_order_date',
      label: 'Missing Order Date',
      column: 'order_date',
      type: 'is_null',
      rulesKey: 'default',
      sql: "SELECT COUNT(*) FROM requisitions WHERE order_date IS NULL"
    },
    {
      key: 'missing_created_by',
      label: 'Missing Created By',
      column: 'created_by',
      type: 'is_null',
      rulesKey: 'default',
      sql: "SELECT COUNT(*) FROM requisitions WHERE created_by IS NULL"
    },
    {
      key: 'missing_project_number',
      label: 'Missing Project Number',
      column: 'project_number',
      type: 'is_null',
      rulesKey: 'default',
      sql: "SELECT COUNT(*) FROM requisitions WHERE project_number IS NULL"
    },
    {
      key: 'missing_warehouse',
      label: 'Missing Warehouse',
      column: 'warehouse',
      type: 'is_null',
      rulesKey: 'default',
      sql: "SELECT COUNT(*) FROM requisitions WHERE warehouse IS NULL"
    },
    {
      key: 'invalid_requisition_order_number',
      label: 'Invalid Requisition Order Number',
      column: 'requisition_order_number',
      type: 'regex',
      rulesKey: 'default',
      pattern: "^LUT[-/]REQ[-/](BP1|BP2|AMC|AM|BDI|CCW|RTZ|BC)[-/]([\\d\\-]+)[-/](\\d{2})[-/](\\d{2}|\\d{4})(?:-\\d{1,3})?$",
      sql: "SELECT COUNT(*) FROM requisitions WHERE requisition_order_number IS NOT NULL AND requisition_order_number !~ '^LUT[-/]REQ[-/](BP1|BP2|AMC|AM|BDI|CCW|RTZ|BC)[-/]([\\d\\-]+)[-/](\\d{2})[-/](\\d{2}|\\d{4})(?:-\\d{1,3})?$'"
    }
  ],

  tiles: [],

  widgets: [
    { component: 'SummaryCards', key: 'tiles', group: 'summary' },
    { component: 'SectionCards', key: 'tiles', group: 'trends' },
     ...chartWidgets,
    {
  component: 'ChartBarVertical',
  key: 'data_quality_chart',
  title: 'Data Quality Issues',
  description: 'Breakdown of validation issues found in current dataset',
  layout: 'vertical', // ✅ NEW
  rulesKey: 'default',
  clickable: true,
  sortBy: 'label-asc',
  debug: true
},
{
  component: 'ChartBarVertical',
  key: 'status_chart',
  title: 'Records by Status',
  description: 'Status distribution of requisitions in current range',
  column: 'status',
  clickable: true,
  sortBy: 'value-desc',
  span: 2,
  debug: true
},
{
  key: 'records_by_creator',
  component: 'ChartDonut',
  title: 'Records by Creator',
  description: 'Breakdown of records grouped by created_by',
  column: 'created_by',       // this replaces hardcoded accessor logic
  filterType: 'creator',
  span: 2,
  debug: true,                // optional: for console logs
},
{
  key: 'records_by_project',
  component: 'ChartBarHorizontal', // still pointing to ChartBarVertical for now
  title: 'Records by Project',
  description: 'Breakdown by project_number',
  column: 'project_number',
  filterType: 'project_number',
  debug: true,
},

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
};