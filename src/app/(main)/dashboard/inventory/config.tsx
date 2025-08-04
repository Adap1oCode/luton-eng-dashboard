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

import { getInventory } from '@/app/(main)/dashboard/inventory/_components/data'
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
        title: 'Created vs Due',
        fields: [
          { key: 'created', label: 'Created', type: 'created', color: 'var(--chart-1)' },
          { key: 'due', label: 'Due', type: 'due', color: 'var(--chart-2)' },
        ]
      },
      {
  key: 'lateness_breakdown',
  title: 'Lateness',
  description: 'Tracks how overdue items are, grouped by when they were due',
  filter: {
    and: [
      { column: 'due_date', lt: new Date().toISOString().split('T')[0] }, // past due
      { column: 'due_date', isNotNull: true },
      { column: 'due_date', notEquals: '' },
      { column: 'status', isNotNull: true },
      {
        and: [
          { column: 'status', notContains: 'complete' },
          { column: 'status', notContains: 'cancel' },
        ]
      }
    ]
  },
  fields: [
    { key: 'late_1_7', label: '1–7 days late', type: 'lateness', band: '1-7', color: 'var(--chart-1)' },
    { key: 'late_8_30', label: '8–30 days late', type: 'lateness', band: '8-30', color: 'var(--chart-2)' },
    { key: 'late_30_plus', label: '30+ days late', type: 'lateness', band: '30+', color: 'var(--chart-3)' },
  ]
}

    ]
  }
]


// 📁 src/app/(main)/dashboard/inventory/config.tsx

