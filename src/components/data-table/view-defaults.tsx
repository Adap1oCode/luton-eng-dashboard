// -----------------------------------------------------------------------------
// Global, reusable defaults + helpers for TanStack table views
// -----------------------------------------------------------------------------

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, Plus, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Sensible global defaults
// -----------------------------------------------------------------------------
export const DEFAULT_FEATURES: Required<TableFeatures> = {
  sortable: true,
  globalSearch: true,
  exportCsv: true,
  pagination: true,
  rowSelection: true,
  dnd: false,
  saveView: true,
  viewStorageKey: "default-table-view",
};

export function makeDefaultToolbar(resourceLabel: string, newHref: string): ToolbarConfig {
  return {
    right: [
      { id: "new", label: `New ${resourceLabel}`, icon: Plus, variant: "default", href: newHref },
      { id: "export", label: "Export", icon: Download, variant: "outline", onClickId: "exportCsv" },
    ],
  };
}

export const DEFAULT_ACTIONS: RowAction[] = [
  { id: "view", label: "View", icon: Eye },
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "delete", label: "Delete", icon: Trash2, confirm: true },
];

// -----------------------------------------------------------------------------
// Default column-state helpers (prevents undefined .map in DataTable)
// -----------------------------------------------------------------------------

// A "column-like" shape supporting TanStack's usual id/accessorKey fields.
type ColumnLike =
  | { id?: string | number; accessorKey?: string | number }
  | { id?: string | number }
  | { accessorKey?: string | number };

/** Normalize a column to a stable string id */
export function deriveColumnId(c: ColumnLike): string {
  const id = (c as any).id ?? (c as any).accessorKey;
  return String(id ?? "");
}

/** Build default view state (order = all columns, all visible) */
export function makeDefaultViewState(columns: ColumnLike[]) {
  const order = columns.map(deriveColumnId).filter(Boolean);
  const count = order.length || 1;
  const base = 100 / count;

  // Build an equal-width map and ensure the total sums to 100 by correcting the last column.
  const columnWidths: Record<string, number> = {};
  const columnFilters: Record<string, string> = {};
  let acc = 0;

  order.forEach((id, idx) => {
    const w = idx === count - 1 ? Math.max(0, 100 - acc) : Math.round(base * 100) / 100;
    columnWidths[id] = w;
    acc += w;
    columnFilters[id] = "";
  });

  return {
    columnOrder: order,
    visibleColumns: order,
    // ✅ return the computed maps (don’t overwrite with `{}`)
    columnWidths,
    columnFilters,
    sorts: [] as Array<any>,
  };
}


// -----------------------------------------------------------------------------
// Reusable Actions column
// Page handles clicks via event delegation on data-* attributes.
// -----------------------------------------------------------------------------
export function makeActionsColumn<TRow extends { id: string }>(
  actions: RowAction[] = DEFAULT_ACTIONS
): ColumnDef<TRow, any> {
  return {
    id: "actions",
    header: () => null,
    enableSorting: false,
    cell: ({ row }) => {
      const mk = (a: RowAction) => (
        <DropdownMenuItem
          key={a.id}
          data-action-id={a.id}
          data-row-id={row.original.id}
          className={a.id === "delete" ? "text-red-600 focus:text-red-600 dark:text-red-400" : ""}
        >
          {a.icon ? <a.icon className="mr-2 h-4 w-4" /> : null}
          {a.label}
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
            {actions.map(mk)}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };
}

// -----------------------------------------------------------------------------
// Merging utils
// -----------------------------------------------------------------------------
type DeepPartial<T> =
  T extends Array<infer U> ? Array<DeepPartial<U>> :
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } :
  T;

export function mergeDefaults<T extends object>(base: T, overrides?: DeepPartial<T>): T {
  if (!overrides) return base;
  if (Array.isArray(base) && Array.isArray(overrides)) {
    return overrides as unknown as T;
  }
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const [k, v] of Object.entries(overrides)) {
    const cur = (base as any)[k];
    if (Array.isArray(cur) && Array.isArray(v)) {
      out[k] = v; // arrays override by replacement
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = mergeDefaults(cur ?? {}, v as any);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// -----------------------------------------------------------------------------
// Composable view config
// -----------------------------------------------------------------------------
export type BaseViewConfig<TRow> = {
  features: TableFeatures;
  toolbar: ToolbarConfig;
  quickFilters: any[]; // intentionally flexible; views define their own
  buildColumns: (includeActions?: boolean) => ColumnDef<TRow, any>[];
};

export function createViewConfig<TRow>(opts: {
  resourceLabel: string;
  newHref: string;
  buildColumns: (includeActions?: boolean) => ColumnDef<TRow, any>[];
  quickFilters?: any[];
  overrides?: {
    features?: DeepPartial<TableFeatures>;
    toolbar?: DeepPartial<ToolbarConfig>;
  };
}): BaseViewConfig<TRow> {
  const features = mergeDefaults(DEFAULT_FEATURES, opts.overrides?.features);
  const toolbar = mergeDefaults(makeDefaultToolbar(opts.resourceLabel, opts.newHref), opts.overrides?.toolbar);
  const quickFilters = opts.quickFilters ?? [];
  return {
    features,
    toolbar,
    quickFilters,
    buildColumns: opts.buildColumns,
  };
}
