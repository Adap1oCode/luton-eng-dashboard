import React from "react";

import { Layout, Settings, ArrowUpDown, Filter, ChevronDown, Download, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/auth/permissions-gate";

// Define proper types
type Column = {
  id: string;
  label: string;
  width: string;
  required?: boolean;
  sortType: "alphabetical" | "date";
  sortOptions: Array<{
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
};

type SortConfig = {
  column: string | null;
  direction: "asc" | "desc" | "none";
  type: "alphabetical" | "date";
};

type SavedView = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  columnOrder: string[];
  visibleColumns: Record<string, boolean>;
  sortConfig: SortConfig;
  createdAt: Date;
};

interface FilterBarProps {
  // Views props
  viewsMenuOpen: boolean;
  setViewsMenuOpen: (open: boolean) => void;
  savedViews: SavedView[];
  currentViewId: string;
  applyView: (view: SavedView) => void;
  handleDeleteView: (viewId: string) => void;
  formatDateSafely: (date: any) => string;

  // Columns props
  columnsMenuOpen: boolean;
  setColumnsMenuOpen: (open: boolean) => void;
  COLUMNS: Column[];
  visibleColumns: Record<string, boolean>;
  displayColumns: Column[];
  isResizing: boolean;
  handleColumnToggle: (columnId: string, visible: boolean) => void;
  handleShowAllColumns: () => void;
  handleHideAllColumns: () => void;
  handleResetColumnOrder: () => void;
  handleDragStart: (e: React.DragEvent, columnId: string) => void;
  handleDragOver: (e: React.DragEvent, columnId: string) => void;
  handleDrop: (e: React.DragEvent, columnId: string) => void;

  // Sort props
  sortMenuOpen: boolean;
  setSortMenuOpen: (open: boolean) => void;
  sortConfig: SortConfig;
  handleSortFromDropdown: (columnId: string, direction: "asc" | "desc" | "none") => void;
  handleClearSorting: () => void;

  // Filter props
  showMoreFilters: boolean;
  setShowMoreFilters: (show: boolean) => void;

  // Action props
  handleExportCSV: () => void;
  setSaveViewDialogOpen: (open: boolean) => void;

  // Menu components
  ViewsMenu: React.ComponentType<any>;
  ColumnsMenu: React.ComponentType<any>;
  SortMenu: React.ComponentType<any>;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  // Views props
  viewsMenuOpen,
  setViewsMenuOpen,
  savedViews,
  currentViewId,
  applyView,
  handleDeleteView,
  formatDateSafely,

  // Columns props
  columnsMenuOpen,
  setColumnsMenuOpen,
  COLUMNS,
  visibleColumns,
  displayColumns,
  isResizing,
  handleColumnToggle,
  handleShowAllColumns,
  handleHideAllColumns,
  handleResetColumnOrder,
  handleDragStart,
  handleDragOver,
  handleDrop,

  // Sort props
  sortMenuOpen,
  setSortMenuOpen,
  sortConfig,
  handleSortFromDropdown,
  handleClearSorting,

  // Filter props
  showMoreFilters,
  setShowMoreFilters,

  // Action props
  handleExportCSV,
  setSaveViewDialogOpen,

  // Menu components
  ViewsMenu,
  ColumnsMenu,
  SortMenu,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {/* Views Menu */}
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
                onApplyView={applyView}
                onDeleteView={handleDeleteView}
                formatDate={formatDateSafely}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Columns Menu */}
          <DropdownMenu open={columnsMenuOpen} onOpenChange={setColumnsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Columns
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[320px]">
              <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">Show/Hide Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ColumnsMenu
                columns={COLUMNS}
                visibleColumns={visibleColumns}
                displayColumnsCount={displayColumns.length}
                isResizing={isResizing}
                onColumnToggle={handleColumnToggle}
                onShowAll={handleShowAllColumns}
                onHideAll={handleHideAllColumns}
                onResetOrder={handleResetColumnOrder}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Menu */}
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
                onSort={handleSortFromDropdown}
                onClearAll={handleClearSorting}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            More Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
          </Button>
        </div>

        <div className="flex gap-2">
          <PermissionGate any={["screen:roles:export"]}>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </PermissionGate>

          <Button
            variant="outline"
            onClick={() => setSaveViewDialogOpen(true)}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <Save className="mr-2 h-4 w-4" />
            Save View
          </Button>
        </div>
      </div>
    </div>
  );
};
