"use client";

import * as React from "react";
import {
  PanelsTopLeft as ViewsIcon,
  Settings,
  ArrowUpDown,
  Filter,
  Download,
  Save,
  Plus,
  Trash2,
  Copy,
  Printer,
  FileText,
  Package,
  ChevronDown,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

/**
 * Generic + reusable toolbar for all DataTable screens.
 * Pixel-parity with your Roles page (HTML/CSS classnames match your DevTools dump).
 *
 * NOTE: We intentionally emit only data-* attributes for behavior.
 * Hook these up with your existing delegated click listeners (no regressions).
 */

export type ToolbarToggles = {
  // Row 1: primary actions
  showNew?: boolean;
  showDelete?: boolean;
  showDuplicate?: boolean;

  // Optional print menus on row 2 (left cluster). Keep buttons disabled by default.
  showPrintReport?: boolean;
  showPrintInvoice?: boolean;
  showPrintPackingSlip?: boolean;

  // Row 1 right-side chips
  showFilterSortingChip?: boolean;
  showSortingChip?: boolean; // keep for future; currently Roles shows just one orange chip

  // Row 2: left cluster
  showViews?: boolean;
  showColumns?: boolean;
  showSort?: boolean;
  showMoreFilters?: boolean;

  // Row 2: right cluster
  showSaveView?: boolean;
  showExportCsv?: boolean;
};

export type ToolbarDisabled = {
  delete?: boolean;
  duplicate?: boolean;
  printReport?: boolean;
  printInvoice?: boolean;
  printPackingSlip?: boolean;
};

export type DataTableToolbarProps = {
  toggles?: ToolbarToggles;
  disabled?: ToolbarDisabled;

  // Optional test ids
  "data-testid"?: string;

  // If you want to add extra nodes in either cluster later
  leftExtras?: React.ReactNode;
  rightExtras?: React.ReactNode;
};

function OutlineDropdownButton({
  id,
  icon: Icon,
  label,
  disabled,
  toolbarId, // data-toolbar-id to hook behavior
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
  toolbarId?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        data-toolbar-id={toolbarId}
        // Match Roles dropdown trigger classes exactly
        className="justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3 flex items-center gap-2"
        data-slot="dropdown-menu-trigger"
        disabled={disabled}
      >
        <Icon className="h-4 w-4" />
        {label}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>

      {/* Content intentionally empty for now (styling-first).
          Keep as a stub so Radix renders correct semantics. */}
      <DropdownMenuContent align="start" className="min-w-[12rem] p-0"></DropdownMenuContent>
    </DropdownMenu>
  );
}

function PrimaryButton({
  id,
  label,
  icon: Icon,
  variant, // "default" | "destructive" | "outline"
  disabled,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "default" | "destructive" | "outline";
  disabled?: boolean;
}) {
  // Map to Roles visual variants with precise classes
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive has-[>svg]:px-3 h-9 px-4 py-2 shadow-xs";
  const clsByVariant: Record<typeof variant, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50",
    destructive:
      "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
    outline:
      "border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
  };

  return (
    <button
      type="button"
      data-slot="button"
      data-onclick-id={id}
      className={`${base} ${clsByVariant[variant]}`}
      disabled={disabled}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </button>
  );
}

function OutlineButton({
  id,
  label,
  icon: Icon,
  className,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-slot="button"
      data-onclick-id={id}
      className={
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs hover:text-accent-foreground dark:border-input h-9 px-4 py-2 has-[>svg]:px-3 " +
        (className ?? "")
      }
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </button>
  );
}

export default function DataTableToolbar({
  toggles,
  disabled,
  leftExtras,
  rightExtras,
  ...rest
}: DataTableToolbarProps) {
  const t: Required<ToolbarToggles> = {
    showNew: true,
    showDelete: true,
    showDuplicate: true,

    showPrintReport: false,
    showPrintInvoice: false,
    showPrintPackingSlip: false,

    showFilterSortingChip: false,
    showSortingChip: false,

    showViews: true,
    showColumns: true,
    showSort: true,
    showMoreFilters: true,

    showSaveView: true,
    showExportCsv: true,
    ...(toggles ?? {}),
  };

  const d = {
    delete: true,
    duplicate: true,
    printReport: true,
    printInvoice: true,
    printPackingSlip: true,
    ...(disabled ?? {}),
  };

  return (
    <div
      className="border-b border-gray-200 p-4 dark:border-gray-700"
      data-testid={rest["data-testid"] ?? "data-table-toolbar"}
    >
      <div className="flex flex-col gap-4">
        {/* Row 1: primary buttons + chips */}
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {t.showNew && <PrimaryButton id="new" label="New" icon={Plus} variant="default" />}

            {t.showDelete && (
              <PrimaryButton
                id="delete"
                label="Delete"
                icon={Trash2}
                variant="destructive"
                disabled={d.delete}
              />
            )}

            {t.showDuplicate && (
              <PrimaryButton
                id="duplicate"
                label="Duplicate"
                icon={Copy}
                variant="outline"
                disabled={d.duplicate}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {t.showSortingChip ? (
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100"
              >
                Sorting Applied
              </Badge>
            ) : null}

            {t.showFilterSortingChip ? (
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100"
              >
                Filter/Sorting Applied
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Row 2: left cluster (dropdowns) + right cluster (save/export) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {t.showViews && (
              <OutlineDropdownButton
                id="views"
                toolbarId="views"
                label="Views"
                icon={ViewsIcon}
              />
            )}

            {t.showColumns && (
              <OutlineDropdownButton
                id="columns"
                toolbarId="columns"
                label="Columns"
                icon={Settings}
              />
            )}

            {t.showSort && (
              <OutlineDropdownButton id="sort" toolbarId="sort" label="Sort" icon={ArrowUpDown} />
            )}

            {t.showMoreFilters ? (
              <button
                type="button"
                data-slot="button"
                data-toolbar-id="moreFilters"
                className="justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3 flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                More Filters
                <ChevronDown className="h-4 w-4 transition-transform " />
              </button>
            ) : null}

            {/* Optional print menus live here so they’re generic for all screens */}
            {t.showPrintReport && (
              <OutlineDropdownButton
                id="printReport"
                toolbarId="printReport"
                label="Print Report"
                icon={Printer}
                disabled={d.printReport}
              />
            )}
            {t.showPrintInvoice && (
              <OutlineDropdownButton
                id="printInvoice"
                toolbarId="printInvoice"
                label="Print Invoice"
                icon={FileText}
                disabled={d.printInvoice}
              />
            )}
            {t.showPrintPackingSlip && (
              <OutlineDropdownButton
                id="printPackingSlip"
                toolbarId="printPackingSlip"
                label="Print Packing Slip"
                icon={Package}
                disabled={d.printPackingSlip}
              />
            )}

            {leftExtras}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {t.showSaveView && (
              <OutlineButton
                id="saveView"
                label="Save View"
                icon={Save}
                // Roles blue-outline fill:
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
              />
            )}

            {t.showExportCsv && (
              <OutlineButton
                id="exportCsv"
                label="Export CSV"
                icon={Download}
                className="ml-auto bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
              />
            )}

            {rightExtras}
          </div>
        </div>
      </div>
    </div>
  );
}
