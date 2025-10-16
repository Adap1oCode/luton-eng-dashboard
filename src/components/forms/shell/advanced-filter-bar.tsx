"use client";

import React, { useState } from "react";

import { Layout, Settings, ArrowUpDown, Filter, ChevronDown, Download, Save } from "lucide-react";

import { ColumnsMenu } from "@/components/data-table/columns-menu";
import { SortMenu } from "@/components/data-table/sort-menu";
import { ViewsMenu } from "@/components/data-table/views-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Import the menu components

// Use the same types as the imported components to avoid conflicts
type SortDirection = "asc" | "desc" | "none";

interface SortOption {
  label: string;
  value: SortDirection;
  icon: React.ComponentType<{ className?: string }>;
}

type Column = {
  id: string;
  label: string;
  width?: string;
  required?: boolean;
  sortType?: "alphabetical" | "date";
  sortOptions: SortOption[];
};

type SortConfig = {
  column: string | null;
  direction: SortDirection;
  type?: "alphabetical" | "date";
};

// Match the SavedView type from ViewsMenu
type SavedView = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  columnOrder: string[];
  visibleColumns: Record<string, boolean>;
  sortConfig: {
    column: string | null;
    direction: string; // ViewsMenu expects string, not SortDirection
    type: "alphabetical" | "date";
  };
  createdAt: Date;
};

interface AdvancedFilterBarProps {
  // Column management props
  COLUMNS?: Column[];
  visibleColumns?: Record<string, boolean>;
  displayColumns?: Column[];
  isResizing?: boolean;
  onColumnToggle?: (columnId: string, visible: boolean) => void;
  onShowAllColumns?: () => void;
  onHideAllColumns?: () => void;
  onResetColumnOrder?: () => void;
  onDragStart?: (e: React.DragEvent, columnId: string) => void;
  onDragOver?: (e: React.DragEvent, columnId: string) => void;
  onDrop?: (e: React.DragEvent, columnId: string) => void;

  // Sort props
  sortConfig?: { column: string | null; direction: SortDirection }; // Match SortMenu expectation
  onSortFromDropdown?: (columnId: string, direction: SortDirection) => void;
  onClearSorting?: () => void;

  // Views props
  savedViews?: SavedView[];
  currentViewId?: string;
  onApplyView?: (view: SavedView) => void;
  onDeleteView?: (viewId: string) => void;
  formatDateSafely?: (date: any) => string;

  // Action props
  onExportCSV?: () => void;
  onSaveView?: () => void;

  // Toolbar props
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;

  // Button visibility controls
  showViewsButton?: boolean;
  showColumnsButton?: boolean;
  showSortButton?: boolean;
  showMoreFiltersButton?: boolean;
  showExportButton?: boolean;
  showSaveViewButton?: boolean;

  // Column functionality controls
  enableColumnResizing?: boolean;
  enableColumnReordering?: boolean;
}

export const AdvancedFilterBar: React.FC<AdvancedFilterBarProps> = ({
  COLUMNS = [],
  visibleColumns = {},
  displayColumns = [],
  isResizing = false,
  onColumnToggle = () => {},
  onShowAllColumns = () => {},
  onHideAllColumns = () => {},
  onResetColumnOrder = () => {},
  onDragStart = () => {},
  onDragOver = () => {},
  onDrop = () => {},
  sortConfig = { column: null, direction: "none" },
  onSortFromDropdown = () => {},
  onClearSorting = () => {},
  savedViews = [],
  currentViewId = "",
  onApplyView = () => {},
  onDeleteView = () => {},
  formatDateSafely = (date: any) => new Date(date).toLocaleDateString(),
  onExportCSV = () => {},
  onSaveView = () => {},
  toolbarLeft,
  toolbarRight,
  // Default values for button visibility
  showViewsButton = true,
  showColumnsButton = true,
  showSortButton = true,
  showMoreFiltersButton = true,
  showExportButton = true,
  showSaveViewButton = true,

  // Default values for column functionality
  enableColumnResizing = false,
  enableColumnReordering = false,
}) => {
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {toolbarLeft ?? (
            <>
              {/* Views Menu */}
              {showViewsButton && (
                <DropdownMenu open={viewsMenuOpen} onOpenChange={setViewsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      Views
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">Saved Views</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ViewsMenu
                      views={savedViews}
                      currentViewId={currentViewId}
                      onApplyView={onApplyView}
                      onDeleteView={onDeleteView}
                      formatDate={formatDateSafely}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Columns Menu */}
              {showColumnsButton && (
                <DropdownMenu open={columnsMenuOpen} onOpenChange={setColumnsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Columns
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[320px]">
                    <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">
                      Show/Hide Columns
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ColumnsMenu
                      columns={COLUMNS}
                      visibleColumns={visibleColumns}
                      displayColumnsCount={displayColumns.length}
                      isResizing={isResizing}
                      onColumnToggle={onColumnToggle}
                      onShowAll={onShowAllColumns}
                      onHideAll={onHideAllColumns}
                      onResetOrder={onResetColumnOrder}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Sort Menu */}
              {showSortButton && (
                <DropdownMenu open={sortMenuOpen} onOpenChange={setSortMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Sort
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">Sort by Column</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <SortMenu
                      columns={COLUMNS}
                      sortConfig={sortConfig}
                      onSort={onSortFromDropdown}
                      onClearAll={onClearSorting}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {showMoreFiltersButton && (
                <Button
                  variant="outline"
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  More Filters
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          {toolbarRight ?? (
            <>
              {showExportButton && (
                <Button
                  variant="outline"
                  onClick={onExportCSV}
                  className="bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}

              {showSaveViewButton && (
                <Button
                  variant="outline"
                  onClick={onSaveView}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save View
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
