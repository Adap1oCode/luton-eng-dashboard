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
const RESOURCE_KEY = "tcm_user_tally_card_entries" as const;
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
  return {};
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
    showBadge: false,
    formatDisplay: (value: any) => {
      if (value !== null && value !== undefined) {
        return String(value);
      }
      return "—";
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
      id: "full_name",
      accessorKey: "full_name",
      header: "Name",
      enableSorting: true,
      size: 160,
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
      size: 120,
    },
    {
      id: "location",
      accessorKey: "location",
      header: "Location",
      enableSorting: true,
      size: 160,
    },
    {
      id: "note",
      accessorKey: "note",
      header: "Note",
      enableSorting: false,
      size: 280,
    },
    {
      id: "updated_at_pretty",
      header: "Updated",
      accessorFn: (row) => row.updated_at_pretty ?? row.updated_at ?? null,
      enableSorting: true,
      size: 180,
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
    ],
    defaultValue: "ALL",
    toQueryParam: statusToQuery,
  },
];

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentRow> = {
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

