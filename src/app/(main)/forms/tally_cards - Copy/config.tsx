// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/_data/view-config.ts
// PURPOSE: Config for the "View All Tally Cards" table screen (TanStack-based)
// NOTES:
//  • Mirrors the roles view-config style you shared (features, toolbar, columns)
//  • Keep actions unbound; the page will attach handlers via data-action-id
// -----------------------------------------------------------------------------

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, Plus, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

/* -----------------------------------------------------------------------------
 * Row model for this view (UI-facing)
 * ---------------------------------------------------------------------------*/
export type TallyCardRow = {
  id: string;
  tally_card_number: string;
  warehouse: string;
  item_number: string; // normalised to string for display; source may be number
  note?: string | null;
  is_active: boolean;
  created_at?: string | null; // ISO
  updated_at?: string | null; // ISO
};

/* -----------------------------------------------------------------------------
 * Feature toggles (config-driven behaviour)
 * ---------------------------------------------------------------------------*/
export type TableFeatures = {
  sortable?: boolean;
  globalSearch?: boolean;
  exportCsv?: boolean;
  pagination?: boolean;
  rowSelection?: boolean;
  dnd?: boolean;
  saveView?: boolean;
  viewStorageKey?: string;
};

/* -----------------------------------------------------------------------------
 * Toolbar configuration (right-side buttons in the header)
 * ---------------------------------------------------------------------------*/
export type ToolbarButton = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  href?: string;
  onClickId?: string;
};

export type ToolbarConfig = {
  left?: React.ReactNode;
  right?: ToolbarButton[];
};

/* -----------------------------------------------------------------------------
 * Row actions (per-row overflow menu)
 * ---------------------------------------------------------------------------*/
export type RowActionId = "view" | "edit" | "delete" | string;

export type RowAction = {
  id: RowActionId;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  confirm?: boolean;
};

export type RowActionsConfig = {
  enabled?: boolean;
  items: RowAction[];
  hideColumn?: boolean;
};

/* -----------------------------------------------------------------------------
 * Date helper (safe, no locale deps)
 * ---------------------------------------------------------------------------*/
function fmt(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  // e.g. 2025-10-02 14:07
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* -----------------------------------------------------------------------------
 * Columns factory (keeps headers standardized + plugs in actions column)
 * ---------------------------------------------------------------------------*/
export function buildColumns(includeActions: boolean = true): ColumnDef<TallyCardRow, any>[] {
  const cols: ColumnDef<TallyCardRow, any>[] = [
    {
      accessorKey: "tally_card_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tally Card" />, 
      enableSorting: true,
      cell: ({ row }) => row.original.tally_card_number,
    },
    {
      accessorKey: "warehouse",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />, 
      enableSorting: true,
      cell: ({ row }) => row.original.warehouse,
    },
    {
      accessorKey: "item_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Number" />, 
      enableSorting: true,
      cell: ({ row }) => row.original.item_number,
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Active" />, 
      enableSorting: true,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="px-2 py-0.5 text-xs">Active</Badge>
        ) : (
          <Badge variant="outline" className="px-2 py-0.5 text-xs">Inactive</Badge>
        ),
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />, 
      enableSorting: true,
      cell: ({ row }) => fmt(row.original.updated_at ?? null),
    },
  ];

  if (includeActions) {
    cols.push({
      id: "actions",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => {
        // NOTE: add data-row-id to let the page delegate action handling cleanly
        const mkItem = (id: RowActionId, label: string, Icon?: RowAction["icon"]) => (
          <DropdownMenuItem data-action-id={id} data-row-id={row.original.id}>
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            {label}
          </DropdownMenuItem>
        );
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {mkItem("view", "View", Eye)}
              {mkItem("edit", "Edit", Pencil)}
              <DropdownMenuItem className="text-red-600 focus:text-red-600 dark:text-red-400" data-action-id="delete" data-row-id={row.original.id}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });
  }

  return cols;
}

/* -----------------------------------------------------------------------------
 * Quick filters
 * ---------------------------------------------------------------------------*/
export type QuickFilter =
  | {
      id: "status";
      label: string;
      type: "enum";
      options: Array<{ value: "ALL" | "ACTIVE" | "INACTIVE"; label: string }>;
      defaultValue: "ALL";
    }
  | {
      id: string;
      label: string;
      type: "text" | "enum";
      options?: Array<{ value: string; label: string }>;
      defaultValue?: string;
    };

export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "ALL", label: "All statuses" },
      { value: "ACTIVE", label: "Active only" },
      { value: "INACTIVE", label: "Inactive only" },
    ],
    defaultValue: "ALL",
  },
];

/* -----------------------------------------------------------------------------
 * Toolbar defaults (page may override handlers via onClickId or href)
 * ---------------------------------------------------------------------------*/
export const toolbar: ToolbarConfig = {
  right: [
    { id: "new", label: "New Tally Card", icon: Plus, variant: "default", href: "/forms/tally_cards" },
    { id: "export", label: "Export", icon: Download, variant: "outline", onClickId: "exportCsv" },
  ],
};

/* -----------------------------------------------------------------------------
 * Feature defaults for this view
 * ---------------------------------------------------------------------------*/
export const features: TableFeatures = {
  sortable: true,
  globalSearch: true,
  exportCsv: true,
  pagination: true,
  rowSelection: true,
  dnd: false,
  saveView: true,
  viewStorageKey: "tally-cards-view",
};

/* -----------------------------------------------------------------------------
 * Bundle for easy import in the page
 * ---------------------------------------------------------------------------*/
export type TallyCardsViewConfig = {
  features: TableFeatures;
  toolbar: ToolbarConfig;
  quickFilters: QuickFilter[];
  buildColumns: (includeActions?: boolean) => ColumnDef<TallyCardRow, any>[];
};

export const tallyCardsViewConfig: TallyCardsViewConfig = {
  features,
  toolbar,
  quickFilters,
  buildColumns: (includeActions = true) => buildColumns(includeActions),
};