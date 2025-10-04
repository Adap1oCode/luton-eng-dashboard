"use client";

// -----------------------------------------------------------------------------
// shell-client.tsx
// Roles-accurate page shell used by list screens (e.g., Tally Cards).
// - Pixel-parity with Roles for: header card, two action rows, toolbar strip,
//   optional quick-filters lane, table container, and footer.
// - Backward-compatible: all new props are optional.
// - Adds dropdown support (shadcn) when a button provides `menu`.
// -----------------------------------------------------------------------------

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type ToolbarButton = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  href?: string;        // navigation buttons (e.g., New)
  onClickId?: string;   // emitted via data-onclick-id for client listeners
  disabled?: boolean;
  ["data-testid"]?: string;
  className?: string;   // exact Tailwind from Roles (e.g., orange "New", blue "Save View")
  trailingIcon?: React.ComponentType<{ className?: string }>;
  menu?: {
    align?: "start" | "end";
    items: Array<{
      id: string;
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      href?: string;
      onClickId?: string;
      disabled?: boolean;
    }>;
  };
};

export type ShellClientProps = {
  // Header
  title: string;                    // e.g. "View Tally Cards"
  count?: number;                   // right-side count badge in header

  // Row 1 actions
  primaryButtons?: ToolbarButton[]; // New / Delete / Duplicate

  // Row 2 actions
  leftButtons?: ToolbarButton[];    // Print Report / Print Invoice / Print Packing Slip (dropdowns)
  rightButtons?: ToolbarButton[];   // e.g., Save View

  // Chips on row 1 right (Roles parity)
  showFilterChip?: boolean;
  showSortingChip?: boolean;

  // Table toolbar strip (Views / Columns / Sort / More Filters)
  toolbarLeft?: React.ReactNode;    // left cluster of outline buttons (legacy)
  toolbarRight?: React.ReactNode;   // right cluster (legacy)
  toolbarSlot?: React.ReactNode;    // NEW: full custom toolbar drop-in

  // Optional quick-filters lane directly under toolbar
  quickFiltersSlot?: React.ReactNode;

  // Main content (DataTable island)
  children: React.ReactNode;

  // Footer (selected count, rows/page, pagination, etc.)
  footerSlot?: React.ReactNode;
};

// -----------------------------------------------------------------------------
// Button renderer
// -----------------------------------------------------------------------------

export function RenderButton({ btn, className }: { btn: ToolbarButton; className?: string }) {
  const Icon = btn.icon;
  const Trailing = btn.trailingIcon;
  const merged = [className, btn.className].filter(Boolean).join(" ");

  // Dropdown button (used by Print* buttons to match Roles UX exactly)
  if (btn.menu && btn.menu.items?.length) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={btn.variant ?? "outline"}
            className={merged}
            disabled={btn.disabled}
            data-testid={btn["data-testid"]}
          >
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            {btn.label}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={btn.menu.align ?? "start"}>
          {btn.menu.items.map((it) =>
            it.href ? (
              <DropdownMenuItem key={it.id} asChild disabled={it.disabled}>
                <a href={it.href}>
                  {it.icon ? <it.icon className="mr-2 h-4 w-4" /> : null}
                  {it.label}
                </a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={it.id}
                disabled={it.disabled}
                data-onclick-id={it.onClickId || it.id}
              >
                {it.icon ? <it.icon className="mr-2 h-4 w-4" /> : null}
                {it.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Link button (navigates)
  if (btn.href) {
    return (
      <Button
        variant={btn.variant ?? "default"}
        asChild
        className={merged}
        disabled={btn.disabled}
        data-testid={btn["data-testid"]}
      >
        <a href={btn.href}>
          {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
          {btn.label}
          {Trailing ? <Trailing className="ml-2 h-4 w-4" /> : null}
        </a>
      </Button>
    );
  }

  // Plain action button (delegated via data-onclick-id)
  return (
    <Button
      variant={btn.variant ?? "default"}
      className={merged}
      disabled={btn.disabled}
      data-onclick-id={btn.onClickId || btn.id}
      data-testid={btn["data-testid"]}
    >
      {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
      {btn.label}
      {Trailing ? <Trailing className="ml-2 h-4 w-4" /> : null}
    </Button>
  );
}

// -----------------------------------------------------------------------------
// Shell
// -----------------------------------------------------------------------------

export default function ShellClient({
  title,
  count,
  primaryButtons,
  leftButtons,
  rightButtons,
  showFilterChip,
  showSortingChip,
  toolbarLeft,
  toolbarRight,
  toolbarSlot,           // NEW
  quickFiltersSlot,
  children,
  footerSlot,
}: ShellClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Outer padding/spacing wrapper */}
      <div className="w-full space-y-6 p-4 sm:p-6">
        {/* Header card (matches Roles header) */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {/* Same icon treatment as Roles */}
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

        {/* Actions + chips block (two stacked rows inside a card) */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          {/* Row 1: primary buttons + chips */}
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

          {/* Row 2: left buttons (prints) + right buttons (save/export/clear) */}
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

        {/* Toolbar + quick filters + table + footer in one card */}
        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          {/* Toolbar header strip */}
          {toolbarSlot ? (
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              {toolbarSlot}
            </div>
          ) : (
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex flex-wrap items-center gap-2">{toolbarLeft}</div>
                  <div className="flex flex-wrap items-center gap-2">{toolbarRight}</div>
                </div>
              </div>
            </div>
          )}

          {/* Optional quick filters lane */}
          {quickFiltersSlot ? (
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2">{quickFiltersSlot}</div>
            </div>
          ) : null}

          {/* Table container */}
          <div className="w-full">{children}</div>

          {/* Footer */}
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
