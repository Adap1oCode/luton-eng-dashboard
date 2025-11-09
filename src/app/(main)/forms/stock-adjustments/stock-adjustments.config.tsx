// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx
// TYPE: Unified config for Stock Adjustments screen
// PURPOSE: Single config file (aligned with products/users pattern)
// NOTE: JSX in buildColumns() is fine - functions are called in client context
// -----------------------------------------------------------------------------

import Link from "next/link";
import { Plus, Trash2, Download } from "lucide-react";
import type {
  ToolbarConfig,
  ChipsConfig,
  ActionConfig,
} from "@/components/forms/shell/toolbar/types";
import {
  makeActionsColumn,
  type BaseViewConfig,
  type TColumnDef,
} from "@/components/data-table/view-defaults";
import type { InlineEditConfig } from "@/components/data-table/inline-edit-cell";

// -----------------------------------------------------------------------------
// Constants (inline - no separate constants.ts file)
// -----------------------------------------------------------------------------
const ROUTE_SEGMENT = "stock-adjustments" as const;
const API_ENDPOINT = "/api/v_tcm_user_tally_card_entries" as const;
export const RESOURCE_KEY = "tcm_user_tally_card_entries" as const;
const PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Stock Adjustments" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type QuickFilter = {
  id: string;
  label: string;
  type: "text" | "enum" | "boolean" | "date";
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

export type StockAdjustmentRow = {
  id: string;
  full_name: string;
  warehouse: string;
  tally_card_number?: string | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
  reason_code?: string | null;
  multi_location?: boolean | null;
  updated_at?: string | null;
  updated_at_pretty?: string | null;
  is_active?: boolean | null;
};

// -----------------------------------------------------------------------------
// Filter Logic
// -----------------------------------------------------------------------------
/**
 * Status filter → query parameter mapping.
 * Shared between server (SSR) and client to ensure consistency.
 */
export function statusToQuery(status: string): Record<string, any> {
  if (status === "ACTIVE") return { qty_gt: 0, qty_not_null: true };
  if (status === "ZERO") return { qty_eq: 0 };
  if (status === "QUANTITY_UNDEFINED") return { qty_is_null_or_empty: true };
  return {};
}

/**
 * Date filter → query parameter mapping.
 * Converts "LAST_X_DAYS" to updated_at_gte with ISO date string.
 */
export function dateFilterToQuery(dateFilter: string): Record<string, any> {
  if (dateFilter === "ALL") return {};
  
  const days = parseInt(dateFilter.replace("LAST_", "").replace("_DAYS", ""));
  if (isNaN(days)) return {};
  
  // Calculate date X days ago
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0); // Start of day
  
  // Return ISO string for Supabase
  return { updated_at_gte: date.toISOString() };
}

/**
 * Warehouse filter → query parameter mapping.
 * Filters by warehouse name (exact match).
 */
export function warehouseFilterToQuery(warehouseFilter: string): Record<string, any> {
  if (warehouseFilter === "ALL") return {};
  return { warehouse: warehouseFilter };
}

