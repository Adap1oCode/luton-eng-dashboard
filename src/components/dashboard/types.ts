import type { Filter } from '@/components/dashboard/client/data-filters'

// ✅ Toggle group for ChartAreaInteractive
export type ToggleGroup = {
  key: string
  title: string
  description?: string
  fields: {
    key: string
    label: string
    type: string
    color: string
    band?: string
  }[]
}

export type AxisConfig = boolean | { hide?: boolean; fontSize?: number; width?: number }

// ✅ Tile-level condition rules



export type Thresholds = {
  ok?: { lt?: number; gt?: number }
  warning?: { lt?: number; gt?: number }
  danger?: { lt?: number; gt?: number }
}

// ✅ Widget config block for dashboard layout
export type DashboardWidget = {
  // 🔑 Core widget info
  key?: string
  component: string
  title?: string
  description?: string
  group?: string // e.g. 'tiles', 'trends', 'summary'

  // 🎯 Filtering & interactivity
  filterType?: string      // e.g. 'status', 'creator'
  clickable?: boolean      // Enables click-to-filter (default: false)
  filter?: Filter | { and: Filter[] } | { or: Filter[] } // ✅ NEW

  // 📐 Layout & sizing
  layout?: 'horizontal' | 'vertical'
  span?: number

  // 🧪 Data quality rules (for validation charts)
  rulesKey?: string
  column?: string
  rules?: any[]

  // 🧰 Advanced chart features
  toggles?: ToggleGroup[]
  fields?: {
    key: string
    label: string
    color?: string
    accessor?: (row: any) => string | null | undefined
    type?: string
    band?: string
    
  }[]

  // 🎨 Display modifiers
  sortBy?: 'label-asc' | 'label-desc' | 'value-asc' | 'value-desc'
  limit?: number
  hideLegend?: boolean
  debug?: boolean
}

// ✅ Tiles for summaries, sections, and trends
export type DashboardTile = {
  key: string
  title: string
  subtitle?: string
  matchKey?: string
  value?: number | string | null
  percent?: number // ✅ Add this line
    debug?: boolean

  onClick?: () => void
  onClickFilter?: (filter: Filter) => void


  filter?: Filter | { and: Filter[] } | { or: Filter[] }
  percentage?: {
    numerator: Filter | { and: Filter[] }
    denominator: Filter | { and: Filter[] }
  }
  average?: {
    start: string
    end: string
  }

  thresholds?: Thresholds
  trend?: string
  direction?: 'up' | 'down'
  clickable?: boolean
  noRangeFilter?: boolean
  sql?: string
}

// ✅ Table column schema
export type DashboardColumn = {
  accessorKey: string
  header: string
}

// ✅ Rules used in data quality charts
export type DataQualityRule = {
  key: string
  label: string
  column: string
  type:
    | 'is_null'
    | 'is_not_null'
    | 'regex'
    | 'equals'
    | 'not_equals'
    | 'gt'
    | 'lt'
    | 'gte'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'contains'
    | 'not_contains'
  value?: any
  pattern?: string
  sql?: string
  rulesKey?: string
}

// ✅ Core async loader for any dashboard
export type DashboardFetchFunction = (
  range: string,
  from?: string,
  to?: string
) => Promise<any>

// ✅ Complete top-level dashboard config
export type DashboardConfig = {
  id: string
  title: string
  range: '3m' | '6m' | '12m'
  rowIdKey: string

  fetchRecords: DashboardFetchFunction
  fetchMetrics?: DashboardFetchFunction

  filters: {
    status?: string
    creator?: string
    project?: string
    issue?: boolean
    [key: string]: string | boolean | undefined
  }

  tiles: DashboardTile[]
  summary?: DashboardTile[]
  trends?: DashboardTile[]
  dataQuality?: DataQualityRule[]

  widgets: DashboardWidget[]
  tableColumns: DashboardColumn[]
}

// ✅ Client-friendly version with prefilled dates
export type ClientDashboardConfig = Omit<
  DashboardConfig,
  'fetchRecords' | 'fetchMetrics'
> & {
  range: string
  from?: string
  to?: string
}
