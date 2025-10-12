"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  createViewConfig,
  makeActionsColumn,
  type BaseViewConfig,
} from "@/components/data-table/view-defaults";

// Use your canonical types file for the list row
// If your types live elsewhere, change this single import path
import type { TallyCardRow } from "@/lib/data/resources/tally_cards/types";

function fmt(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Build TanStack columns for the table view. */
export function buildColumns(includeActions = true): ColumnDef<TallyCardRow, any>[] {
  const cols: ColumnDef<TallyCardRow, any>[] = [
    {
      id: "tally_card_number",
      accessorKey: "tally_card_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tally Card" />,
      enableSorting: true,
      meta: { label: "Tally Card" },
      cell: ({ row }) => row.original.tally_card_number,
    },
    {
      id: "warehouse",
      accessorKey: "warehouse",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
      enableSorting: true,
      meta: { label: "Warehouse" },
      cell: ({ row }) => row.original.warehouse,
    },
    {
      id: "item_number",
      accessorKey: "item_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Number" />,
      enableSorting: true,
      meta: { label: "Item Number" },
      cell: ({ row }) => row.original.item_number,
    },
    {
      id: "is_active",
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Active" />,
      enableSorting: true,
      meta: { label: "Active" },
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="px-2 py-0.5 text-xs">Active</Badge>
        ) : (
          <Badge variant="outline" className="px-2 py-0.5 text-xs">
            Inactive
          </Badge>
        ),
    },
    {
      id: "updated_at",
      accessorKey: "updated_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      enableSorting: true,
      meta: { label: "Last Updated" },
      cell: ({ row }) => fmt(row.original.updated_at ?? null),
    },
  ];

  if (includeActions) cols.push(makeActionsColumn<TallyCardRow>());

  return cols;
}

// If you have a QuickFilter<T> type later, replace [] with QuickFilter<TallyCardRow>[]
export const quickFilters: [] = [];

export type TallyCardsViewConfig = BaseViewConfig<TallyCardRow>;

/** Table-only view config (no toolbar or chips here). */
export const tallyCardsViewConfig: TallyCardsViewConfig = createViewConfig<TallyCardRow>({
  resourceLabel: "Tally Card",
  newHref: "/forms/tally_cards",
  buildColumns,
  quickFilters,
  overrides: {
    features: {
      viewStorageKey: "tally-cards-view",
    },
  },
});
