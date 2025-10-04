// -----------------------------------------------------------------------------
// ResourceList.tsx
// Server-rendered page shell that matches the Roles layout 1:1.
// - Uses the SAME Tailwind classes you already have in your Roles page.
// - Table stays a child "island" (client component) passed via `children`.
// - Buttons are non-interactive here (Server Component) — emit data-* for client listeners.
// -----------------------------------------------------------------------------

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export type ToolbarButton = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  href?: string;        // navigation buttons (e.g., New)
  onClickId?: string;   // emitted via data-onclick-id for client islands
  disabled?: boolean;
 ["data-testid"]?: string;
};

export type ResourceListShellProps = {
  // Header
  title: string;                    // e.g. "View Roles"
  count?: number;                   // count badge, optional

  // Top actions (row 1)
  primaryButtons?: ToolbarButton[]; // New / Delete / Duplicate

  // Row 2 (left: print menus, right: clear sorting or save view etc.)
  leftButtons?: ToolbarButton[];    // e.g., Print Report/Invoice/Packing Slip
  rightButtons?: ToolbarButton[];   // e.g., Clear Sorting / Save View / Export CSV

  // Chips (row 2 right area in Roles UI)
  showFilterChip?: boolean;
  showSortingChip?: boolean;

  // Toolbar row (Views / Columns / Sort / More Filters)
  toolbarLeft?: React.ReactNode;    // Usually 4 outline buttons (Views/Columns/Sort/More Filters)
  toolbarRight?: React.ReactNode;   // Usually Save View / Export CSV as buttons

  // Quick filters lane directly beneath toolbar (e.g., Status filter)
  quickFiltersSlot?: React.ReactNode;

  // Table card content
  children: React.ReactNode;

  // Footer (selected count, rows/page select, pagination)
  footerSlot?: React.ReactNode;
};

function RenderButton({ btn, className }: { btn: ToolbarButton; className?: string }) {
  const Icon = btn.icon;
  if (btn.href) {
    return (
      <Button
        variant={btn.variant ?? "default"}
        asChild
        className={className}
        disabled={btn.disabled}
        data-testid={btn["data-testid"]}
      >
        <a href={btn.href}>
          {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
          {btn.label}
        </a>
      </Button>
    );
  }
  return (
    <Button
      variant={btn.variant ?? "default"}
      className={className}
      disabled={btn.disabled}
      data-onclick-id={btn.onClickId || btn.id}
      data-testid={btn["data-testid"]}
    >
      {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
      {btn.label}
    </Button>
  );
}

export default function ResourceList({
  title,
  count,
  primaryButtons,
  leftButtons,
  rightButtons,
  showFilterChip,
  showSortingChip,
  toolbarLeft,
  toolbarRight,
  quickFiltersSlot,
  children,
  footerSlot,
}: ResourceListShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Outer padding/spacing wrapper */}
      <div className="w-full space-y-6 p-4 sm:p-6">
        {/* Header card (matches Roles header) */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {/* Placeholder for page icon to match Roles visual.
                 Keep as-is; consuming page may swap via slot later if desired. */}
              <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 sm:text-2xl">{title}</h1>
              {typeof count === "number" ? (
                <Badge variant="outline" className="ml-2">
                  {count}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions + chips block (matches Roles: two stacked rows inside a card) */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          {/* Row 1: primary buttons (left) + chips (right) */}
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {primaryButtons?.map((btn) => (
                <RenderButton key={btn.id} btn={btn} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {showSortingChip ? (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100" variant="secondary">
                  Sorting Applied
                </Badge>
              ) : null}
              {showFilterChip ? (
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100" variant="secondary">
                  Filter/Sorting Applied
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Row 2: print menus & left buttons + right buttons (e.g., Save View) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {leftButtons?.map((btn) => (
                <RenderButton key={btn.id} btn={btn} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {rightButtons?.map((btn) => (
                <RenderButton key={btn.id} btn={btn} />
              ))}
            </div>
          </div>
        </div>

        {/* Toolbar + quick filters + table + footer in one card (matches Roles) */}
        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          {/* Toolbar header strip (bordered) */}
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                {/* Left: Views / Columns / Sort / More Filters (outline buttons) */}
                <div className="flex flex-wrap items-center gap-2">
                  {toolbarLeft}
                </div>
                {/* Right: usually Export / Save View etc. */}
                <div className="flex flex-wrap items-center gap-2">
                  {toolbarRight}
                </div>
              </div>
            </div>
          </div>

          {/* Quick filters lane (same placement as Roles “more filters” or custom filters) */}
          {quickFiltersSlot ? (
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2">{quickFiltersSlot}</div>
            </div>
          ) : null}

          {/* Table container (child client island mounts here) */}
          <div className="w-full">{children}</div>

          {/* Footer (selected count, rows/page select, pagination) */}
          {footerSlot ? (
            <div className="flex flex-col items-start justify-between gap-4 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center dark:border-gray-700">
              {footerSlot}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
