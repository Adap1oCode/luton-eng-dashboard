// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/view.config.tsx
// TYPE: Config
// PURPOSE: Column + view config for "Stock Adjustments" (backed by user_tally_card_entries)
// NOTES:
//  • Single source of truth = TanStack ColumnDef[] via buildColumns()
//  • No resource-specific strings outside of this screen's context
//  • Safe defaults: selection enabled; stable storage key; delete targets base table
// -----------------------------------------------------------------------------

import type { ColumnDef } from "@tanstack/react-table";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";

// Keep this local and minimal to avoid cross-file type coupling.
// If you later add a Zod schema, you can infer this type from it.
export type StockAdjustmentRow = {
  full_name: string;
  warehouse: string;
  tally_card_number?: string | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
  updated_at?: string | null; // server may return ISO string
};

function buildColumns(): ColumnDef<StockAdjustmentRow>[] {
  return [
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
      header: "warehouse",
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
      // meta-only hints are fine (no functions)
      meta: { align: "right" },
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
  ];
}

// materialize columns on the server to avoid passing functions to client
const columns: ColumnDef<StockAdjustmentRow>[] = buildColumns();

export const stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentRow> = {
  resourceKeyForDelete: "tcm_user_tally_card_entries",
  toolbar: { left: undefined, right: [] },
  quickFilters: [],
  features: {
    rowSelection: true,
    pagination: true,
  },
  buildColumns, // ← keep the function here to satisfy BaseViewConfig typing
};
