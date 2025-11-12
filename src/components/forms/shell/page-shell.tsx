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
import { OptimisticProvider } from "./optimistic-context";
import { PageShellClientWrapper } from "./page-shell-client";
import { RenderButtonCluster } from "./render-button-cluster";
import Toolbar from "./toolbar/toolbar";
import type { ToolbarButton, ToolbarConfig, ChipsConfig, ActionConfig } from "./toolbar/types";

export type PageShellProps = {
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

  // Button visibility controls for AdvancedFilterBar
  showViewsButton?: boolean;
  showColumnsButton?: boolean;
  showSortButton?: boolean;
  showMoreFiltersButton?: boolean;
  showExportButton?: boolean;
  showSaveViewButton?: boolean;

  // Column functionality controls
  enableColumnResizing?: boolean;
  enableColumnReordering?: boolean;

  // ✅ New: showToolbarContainer property
  showToolbarContainer?: boolean;

  // ✅ جديد: حِزمة خصائص تُمرَّر للـ AdvancedFilterBar لتوصيل الأعمدة والفرز والعروض
  advancedFilterBarProps?: AdvancedFilterBarPropBag;
  
  // Enhanced loading props (passed to client wrapper)
  isLoading?: boolean;
  loadingTitle?: string;
  loadingDescription?: string;
  isRefetching?: boolean;
  refetchMessage?: string;
  refetchPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
};