export const inventoryConfig: DashboardConfig = {
  id: 'inventory',
  title: 'Inventory Dashboard',
  range: '3m',
  rowIdKey: 'item_number',
  fetchRecords: getInventory,

  filters: {
    issue: true,
    project: 'location',
    creator: 'manufacturer',
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
    filter: { column: 'status', contains: 'issue' },
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
      key: 'missingOrderDate',
      title: 'Missing Order Date',
filter: {
  and: [
    {
      or: [
        { column: 'order_date', isNull: true },
        { column: 'order_date', equals: '' },
      ],
    },
    {
      and: [
        { column: 'status', notContains: 'complete' },
        { column: 'status', notContains: 'cancel' },
      ],
    },
  ],
},
      thresholds: { warning: { gt: 0 } },
      clickable: true,
      noRangeFilter: true,

      sql: "SELECT COUNT(*) FROM requisitions WHERE order_date IS NULL"
    },
    {
      key: 'missingDueDate',
      title: 'Missing Due Date',
      filter: {
  and: [
    {
      or: [
        { column: 'due_date', isNull: true },
        { column: 'due_date', equals: '' },
      ],
    },
    {
      and: [
        { column: 'status', notContains: 'complete' },
        { column: 'status', notContains: 'cancel' },
      ],
    },
  ],
},
      thresholds: { warning: { gt: 0 } },
      clickable: true,
      noRangeFilter: true,

      sql: "SELECT COUNT(*) FROM requisitions WHERE due_date IS NULL"
    },
{
  key: 'late',
  title: 'Late',
  subtitle: 'All Time',
  filter: {
    and: [
      { column: 'due_date', lt: new Date().toISOString().split('T')[0] },
      { column: 'status', isNotNull: true },
      { column: 'due_date', isNotNull: true },
      { column: 'due_date', notEquals: '' },
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
  sql: "SELECT COUNT(*) FROM requisitions WHERE due_date < CURRENT_DATE AND status NOT ILIKE '%complete%' AND status NOT ILIKE '%cancel%' AND status IS NOT NULL"
},
  {
    key: 'old_open_reqs',
    title: 'Previous Requistions',
    subtitle: 'All Time',
    filter: {
      and: [
        { column: 'order_date', lt: '2025-01-31' },
        { column: 'due_date', isNotNull: true },
        { column: 'due_date', notEquals: '' },
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
  ],

dataQuality: [
  {
    key: 'missing_due_date',
    title: 'Missing Due Date',
filter: {
  or: [
    { column: 'due_date', isNull: true },
    { column: 'due_date', equals: '' }
  ]
},
    clickable: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE due_date IS NULL"
  },
  {
    key: 'missing_order_date',
    title: 'Missing Order Date',
filter: {
  or: [
    { column: 'order_date', isNull: true },
    { column: 'order_date', equals: '' }
  ]
},
    clickable: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE order_date IS NULL"
  },
  {
    key: 'missing_created_by',
    title: 'Missing Created By',
    filter: {
  or: [
    { column: 'created_by', isNull: true },
    { column: 'created_by', equals: '' }
  ]
},
    clickable: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE created_by IS NULL"
  },
  {
    key: 'missing_project_number',
    title: 'Missing Project Number',
    filter: {
  or: [
    { column: 'project_number', isNull: true },
    { column: 'project_number', equals: '' }
  ]
},
    clickable: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE project_number IS NULL"
  },
  {
    key: 'missing_warehouse',
    title: 'Missing Warehouse',
    filter: {
  or: [
    { column: 'warehouse', isNull: true },
    { column: 'warehouse', equals: '' }
  ]
},
    clickable: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE warehouse IS NULL"
  },
  {
    key: 'invalid_requisition_order_number',
    title: 'Invalid Requisition Order Number',
    filter: {
      column: 'requisition_order_number',
      notMatches: "^LUT[-/]REQ[-/](BP1|BP2|AMC|AM|BDI|CCW|RTZ|BC)[-/]([\\d\\-]+)[-/](\\d{2})[-/](\\d{2}|\\d{4})(?:-\\d{1,3})?$"
    },
    clickable: true,
    sql: "SELECT COUNT(*) FROM requisitions WHERE requisition_order_number IS NOT NULL AND requisition_order_number !~ '^LUT[-/]REQ[-/](BP1|BP2|AMC|AM|BDI|CCW|RTZ|BC)[-/]([\\d\\-]+)[-/](\\d{2})[-/](\\d{2}|\\d{4})(?:-\\d{1,3})?$'"
  }
],


  tiles: [],

  widgets: [
  { component: 'SummaryCards', key: 'tiles', group: 'summary' },
  {
  component: 'ChartBarVertical',
  key: 'data_quality_chart',
  group: 'dataQuality',
  title: 'Data Quality Issues',
  description: 'Breakdown of validation issues found in current dataset',
  clickable: true,
  sortBy: 'label-asc',
  debug: true
},
{
  component: 'ChartBarVertical',
  key: 'status_chart',
  title: 'Records by Stocking Unit',
  description: 'Status distribution of requisitions in current range',
  column: 'stocking_unit', // this replaces hardcoded accessor logic
  clickable: true,
  sortBy: 'value-desc',
  span: 2,
  debug: true
},
{
  key: 'records_by_warehouse',
  component: 'ChartDonut',
  title: 'Records by Warehouse',
  description: 'Breakdown of records grouped by created_by',
  column: 'warehouse',       // this replaces hardcoded accessor logic
  filterType: 'warehouse',
  span: 2,
  debug: true,                // optional: for console logs
},
{
  key: 'records_by_category',
  component: 'ChartBarHorizontal', // still pointing to ChartBarVertical for now
  title: 'Records by Category',
  description: 'Breakdown by category',
  column: 'category',
  filterType: 'category',
  debug: true,
},

  ],

  tableColumns: [
    { accessorKey: 'item_number', header: 'Item Number' },
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'total_availabe', header: 'Total Available' },
    { accessorKey: 'item_cost', header: 'cost' },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'stocking_unit', header: 'Stocking Unit' },
    { accessorKey: 'location', header: 'Location' },
    { accessorKey: 'warehouse', header: 'Warehouse' },
  ],
};