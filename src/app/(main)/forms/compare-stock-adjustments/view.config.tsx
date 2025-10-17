// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/view.config.tsx
// TYPE: Config
// PURPOSE: Column + view config for "Stock Adjustments – Compare"
//          (backed by vw_tally_card_entry_compare)
// NOTES:
//  • Single source of truth = TanStack ColumnDef[] via buildColumns()
//  • Read-only projection (no deletes/edits from this screen)
//  • Quick filters for Qty/Location differences
// -----------------------------------------------------------------------------

import type { ColumnDef } from "@tanstack/react-table";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";

export type StockAdjustmentCompareRow = {
  warehouse: string;
  warehouse_id: string; // UUID
  tally_card_number: string;

  // store officer
  store_officer_name: string | null;
  store_officer_role_code: string | null;
  store_officer_qty: number | null;
  store_officer_location: string | null;

  // auditor
  auditor_name: string | null;
  auditor_role_code: string | null;
  auditor_qty: number | null;
  auditor_location: string | null;

  // compare flags
  qty_diff: boolean;
  location_diff: boolean;
  qty_diff_yn: "YES" | "NO";
  location_diff_yn: "YES" | "NO";

  // optional if you added it to the view; safe to leave out if not present
  last_updated_at?: string | null;
};

function buildColumns(): ColumnDef<StockAdjustmentCompareRow>[] {
  return [
    {
      id: "warehouse",
      accessorKey: "warehouse",
      header: "Warehouse",
      enableSorting: true,
      size: 140,
    },
    {
      id: "tally_card_number",
      accessorKey: "tally_card_number",
      header: "Tally Card",
      enableSorting: true,
      size: 140,
    },

    // ===== Store Officer =====
    {
      id: "store_officer_name",
      accessorKey: "store_officer_name",
      header: "SO Name",
      enableSorting: true,
      size: 160,
    },
    {
      id: "store_officer_qty",
      accessorKey: "store_officer_qty",
      header: "SO Qty",
      meta: { align: "right" },
      enableSorting: true,
      size: 90,
    },
    {
      id: "store_officer_location",
      accessorKey: "store_officer_location",
      header: "SO Location",
      enableSorting: true,
      size: 140,
    },

    // ===== Auditor =====
    {
      id: "auditor_name",
      accessorKey: "auditor_name",
      header: "Auditor Name",
      enableSorting: true,
      size: 160,
    },
    {
      id: "auditor_qty",
      accessorKey: "auditor_qty",
      header: "Auditor Qty",
      meta: { align: "right" },
      enableSorting: true,
      size: 110,
    },
    {
      id: "auditor_location",
      accessorKey: "auditor_location",
      header: "Auditor Location",
      enableSorting: true,
      size: 150,
    },

    // ===== Diff flags (easy filtering) =====
    {
      id: "qty_diff_yn",
      accessorKey: "qty_diff_yn",
      header: "Qty Diff",
      enableSorting: true,
      size: 90,
    },
    {
      id: "location_diff_yn",
      accessorKey: "location_diff_yn",
      header: "Location Diff",
      enableSorting: true,
      size: 120,
    },

    // Optional unified sort by latest change (if present in the view)
    // { id: "last_updated_at", accessorKey: "last_updated_at", header: "Last Updated", enableSorting: true, size: 180 },
  ];
}

// materialize columns on the server to avoid passing functions to client
const columns: ColumnDef<StockAdjustmentCompareRow>[] = buildColumns();

export const stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentCompareRow> = {
  // read-only: no delete target for a view
  resourceKeyForDelete: undefined,

  // This page is purely comparative; keep toolbar minimal
  toolbar: { left: undefined, right: [] },

  // Quick YES/NO chips for fast filtering
  quickFilters: [
    { column: "qty_diff_yn", label: "Qty Diff = YES", value: "YES" },
    { column: "location_diff_yn", label: "Loc Diff = YES", value: "YES" },
  ],

  features: {
    rowSelection: true,
    pagination: true,
  },

  // keep the function here to satisfy BaseViewConfig typing
  buildColumns,

  // If your table client supports defaultSort, you can set one here
  // (fallbacks to tally_card_number asc otherwise)
  //defaultSort: { column: "tally_card_number", desc: false },
};
