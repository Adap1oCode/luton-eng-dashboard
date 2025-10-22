// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/view.config.tsx
// TYPE: Client config for the "Stock Adjustments" list view
// PURPOSE: Columns + view config + bundled exports for minimal page usage
// -----------------------------------------------------------------------------

"use client";

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
      id: "full_name",
      accessorKey: "full_name",
      header: "Name",
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
      id: "tally_card_number",
      accessorKey: "tally_card_number",
      header: "Tally Card",
      enableSorting: true,
      size: 160,
    },
    {
      id: "qty",
      accessorKey: "qty",
      header: "Qty",
      meta: {
        /* align handled by cell/renderer if needed */
      },
      enableSorting: true,
      size: 90,
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

export const stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentRow> = {
  resourceKeyForDelete: "tcm_user_tally_card_entries",
  formsRouteSegment: "stock-adjustments", // builds /forms/stock-adjustments/[id]/edit
  idField: "id", // domain id for actions + row keys
  // Keep this minimal local toolbar to avoid regressions if consumers read from viewConfig
  toolbar: { left: undefined, right: [] },
  quickFilters: [],
  features: {
    rowSelection: true,
    pagination: true,
    // other features rely on global defaults; override here if needed
  },
  buildColumns: () => buildColumns(),
};

// ---- Bundle export for ultra-minimal page.tsx usage --------------------------

export const title = "Stock Adjustments";

export const config = {
  title,
  viewConfig: stockAdjustmentsViewConfig,
  toolbar: stockAdjustmentsToolbar,
  chips: stockAdjustmentsChips,
  actions: stockAdjustmentsActions,
};
