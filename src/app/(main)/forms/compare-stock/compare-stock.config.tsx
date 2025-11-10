import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import type { ToolbarConfig, ActionConfig } from "@/components/forms/shell/toolbar/types";
import type { BaseViewConfig, TColumnDef } from "@/components/data-table/view-defaults";

export type QuickFilter = {
  id: string;
  label: string;
  type: "text" | "enum" | "boolean" | "date";
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

export type CompareStockRow = {
  id: string;
  row_key: string;
  tally_card: string | null;
  item_number: string | null;
  warehouse: string | null;
  location: string | null;
  ims_location: string | null;
  so_qty: string | null;
  ims_qty: string | null;
  qty_diff: string | null;
  multi_location: boolean;
  status: string | null;
};

const ROUTE_SEGMENT = "compare-stock" as const;
const API_ENDPOINT = "/api/compare-stock" as const;
export const RESOURCE_KEY = "v_tcm_compare_stock" as const;
export const RESOURCE_TITLE = "Compare Stock" as const;
const PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;

// -----------------------------------------------------------------------------
// Filter Logic
// -----------------------------------------------------------------------------
/**
 * Status filter → query parameter mapping.
 */
export function statusFilterToQuery(status: string): Record<string, any> {
  if (status === "ALL") return {};
  // Filter by status (exact match, case-insensitive)
  return { status: status };
}

export type QuickFilterMeta = {
  id: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

export const compareStockFilterMeta: QuickFilterMeta[] = [
  {
    id: "status",
    toQueryParam: statusFilterToQuery,
  },
];

// -----------------------------------------------------------------------------
// Quick Filters
// -----------------------------------------------------------------------------
export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "ALL", label: "All statuses" },
      { value: "Exact Match", label: "Exact Match" },
      { value: "No Match", label: "No Match" },
      { value: "Quantity Mismatch", label: "Quantity Mismatch" },
      { value: "Location Mismatch", label: "Location Mismatch" },
    ],
    defaultValue: "ALL",
    toQueryParam: statusFilterToQuery,
  },
];

function renderNumber(value: string | null): React.ReactNode {
  const normalized = value?.trim() ?? "";
  if (normalized === "" || normalized === "--" || normalized === "—" || normalized === "null" || normalized === "undefined") {
    return (
      <Badge variant="destructive" className="px-2 py-1 text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-800">
        --
      </Badge>
    );
  }
  return <span>{value}</span>;
}

function renderLocation(value: string | null): React.ReactNode {
  const normalized = value?.trim() ?? "";
  if (normalized === "" || normalized === "--" || normalized === "—" || normalized === "null" || normalized === "undefined") {
    return (
      <Badge variant="destructive" className="px-2 py-1 text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-800">
        --
      </Badge>
    );
  }
  return <span>{value}</span>;
}

