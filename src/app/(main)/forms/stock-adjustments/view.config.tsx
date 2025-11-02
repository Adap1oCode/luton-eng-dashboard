// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/view.config.tsx
// TYPE: Client config for the "Stock Adjustments" list view
// PURPOSE: Columns + view config + bundled exports for minimal page usage
// -----------------------------------------------------------------------------

"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { InlineEditConfig } from "@/components/data-table/inline-edit-cell";
import {
  makeActionsColumn,
  type BaseViewConfig,
  type TColumnDef,
} from "@/components/data-table/view-defaults";

import {
  stockAdjustmentsToolbar,
  stockAdjustmentsChips,
  stockAdjustmentsActions,
} from "./toolbar.config";
import { ROUTE_SEGMENT, API_ENDPOINT, RESOURCE_KEY, PERMISSION_PREFIX, RESOURCE_TITLE } from "./constants";
import { statusToQuery } from "./filters";

// Quick filter type
export type QuickFilter = {
  id: string;
  label: string;
  type: "text" | "enum" | "boolean" | "date";
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

// Inline edit configurations
export const INLINE_EDIT_CONFIGS: Record<string, InlineEditConfig> = {
  qty: {
    fieldType: "text",
    placeholder: "Enter quantity",
    validation: (value) => !isNaN(Number(value)),
    parseValue: (value) => Number(value),
    showBadge: false, // Disable badges for Qty column
  },
};

// If you later add a Zod schema, infer this type from it.
export type StockAdjustmentRow = {
  id: string; // routing/selection id (from API/view)
  full_name: string;
  warehouse: string;
  tally_card_number?: string | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
  updated_at?: string | null; // ISO string from server (fallback if pretty missing)
  updated_at_pretty?: string | null; // human-friendly
  is_active?: boolean | null; // Status field for visual indicators
};

function buildColumns(): TColumnDef<StockAdjustmentRow>[] {
  return [
    // Hidden routing-only id — never displayed, never filtered/sorted
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
        
        // If no tally card number, show as plain text
        if (!tallyCardNumber) {
          return <span className="text-muted-foreground">—</span>;
        }

        // Create hyperlink to edit page
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
      cell: ({ row }) => {
        const qty = row.getValue<number | null>("qty");
        
        // Show quantity value without badges (badges disabled via inline edit config)
        if (qty !== null && qty !== undefined) {
          return <span>{qty}</span>;
        }
        
        return <span className="text-muted-foreground">—</span>;
      },
      meta: {
        inlineEdit: INLINE_EDIT_CONFIGS.qty,
        /* align handled by cell/renderer if needed */
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
    // Safer "Updated" column: falls back to updated_at if pretty is absent
    {
      id: "updated_at_pretty",
      header: "Updated",
      accessorFn: (row) => row.updated_at_pretty ?? row.updated_at ?? null,
      enableSorting: true,
      size: 180,
    },

    // Actions (⋯) menu
    // If your makeActionsColumn supports options, you can pass basePath:
    // makeActionsColumn<StockAdjustmentRow>({ basePath: "/forms/stock-adjustments" }),
    makeActionsColumn<StockAdjustmentRow>(),
  ];
}

// Memoize columns at module level to prevent rebuilds on every config access
const _memoizedColumns = buildColumns();

// Quick filters for status-based filtering
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

export const stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentRow> = {
  resourceKeyForDelete: RESOURCE_KEY,
  formsRouteSegment: ROUTE_SEGMENT, // builds /forms/stock-adjustments/[id]/edit
  idField: "id", // domain id for actions + row keys
  // Keep this minimal local toolbar to avoid regressions if consumers read from viewConfig
  toolbar: { left: undefined, right: [] },
  quickFilters: quickFilters,
  features: {
    rowSelection: true,
    pagination: true,
    // Inline editing is enabled per-column via meta.inlineEdit
    // other features rely on global defaults; override here if needed
  },
  buildColumns: () => _memoizedColumns,
};

// Freeze to prevent mutations and stabilize reference
Object.freeze(stockAdjustmentsViewConfig);
Object.freeze(stockAdjustmentsViewConfig.quickFilters); // Freeze nested array

// ---- Bundle export for ultra-minimal page.tsx usage --------------------------

export const title = RESOURCE_TITLE;

// Bundled config for easy reuse
export const config = {
  title: RESOURCE_TITLE,
  viewConfig: stockAdjustmentsViewConfig,
  toolbar: stockAdjustmentsToolbar,
  chips: stockAdjustmentsChips,
  actions: stockAdjustmentsActions,
  quickFilters: quickFilters,
  // Constants for reuse
  routeSegment: ROUTE_SEGMENT,
  apiEndpoint: API_ENDPOINT,
  resourceKey: RESOURCE_KEY,
  permissionPrefix: PERMISSION_PREFIX,
};

// Freeze config bundle to stabilize reference
Object.freeze(config);

