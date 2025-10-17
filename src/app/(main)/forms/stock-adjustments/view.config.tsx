"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { makeActionsColumn, type BaseViewConfig } from "@/components/data-table/view-defaults";

// Keep this local and minimal to avoid cross-file type coupling.
// If you later add a Zod schema, you can infer this type from it.
export type StockAdjustmentRow = {
  id: string; // ensure client has a stable id for actions/selection
  user_id: string;
  tally_card_number?: string | null;
  card_uid?: string | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
  updated_at?: string | null; // server may return ISO string
};

function buildColumns(): ColumnDef<StockAdjustmentRow>[] {
  return [
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
      id: "user_id",
      accessorKey: "user_id",
      header: "User ID",
      enableSorting: false,
      enableHiding: true,
      size: 260,
      meta: { hiddenByDefault: true },
    },
    {
      id: "card_uid",
      accessorKey: "card_uid",
      header: "Card UID",
      enableSorting: false,
      enableHiding: true,
      size: 300,
      meta: { hiddenByDefault: true },
    },
    {
      id: "updated_at",
      accessorKey: "updated_at",
      header: "Updated",
      enableSorting: true,
      size: 180,
    },
    // Actions column (event delegation reads data-row-id from Dropdown items)
    makeActionsColumn<StockAdjustmentRow>(),
  ];
}

export const stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentRow> = {
  resourceKeyForDelete: "tcm_user_tally_card_entries",
  toolbar: { left: undefined, right: [] },
  quickFilters: [],
  features: {
    rowSelection: true,
    pagination: true,
  },
  formsRouteSegment: "stock-adjustments",
  buildColumns, // only referenced by the client table
};
