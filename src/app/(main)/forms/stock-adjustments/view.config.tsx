"use client";

import { makeActionsColumn, type BaseViewConfig, type TColumnDef } from "@/components/data-table/view-defaults";

// Keep this local and minimal to avoid cross-file type coupling.
// If you later add a Zod schema, you can infer this type from it.
export type StockAdjustmentRow = {
  id: string; // routing/selection id (from API/view)
  full_name: string;
  warehouse: string;
  tally_card_number?: string | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
  updated_at?: string | null; // server may return ISO string
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
    {
      id: "updated_at_pretty",
      accessorKey: "updated_at_pretty",
      header: "Updated",
      enableSorting: true,
      size: 180,
    },

    // Actions (⋯) menu
    makeActionsColumn<StockAdjustmentRow>(),
  ];
}

export const stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentRow> = {
  resourceKeyForDelete: "tcm_user_tally_card_entries",
  formsRouteSegment: "stock-adjustments", // used to build /forms/stock-adjustments/[id]/edit
  idField: "id", // explicit domain id for actions + row keys
  toolbar: { left: undefined, right: [] },
  quickFilters: [],
  features: {
    rowSelection: true,
    pagination: true,
    // other features rely on global defaults; override here if needed
  },
  buildColumns: () => buildColumns(),
};