export function buildColumns(onItemNumberClick?: (itemNumber: string | number | null) => void): TColumnDef<CompareStockRow>[] {
  return [
    {
      id: "row_key",
      accessorKey: "row_key",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: true,
      size: 0,
      meta: { routingOnly: true },
    },
    {
      id: "tally_card",
      accessorKey: "tally_card",
      header: "Tally Card",
      cell: ({ row }) => {
        const value = row.getValue<string | null>("tally_card");
        const multiLocation = row.original.multi_location;
        
        if (!value) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <span>{value}</span>
            {multiLocation && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-100 dark:border-orange-800 px-1.5 py-0.5 text-xs font-medium shrink-0">
                MULTI
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
      size: 160,
    },
    {
      id: "item_number",
      accessorKey: "item_number",
      header: "Item Number",
      cell: ({ row }) => {
        const value = row.getValue<string | null>("item_number");
        if (!value) {
          return <span className="text-muted-foreground">—</span>;
        }
        if (onItemNumberClick) {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onItemNumberClick(value);
              }}
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-300 dark:hover:text-blue-200 cursor-pointer"
            >
              {value}
            </button>
          );
        }
        return <span>{value}</span>;
      },
      enableSorting: false,
      size: 160,
    },
    {
      id: "location",
      accessorKey: "location",
      header: "TC Location",
      cell: ({ row }) => renderLocation(row.original.location ?? null),
      enableSorting: false,
      size: 140,
    },
    {
      id: "ims_location",
      accessorKey: "ims_location",
      header: "IMS Location",
      cell: ({ row }) => renderLocation(row.original.ims_location ?? null),
      enableSorting: false,
      size: 140,
    },
    {
      id: "so_qty",
      accessorKey: "so_qty",
      header: "TC Qty",
      cell: ({ row }) => renderNumber(row.original.so_qty ?? null),
      enableSorting: false,
      size: 120,
    },
    {
      id: "ims_qty",
      accessorKey: "ims_qty",
      header: "IMS Qty",
      cell: ({ row }) => renderNumber(row.original.ims_qty ?? null),
      enableSorting: false,
      size: 120,
    },
    {
      id: "qty_diff",
      accessorKey: "qty_diff",
      header: "Diff",
      cell: ({ row }) => {
        const value = row.getValue<string | null>("qty_diff");
        const numValue = value != null && value !== "" ? Number(value) : null;
        
        if (numValue === null || isNaN(numValue)) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        const displayValue = numValue.toLocaleString();
        const sign = numValue > 0 ? "+" : "";
        
        // 0 = green, negative = red, positive = amber/yellow
        let badgeVariant: "default" | "destructive" | "secondary" = "default";
        let badgeClassName = "";
        
        if (numValue === 0) {
          badgeVariant = "default";
          badgeClassName = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-100 dark:border-green-800";
        } else if (numValue < 0) {
          badgeVariant = "destructive";
          badgeClassName = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-800";
        } else {
          badgeVariant = "secondary";
          badgeClassName = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-800";
        }
        
        return (
          <Badge variant={badgeVariant} className={`px-2 py-1 text-xs ${badgeClassName}`}>
            {sign}{displayValue}
          </Badge>
        );
      },
      enableSorting: false,
      size: 120,
    },
    {
      id: "compare_status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const value = row.original.status as string | null;
        
        if (!value) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        const normalized = value.trim().toLowerCase();
        const normalizedDisplay = value.trim();
        
        let badgeVariant: "default" | "destructive" | "secondary" = "default";
        let badgeClassName = "";
        
        if (normalized === "exact match") {
          badgeVariant = "default";
          badgeClassName = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-100 dark:border-green-800";
        } else if (normalized === "no match") {
          badgeVariant = "destructive";
          badgeClassName = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-800";
        } else if (normalized === "qty mismatch" || normalized === "quantity mismatch" || normalized === "location mismatch") {
          badgeVariant = "secondary";
          badgeClassName = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-800";
        } else {
          badgeVariant = "secondary";
        }
        
        return (
          <Badge variant={badgeVariant} className={`px-2 py-1 text-xs ${badgeClassName}`}>
            {normalizedDisplay}
          </Badge>
        );
      },
      enableSorting: false,
      size: 180,
    },
  ];
}

// Create a default buildColumns that matches BaseViewConfig signature
const defaultBuildColumns = () => buildColumns();

export const compareStockViewConfig: BaseViewConfig<CompareStockRow> & { apiEndpoint?: string } = {
  resourceKeyForDelete: RESOURCE_KEY,
  formsRouteSegment: ROUTE_SEGMENT,
  idField: "row_key",
  apiEndpoint: API_ENDPOINT, // VIEW endpoint for list/view-all screen
  toolbar: {
    left: undefined,
    right: [],
  },
  quickFilters: quickFilters,
  features: {
    rowSelection: false,
    pagination: true,
    sortable: false,
  },
  buildColumns: defaultBuildColumns,
  // Hide Views and Save View buttons in bottom toolbar
  bottomToolbarButtons: {
    views: false,
    saveView: false,
    // Keep other buttons visible (columns, sort, moreFilters)
    columns: true,
    sort: false,
    moreFilters: true,
  },
};

export const compareStockToolbar: ToolbarConfig = {
  left: [],
  right: [
    {
      id: "export",
      label: "Export CSV",
      icon: "Download",
      variant: "outline",
      onClickId: "exportCsv",
      requiredAny: [`${PERMISSION_PREFIX}:export`],
    },
  ],
};

export const compareStockActions: ActionConfig = {
  exportCsv: {
    method: "GET",
    endpoint: `${API_ENDPOINT}/export`,
    target: "_blank",
  },
};

export const config = {
  title: RESOURCE_TITLE,
  apiEndpoint: API_ENDPOINT,
  resourceKey: RESOURCE_KEY,
  viewConfig: compareStockViewConfig,
  toolbar: compareStockToolbar,
  actions: compareStockActions,
  quickFilters: quickFilters,
  routeSegment: ROUTE_SEGMENT,
  permissionPrefix: PERMISSION_PREFIX,
};