export type QuickFilterMeta = {
  id: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

export const stockAdjustmentsFilterMeta: QuickFilterMeta[] = [
  {
    id: "status",
    toQueryParam: statusToQuery,
  },
  {
    id: "updated",
    toQueryParam: dateFilterToQuery,
  },
  {
    id: "warehouse",
    toQueryParam: warehouseFilterToQuery,
  },
];

// -----------------------------------------------------------------------------
// Inline Edit Config
// -----------------------------------------------------------------------------
export const INLINE_EDIT_CONFIGS: Record<string, InlineEditConfig> = {
  qty: {
    fieldType: "text",
    placeholder: "Enter quantity",
    validation: (value) => !isNaN(Number(value)),
    parseValue: (value) => Number(value),
    showBadge: false, // Only show badge when empty (NONE), otherwise show normal text
    formatDisplay: (value: any) => {
      if (value !== null && value !== undefined && value !== "") {
        return String(value);
      }
      return "NONE"; // Will be shown in red badge when empty
    },
  },
  location: {
    fieldType: "text",
    placeholder: "Enter location",
    showBadge: false, // Only show badge when empty (NONE), otherwise show normal text
    formatDisplay: (value: any) => {
      if (value !== null && value !== undefined && value !== "") {
        return String(value);
      }
      return "NONE"; // Will be shown in red badge when empty
    },
  },
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<StockAdjustmentRow>[] {
  return [
    // Hidden routing-only id
    {
      id: "id",
      accessorKey: "id",
      header: () => null,
      cell: () => null,
      enableHiding: true,
      enableSorting: false,
      enableColumnFilter: false,
      size: 0,
      meta: { routingOnly: true },
    },
    {
      id: "tally_card_number",
      accessorKey: "tally_card_number",
      header: "Tally Card",
      cell: ({ row }) => {
        const id = row.original.id;
        const tallyCardNumber = row.getValue<string | null>("tally_card_number");
        
        if (!tallyCardNumber) {
          return <span className="text-muted-foreground">—</span>;
        }

        return (
          <Link
            href={`/forms/stock-adjustments/${id}/edit`}
            className="font-medium text-blue-600 transition-colors duration-150 hover:text-blue-800 hover:underline"
          >
            {tallyCardNumber}
          </Link>
        );
      },
      enableSorting: true,
      size: 160,
    },
    {
      id: "warehouse",
      accessorKey: "warehouse",
      header: "Warehouse",
      enableSorting: true,
      size: 160,
    },
    {
      id: "location",
      accessorKey: "location",
      header: "Location",
      // Custom cell renderer that wraps inline edit with MULTI badge
      // Note: ResourceTableClient will wrap this with InlineEditCellWrapper, so we need to handle both display and edit modes
      meta: {
        inlineEdit: INLINE_EDIT_CONFIGS.location,
        // Custom renderer flag to add MULTI badge
        // showMultiBadge: true, // Custom meta property - handled by ResourceTableClient
      },
      enableSorting: true,
      size: 320, // Increased width to accommodate existing value + input box + buttons for inline editing
    },
    {
      id: "qty",
      accessorKey: "qty",
      header: "Qty",
      // No custom cell renderer - ResourceTableClient will use InlineEditCellWrapper when meta.inlineEdit is present
      meta: {
        inlineEdit: INLINE_EDIT_CONFIGS.qty,
      },
      enableSorting: true,
      size: 280, // Increased width to accommodate existing value + input box + buttons for inline editing
    },
    {
      id: "reason_code",
      accessorKey: "reason_code",
      header: "Reason Code",
      enableSorting: true,
      size: 140,
    },
    {
      id: "updated_at_pretty",
      header: "Updated",
      accessorFn: (row) => row.updated_at_pretty ?? row.updated_at ?? null,
      enableSorting: true,
      size: 180,
    },
    {
      id: "full_name",
      accessorKey: "full_name",
      header: "Name",
      enableSorting: true,
      size: 160,
    },
    makeActionsColumn<StockAdjustmentRow>(),
  ];
}

// -----------------------------------------------------------------------------
// Quick Filters
// -----------------------------------------------------------------------------
export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "ALL", label: "All adjustments" },
      { value: "ACTIVE", label: "Active (qty > 0)" },
      { value: "ZERO", label: "Zero quantity" },
      { value: "QUANTITY_UNDEFINED", label: "Quantity undefined" },
    ],
    defaultValue: "ALL",
    toQueryParam: statusToQuery,
  },
  {
    id: "updated",
    label: "Updated",
    type: "enum",
    options: [
      { value: "ALL", label: "All time" },
      { value: "LAST_7_DAYS", label: "Last 7 days" },
      { value: "LAST_30_DAYS", label: "Last 30 days" },
      { value: "LAST_90_DAYS", label: "Last 90 days" },
    ],
    defaultValue: "ALL",
    toQueryParam: dateFilterToQuery,
  },
  {
    id: "warehouse",
    label: "Warehouse",
    type: "enum",
    options: [
      { value: "ALL", label: "All warehouses" },
      // Note: In a real implementation, you'd load these dynamically from the API
      // For now, using static list - see implementation guide for dynamic loading
      { value: "AM - WH 1", label: "AM - WH 1" },
      { value: "AM - WH 2", label: "AM - WH 2" },
      { value: "AM - WH 3", label: "AM - WH 3" },
    ],
    defaultValue: "ALL",
    toQueryParam: warehouseFilterToQuery,
  },
];

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentRow> & { apiEndpoint?: string } = {
  resourceKeyForDelete: RESOURCE_KEY,
  formsRouteSegment: ROUTE_SEGMENT,
  idField: "id",
  apiEndpoint: API_ENDPOINT, // VIEW endpoint for list/view-all screen (not TABLE endpoint)
  toolbar: { left: undefined, right: [] },
  quickFilters: quickFilters,
  features: {
    rowSelection: true,
    pagination: true,
  },
  buildColumns: () => buildColumns(),
  // Hide Views and Save View buttons in bottom toolbar
  bottomToolbarButtons: {
    views: false,
    saveView: false,
    // Keep other buttons visible (columns, sort, moreFilters)
    columns: true,
    sort: true,
    moreFilters: true,
  },
};

// -----------------------------------------------------------------------------
// Toolbar Config
// -----------------------------------------------------------------------------
export const stockAdjustmentsToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New Adjustment",
      icon: "Plus",
      variant: "default",
      href: `/forms/${ROUTE_SEGMENT}/new`,
      requiredAny: [`${PERMISSION_PREFIX}:create`],
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      variant: "destructive",
      action: "deleteSelected",
      enableWhen: "anySelected",
      requiredAny: [`${PERMISSION_PREFIX}:delete`],
    },
    {
      id: "exportCsv",
      label: "Export CSV",
      icon: "Download",
      variant: "outline",
      onClickId: "exportCsv",
    },
  ],
  right: [],
};

export const stockAdjustmentsActions: ActionConfig = {
  deleteSelected: {
    method: "DELETE",
    endpoint: `${API_ENDPOINT}/bulk-delete`,
  },
  exportCsv: {
    method: "GET",
    endpoint: `${API_ENDPOINT}/export`,
    target: "_blank",
  },
};

export const stockAdjustmentsChips: ChipsConfig | undefined = undefined;

// -----------------------------------------------------------------------------
// Bundled Config Export (for page.tsx)
// -----------------------------------------------------------------------------
export const title = RESOURCE_TITLE;

export const config = {
  title: RESOURCE_TITLE,
  viewConfig: stockAdjustmentsViewConfig,
  toolbar: stockAdjustmentsToolbar,
  chips: stockAdjustmentsChips,
  actions: stockAdjustmentsActions,
  quickFilters: quickFilters,
  routeSegment: ROUTE_SEGMENT,
  apiEndpoint: API_ENDPOINT,
  resourceKey: RESOURCE_KEY,
  permissionPrefix: PERMISSION_PREFIX,
};

