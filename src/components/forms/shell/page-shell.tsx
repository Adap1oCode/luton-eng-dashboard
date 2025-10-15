// -----------------------------------------------------------------------------
// FILE: src/components/forms/shell/PageShell.tsx
// TYPE: Server Component
// PURPOSE: Shared server shell for Forms list screens (Roles-parity header/cards)
// -----------------------------------------------------------------------------

import * as React from "react";

import { ChevronDown, Layout, Settings, ArrowUpDown, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { AdvancedFilterBar } from "./advanced-filter-bar";
import { RenderButtonCluster } from "./render-button-cluster";
import Toolbar from "./toolbar/toolbar";
import type { ToolbarButton, ToolbarConfig, ChipsConfig, ActionConfig } from "./toolbar/types";

type PageShellProps = {
  // Header
  title: string;
  count?: number;

  // Row 1 action buttons (left cluster) — legacy props (kept for backwards compat)
  primaryButtons?: ToolbarButton[];

  // Row 2 action bars (left/right clusters) — legacy props (kept for backwards compat)
  leftButtons?: ToolbarButton[];
  rightButtons?: ToolbarButton[];

  // Chips (Row 1 right) — legacy props (kept for backwards compat)
  showFilterChip?: boolean;
  showSortingChip?: boolean;

  // NEW: Preferred config-driven inputs (take priority over legacy props)
  toolbarConfig?: ToolbarConfig;
  toolbarActions?: ActionConfig;
  chipConfig?: ChipsConfig;

  // Toolbar area immediately above the table (left/right or a complete custom slot)
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  toolbarSlot?: React.ReactNode;

  // Optional quick filters lane (between toolbar and table)
  quickFiltersSlot?: React.ReactNode;

  // Main content (table island)
  children: React.ReactNode;

  // Footer (selected count, rows/page, pagination)
  footerSlot?: React.ReactNode;

  // Advanced filter bar configuration
  enableAdvancedFilters?: boolean;
};

export default function PageShell({
  title,
  count,
  primaryButtons,
  leftButtons,
  rightButtons,
  showFilterChip,
  showSortingChip,
  toolbarConfig,
  toolbarActions,
  chipConfig,
  toolbarLeft,
  toolbarRight,
  toolbarSlot,
  quickFiltersSlot,
  children,
  footerSlot,
  enableAdvancedFilters = true,
}: PageShellProps) {
  // ---- Effective buttons & chips (config takes precedence; legacy as fallback) ----
  const effectivePrimary = toolbarConfig?.primary ?? primaryButtons ?? [];
  const effectiveLeft = toolbarConfig?.left ?? leftButtons ?? [];
  const effectiveRight = toolbarConfig?.right ?? rightButtons ?? [];

  const effectiveShowFilter = (typeof chipConfig?.filter === "boolean" ? chipConfig.filter : showFilterChip) ?? false;
  const effectiveShowSorting =
    (typeof chipConfig?.sorting === "boolean" ? chipConfig.sorting : showSortingChip) ?? false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Outer padding/spacing wrapper */}
      <div className="w-full space-y-6 p-4 sm:p-6">
        {/* Header card (Roles parity) */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">{title}</h1>
              {typeof count === "number" ? (
                <Badge variant="outline" className="ml-2">
                  {count}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions + chips block (two rows) */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          {/* Row 1: primary buttons + chips */}
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <RenderButtonCluster buttons={effectivePrimary} />
            <div className="flex flex-wrap items-center gap-4">
              {effectiveShowSorting ? (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100" variant="secondary">
                  Sorting Applied
                </Badge>
              ) : null}
              {effectiveShowFilter ? (
                <Badge
                  className="bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100"
                  variant="secondary"
                >
                  Filter/Sorting Applied
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Row 2: Use Toolbar component with actions support */}
          <Toolbar config={toolbarConfig} actions={toolbarActions} />
        </div>

        {/* Toolbar + quick filters + table + footer card */}
        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          {/* Advanced Filter Bar */}
          {toolbarSlot ? (
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">{toolbarSlot}</div>
          ) : enableAdvancedFilters ? (
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <AdvancedFilterBar toolbarLeft={toolbarLeft} toolbarRight={toolbarRight} />
            </div>
          ) : (
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    {toolbarLeft ?? (
                      <>
                        <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="views">
                          <Layout className="h-4 w-4" />
                          Views
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="columns">
                          <Settings className="h-4 w-4" />
                          Columns
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="sort">
                          <ArrowUpDown className="h-4 w-4" />
                          Sort
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="moreFilters">
                          <Filter className="h-4 w-4" />
                          More Filters
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {toolbarRight ?? <RenderButtonCluster buttons={effectiveRight} />}
                  </div>
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
