import type { Filter } from "@/components/dashboard/client/data-filters";

// ✅ Toggle group for ChartAreaInteractive
export type ToggleGroup = {
  key: string;
  title: string;
  description?: string;
  fields: {
    key: string;
    label: string;
    type: string;
    color: string;
    band?: string;
  }[];
};

export type AxisConfig = boolean | { hide?: boolean; fontSize?: number; width?: number };

// ✅ Tile-level condition rules
export type Thresholds = {
  ok?: { lt?: number; gt?: number };
  warning?: { lt?: number; gt?: number };
  danger?: { lt?: number; gt?: number };
};

// ✅ Widget config block for dashboard layout
export type DashboardWidget = {
  // 🔑 Core widget info
  key: string;
  component: string;
  title?: string;
  description?: string;
  group?: string; // e.g. 'tiles', 'trends', 'summary', 'dataQuality'

  // 🎯 Filtering & interactivity
  clickable?: boolean; // Enables click-to-filter (default: false)
  noRangeFilter?: boolean  // ✅ Add this line
  filterType?: string; // e.g. 'status', 'creator', 'project_number' (used for onFilterChange)
  filter?: Filter | { and: Filter[] } | { or: Filter[] }; // Used for static filtering (rarely here)

  // 🧰 Tile values (precomputed — used by ChartBar, SummaryCards, etc.)
  tiles?: {
    key: string;
    title?: string;
    value?: number;
  }[];

  // 🧪 Data quality rules (used in ChartBar rule-based view)
  rules?: {
    key: string;
    label: string;
    filter: Filter;
  }[];

  // 📊 Charting support
  column?: string; // e.g. 'status', 'created_by' — used for grouping
  valueField?: string; // e.g. 'grand_total' — used for aggregation
  metric?: MetricType; // e.g. 'sum', 'average', 'max'
  format?: string; // e.g. 'currency-no-decimals'

  toggles?: {
    key: string;
    title: string;
    description?: string;
    filter?: Filter | { and: Filter[] } | { or: Filter[] };
    fields: {
      key: string;
      label: string;
      color?: string;
      accessor?: (row: any) => string | null | undefined;
      type?: string;
      band?: string;
    }[];
  }[];

  fields?: {
    key: string;
    label: string;
    color?: string;
    accessor?: (row: any) => string | null | undefined;
    type?: string;
    band?: string;
  }[];

  // 🎨 Display modifiers
  sortBy?: "label-asc" | "label-desc" | "value-asc" | "value-desc";
  limit?: number;
  hideLegend?: boolean;
  debug?: boolean;

  // 📐 Layout & sizing
  span?: number; // e.g. 2 = half width, 3 = one-third width — used for responsive layout
};

// ✅ Tiles for summaries, sections, and trends
export type MetricType = "count" | "sum" | "min" | "max" | "median" | "average" | "aggregation";

export type DashboardTile = {
  format?: "currency" | "number" | "percent";
  key: string;
  title: string;
  subtitle?: string;
  matchKey?: string;
  rulesKey?: string;
  value?: number | string | null;
  percent?: number;
  debug?: boolean;

  onClick?: () => void;
  onClickFilter?: (filter: Filter) => void;

  metric?: MetricType;
  field?: string;

  filter?: Filter | { and: Filter[] } | { or: Filter[] };
  percentage?: {
    numerator: Filter | { and: Filter[] };
    denominator: Filter | { and: Filter[] };
  };
  average?: {
    start: string;
    end: string;
  };

  thresholds?: Thresholds;
  trend?: string;
  direction?: "up" | "down";
  clickable?: boolean;
  noRangeFilter?: boolean;
  sql?: string;
};

// ✅ Table column schema
export type DashboardColumn = {
  accessorKey: string;
  header: string;
};

// ✅ Core async loader for any dashboard
export type DashboardFetchFunction = (range: string, from?: string, to?: string) => Promise<any>;

// ✅ Complete top-level dashboard config
export type DashboardConfig = {
  id: string;
  title: string;
  range: "3m" | "6m" | "12m";
  rowIdKey: string;

  fetchRecords: DashboardFetchFunction;
  fetchMetrics?: DashboardFetchFunction;

  filters: {
    status?: string;
    creator?: string;
    project?: string;
    issue?: boolean;
    [key: string]: string | boolean | undefined;
  };

  tiles: DashboardTile[];
  summary?: DashboardTile[];
  trends?: DashboardTile[];
  dataQuality?: DashboardTile[];
  widgets: DashboardWidget[];
  tableColumns: DashboardColumn[];
};

// ✅ Client-friendly version with prefilled dates
export type ClientDashboardConfig = Omit<DashboardConfig, "fetchRecords" | "fetchMetrics"> & {
  range: string;
  from?: string;
  to?: string;
};