// حِزمة خصائص قابلة للتمرير لـ AdvancedFilterBar (كلها اختيارية)
type AdvancedFilterBarPropBag = {
  // Column management
  COLUMNS?: any[];
  visibleColumns?: Record<string, boolean>;
  displayColumns?: any[];
  isResizing?: boolean;
  onColumnToggle?: (columnId: string, visible: boolean) => void;
  onShowAllColumns?: () => void;
  onHideAllColumns?: () => void;
  onResetColumnOrder?: () => void;
  onDragStart?: (e: React.DragEvent, columnId: string) => void;
  onDragOver?: (e: React.DragEvent, columnId: string) => void;
  onDrop?: (e: React.DragEvent, columnId: string) => void;

  // Sort
  sortConfig?: { column: string | null; direction: "asc" | "desc" | "none" };
  onSortFromDropdown?: (columnId: string, direction: "asc" | "desc" | "none") => void;
  onClearSorting?: () => void;

  // Views
  savedViews?: any[];
  currentViewId?: string;
  onApplyView?: (view: any) => void;
  onDeleteView?: (viewId: string) => void;
  formatDateSafely?: (date: any) => string;

  // Actions
  onExportCSV?: () => void;
  onSaveView?: () => void;

  // Button visibility + column capabilities (Overrides)
  showViewsButton?: boolean;
  showColumnsButton?: boolean;
  showSortButton?: boolean;
  showMoreFiltersButton?: boolean;
  showExportButton?: boolean;
  showSaveViewButton?: boolean;
  enableColumnResizing?: boolean;
  enableColumnReordering?: boolean;

  // Optional toolbar slots
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
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
  // Button visibility controls with default values
  showViewsButton = true,
  showColumnsButton = true,
  showSortButton = true,
  showMoreFiltersButton = true,
  showExportButton = true,
  showSaveViewButton = true,

  // Column functionality controls with default values
  enableColumnResizing = true,
  enableColumnReordering = true,

  // ✅ جديد
  advancedFilterBarProps,
  showToolbarContainer = true, // جديد: القيمة الافتراضية
  
  // Enhanced loading props (passed to client wrapper)
  isLoading = false,
  loadingTitle = "Loading...",
  loadingDescription = "Please wait...",
  isRefetching = false,
  refetchMessage = "Updating...",
  refetchPosition = 'top-right',
}: PageShellProps) {
  // ---- Effective buttons & chips (config precedence; legacy fallback) ----
  const effectivePrimary = toolbarConfig?.primary ?? primaryButtons ?? [];
  const effectiveLeft = toolbarConfig?.left ?? leftButtons ?? [];
  const effectiveRight = toolbarConfig?.right ?? rightButtons ?? [];

  const effectiveShowFilter = (typeof chipConfig?.filter === "boolean" ? chipConfig.filter : showFilterChip) ?? false;
  const effectiveShowSorting =
    (typeof chipConfig?.sorting === "boolean" ? chipConfig.sorting : showSortingChip) ?? false;

  // Only show Actions + chips block if there's something to render
  const hasActionsToShow = 
    effectivePrimary.length > 0 || 
    effectiveLeft.length > 0 || 
    effectiveRight.length > 0 || 
    effectiveShowFilter || 
    effectiveShowSorting;

  return (
    <PageShellClientWrapper title={title} count={count}>
      <div className="min-h-screen rounded-2xl border bg-gray-50 dark:bg-gray-900">
        {/* Outer padding/spacing wrapper */}
        <div className="w-full space-y-6 p-4 sm:p-6">
          {/* Header card removed - title and count now in layout header */}

            {/* Actions + chips block (two rows) - only render if there's content */}
          {hasActionsToShow && (
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
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

            {/* Row 2: Use Toolbar component with actions support + custom toolbarRight */}
            <div className="flex items-center justify-between gap-3">
              <Toolbar config={toolbarConfig} actions={toolbarActions} />
              {toolbarRight && <div className="flex items-center">{toolbarRight}</div>}
            </div>
            </div>
          )}

          {/* Toolbar + quick filters + table + footer card */}
          {/* داخل JSX الخاص بمكون PageShell */}
          <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
            {/* Advanced Filter Bar */}
            {showToolbarContainer ? (
              toolbarSlot ? (
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">{toolbarSlot}</div>
              ) : enableAdvancedFilters ? (
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                  <AdvancedFilterBar
                    // ✅ تمرير الـ slots لو متوفرة من الحِزمة وإلا استخدم props الحالية
                    toolbarLeft={advancedFilterBarProps?.toolbarLeft ?? toolbarLeft}
                    toolbarRight={advancedFilterBarProps?.toolbarRight ?? toolbarRight}
                    // ✅ تحكم إظهار الأزرار (حِزمة > props)
                    showViewsButton={advancedFilterBarProps?.showViewsButton ?? showViewsButton}
                    showColumnsButton={advancedFilterBarProps?.showColumnsButton ?? showColumnsButton}
                    showSortButton={advancedFilterBarProps?.showSortButton ?? showSortButton}
                    showMoreFiltersButton={advancedFilterBarProps?.showMoreFiltersButton ?? showMoreFiltersButton}
                    showExportButton={false} // ✅ إخفاء زر Export من الـ AdvancedFilterBar لمنع التكرار
                    showSaveViewButton={advancedFilterBarProps?.showSaveViewButton ?? showSaveViewButton}
                    // ✅ إمكانيات الأعمدة (حِزمة > props)
                    enableColumnResizing={advancedFilterBarProps?.enableColumnResizing ?? enableColumnResizing}
                    enableColumnReordering={advancedFilterBarProps?.enableColumnReordering ?? enableColumnReordering}
                    // ✅ إدارة الأعمدة
                    COLUMNS={advancedFilterBarProps?.COLUMNS}
                    visibleColumns={advancedFilterBarProps?.visibleColumns}
                    displayColumns={advancedFilterBarProps?.displayColumns}
                    isResizing={advancedFilterBarProps?.isResizing}
                    onColumnToggle={advancedFilterBarProps?.onColumnToggle}
                    onShowAllColumns={advancedFilterBarProps?.onShowAllColumns}
                    onHideAllColumns={advancedFilterBarProps?.onHideAllColumns}
                    onResetColumnOrder={advancedFilterBarProps?.onResetColumnOrder}
                    onDragStart={advancedFilterBarProps?.onDragStart}
                    onDragOver={advancedFilterBarProps?.onDragOver}
                    onDrop={advancedFilterBarProps?.onDrop}
                    // ✅ الفرز
                    sortConfig={advancedFilterBarProps?.sortConfig}
                    onSortFromDropdown={advancedFilterBarProps?.onSortFromDropdown}
                    onClearSorting={advancedFilterBarProps?.onClearSorting}
                    // ✅ العروض المحفوظة + الأكشنز
                    savedViews={advancedFilterBarProps?.savedViews}
                    currentViewId={advancedFilterBarProps?.currentViewId}
                    onApplyView={advancedFilterBarProps?.onApplyView}
                    onDeleteView={advancedFilterBarProps?.onDeleteView}
                    formatDateSafely={advancedFilterBarProps?.formatDateSafely}
                    onExportCSV={advancedFilterBarProps?.onExportCSV}
                    onSaveView={advancedFilterBarProps?.onSaveView}
                  />
                </div>
              ) : null
            ) : null}

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
    </PageShellClientWrapper>
  );
}
