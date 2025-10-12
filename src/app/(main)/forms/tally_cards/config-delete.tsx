"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import {
  createViewConfig,
  makeActionsColumn,
  type BaseViewConfig,
} from "@/components/data-table/view-defaults";

// ToolbarButton.icon expects a React component (not a string)
import {
  Plus,
  Trash2,
  Copy,
  Printer,
  FileText,
  Package,
  Download,
  Save,
} from "lucide-react";

import type { ToolbarButton } from "@/components/forms/shell/types";

export type TallyCardRow = {
  id: string;
  tally_card_number: string;
  warehouse: string;
  item_number: string;
  note?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

function fmt(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Build TanStack columns (we’ll map these to your UI table on the page). */
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

export const quickFilters: unknown[] = [];

export type TallyCardsViewConfig = BaseViewConfig<TallyCardRow>;

/** Table-only view config (no toolbar/chips inside this object). */
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

/** ---- UI config for the Shell (ToolbarButton-only fields) ---- */
export const tallyCardsToolbar: {
  primary: ToolbarButton[];
  left: ToolbarButton[];
  right: ToolbarButton[];
} = {
  primary: [
    { id: "new", label: "New", icon: Plus, href: "/forms/tally_cards/new" },
    // For delete/duplicate, use hrefs you already expose; actions are not part of ToolbarButton type.
    { id: "delete", label: "Delete", icon: Trash2, href: "/forms/tally_cards/delete" },
    { id: "duplicate", label: "Duplicate", icon: Copy, href: "/forms/tally_cards/duplicate" },
  ],
  left: [
    { id: "print_report", label: "Print Report", icon: Printer, href: "/forms/tally_cards/print/report" },
    { id: "print_invoice", label: "Print Invoice", icon: FileText, href: "/forms/tally_cards/print/invoice" },
    { id: "print_packing_slip", label: "Print Packing Slip", icon: Package, href: "/forms/tally_cards/print/packing-slip" },
  ],
  right: [
    { id: "export_csv", label: "Export CSV", icon: Download, href: "/forms/tally_cards/export.csv" },
    { id: "save_view", label: "Save View", icon: Save, href: "/forms/tally_cards/save-view" },
  ],
};

export const tallyCardsChips = {
  filter: true,
  sorting: true,
} as const;
