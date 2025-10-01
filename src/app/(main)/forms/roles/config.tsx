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
export type RoleRow = {
  id: string;
  role_code: string;
  role_name: string;
  warehouses: string[];
  is_active: boolean;
};

/* -----------------------------------------------------------------------------
 * Feature toggles (config-driven behaviour)
 * ---------------------------------------------------------------------------*/
export type TableFeatures = {
  /** Show column sort UI (header uses DataTableColumnHeader) */
  sortable?: boolean;
  /** Show global search in the header bar */
  globalSearch?: boolean;
  /** Show Export CSV button in the header bar */
  exportCsv?: boolean;
  /** Show pagination footer */
  pagination?: boolean;
  /** Enable row selection checkboxes */
  rowSelection?: boolean;
  /** Enable drag & drop row reordering (if base table supports it) */
  dnd?: boolean;
  /** Persist user view (column visibility/order) */
  saveView?: boolean;
  /** Storage key used by Save View feature */
  viewStorageKey?: string;
};

/* -----------------------------------------------------------------------------
 * Toolbar configuration (right-side buttons in the header)
 * ---------------------------------------------------------------------------*/
export type ToolbarButton = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** shadcn button variant */
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  /** Use href OR onClick; page can override with router.push */
  href?: string;
  onClickId?: string; // identifier the page can map to a handler
};

export type ToolbarConfig = {
  left?: React.ReactNode;   // optional custom left slot (e.g., chips)
  right?: ToolbarButton[];  // standard buttons (New, Export)
};

/* -----------------------------------------------------------------------------
 * Row actions (per-row overflow menu)
 * ---------------------------------------------------------------------------*/
export type RowActionId = "view" | "edit" | "delete" | string;

export type RowAction = {
  id: RowActionId;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  confirm?: boolean; // page can implement a confirm UX if true
};

export type RowActionsConfig = {
  enabled?: boolean;
  items: RowAction[];
  /** Optional: hide the actions column entirely */
  hideColumn?: boolean;
};

/* -----------------------------------------------------------------------------
 * Columns factory (keeps headers standardized + plugs in actions column)
 * NOTE: This only builds the defs; the page will pass handlers.
 * ---------------------------------------------------------------------------*/
export function buildColumns(includeActions: boolean = true): ColumnDef<RoleRow, any>[] {
  const cols: ColumnDef<RoleRow, any>[] = [
    {
      accessorKey: "role_code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role Code" />,
      enableSorting: true,
      cell: ({ row }) => row.original.role_code,
    },
    {
      accessorKey: "role_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role Name" />,
      enableSorting: true,
      cell: ({ row }) => row.original.role_name,
    },
    {
      id: "warehouses",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse List" />,
      enableSorting: true,
      // simple sorting by count; switch to alphabetical if preferred
      sortingFn: (a, b) => a.original.warehouses.length - b.original.warehouses.length,
      cell: ({ row }) => row.original.warehouses.join(", "),
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
  ];

  if (includeActions) {
    cols.push({
      id: "actions",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => {
        // We don’t bind handlers here—page will map action IDs to handlers.
        const mkItem = (id: RowActionId, label: string, Icon?: RowAction["icon"]) => (
          <DropdownMenuItem data-action-id={id}>
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            {label}
          </DropdownMenuItem>
        );
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {/* 3-dots icon (inline to avoid pulling more deps) */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {mkItem("view", "View", Eye)}
              {mkItem("edit", "Edit", Pencil)}
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 dark:text-red-400"
                data-action-id="delete"
              >
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
 * Quick filters (declare only; page wires actual UI if needed)
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
    { id: "new", label: "New Role", icon: Plus, variant: "default", href: "/forms/roles" },
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
  viewStorageKey: "roles-view",
};

/* -----------------------------------------------------------------------------
 * Bundle for easy import in the page
 * ---------------------------------------------------------------------------*/
export type RolesViewConfig = {
  features: TableFeatures;
  toolbar: ToolbarConfig;
  quickFilters: QuickFilter[];
  /** Build columns (actions column included by default) */
  buildColumns: (includeActions?: boolean) => ColumnDef<RoleRow, any>[];
};

export const rolesViewConfig: RolesViewConfig = {
  features,
  toolbar,
  quickFilters,
  buildColumns: (includeActions = true) => buildColumns(includeActions),
};
