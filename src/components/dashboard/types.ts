export type DashboardWidget = {
  component: string
  filterType?: string
  key?: string
  group?: string // ✅ Added to support grouped tiles (e.g. 'summary', 'trends')
}

export type TileCondition =
  | {
      column: string
      eq?: string | number
      contains?: string
        not_contains?: string // ✅ Add this line
      lt?: number | string
      gt?: number | string
      isNull?: boolean
    }
  | { and: TileCondition[] }
  | { or: TileCondition[] }

export type TileFilter = TileCondition

export type Thresholds = {
  ok?: { lt?: number; gt?: number }
  warning?: { lt?: number; gt?: number }
  danger?: { lt?: number; gt?: number }
}

export type DashboardTile = {
  key: string
  title: string
  subtitle?: string
  value?: number | string | null
  filter?: TileFilter
  percentage?: {
    numerator: TileFilter
    denominator: TileFilter
  }
  average?: {
    start: string
    end: string
  }
  thresholds?: Thresholds
  matchKey?: string
}

export type DashboardColumn = {
  accessorKey: string
  header: string
}

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
}

export type DashboardConfig = {
  id: string
  title: string
  range: '3m' | '6m' | '12m'
  rowIdKey: string

  fetchRecords: (range: string) => Promise<any[]>
  fetchMetrics: (range: string) => Promise<any>

  filters: {
    status?: string
    creator?: string
    project?: string
    issue?: boolean
    [key: string]: string | boolean | undefined
  }

  tiles: DashboardTile[]
  summary?: DashboardTile[] // ✅ Now allowed as part of config
  trends?: DashboardTile[]  // ✅ Now allowed as part of config
  dataQuality?: DataQualityRule[] // ✅ Optional data quality definitions

  widgets: DashboardWidget[]
  tableColumns: DashboardColumn[]
}

export type ClientDashboardConfig = Omit<DashboardConfig, 'fetchRecords' | 'fetchMetrics'>
