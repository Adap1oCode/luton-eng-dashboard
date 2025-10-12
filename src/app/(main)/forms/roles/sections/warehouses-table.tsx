"use client";

import { useMemo, useState, useRef } from "react";

import { ArrowUpDown } from "lucide-react";

import { useColumnResize } from "@/components/data-table/use-column-resize";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { ActionMenu } from "../Templete/action-menu";
import { ColumnsMenu } from "../Templete/columns-menu";
import { FilterBar } from "../Templete/filter-bar";
import { Pagination } from "../Templete/pagination";
import { SaveViewDialog } from "../Templete/save-view-dialog";
import { SortMenu } from "../Templete/sort-menu";
import { TableColumn } from "../Templete/table-column";
import { TableHeader } from "../Templete/table-header";
import { TableRow } from "../Templete/table-row";
import { ViewsMenu } from "../Templete/views-menu";

interface WarehouseRow {
  warehouse: string;
  note: string | null;
  added_at: string;
  added_by: string | null;
}

interface ExpandedRowDetailsProps {
  warehouse: WarehouseRow;
  colSpan: number;
}

const ExpandedRowDetails: React.FC<ExpandedRowDetailsProps> = ({ warehouse, colSpan }) => {
  return (
    <tr className="bg-gray-50 dark:bg-gray-800">
      <td colSpan={colSpan} className="p-4">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Warehouse Details: {warehouse.warehouse}</h4>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm dark:border-gray-500">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">Warehouse</th>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">Note</th>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">Added At</th>
                  <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">Added By</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{warehouse.warehouse}</td>
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{warehouse.note ?? "—"}</td>
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{warehouse.added_at}</td>
                  <td className="border border-gray-200 p-3 dark:border-gray-700">{warehouse.added_by ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </td>
    </tr>
  );
};

type Assigned = {
  warehouse: string; // role_warehouse_rules.warehouse
  note: string | null;
  added_at: string;
  added_by: string | null; // optional
};

type Props = {
  form: {
    assigned: Assigned[];
    assignedQuery: string;
    setAssignedQuery: (v: string) => void;

    selectedAssigned: Set<string>; // set of warehouse codes
    toggleAssigned: (warehouse: string) => void;
    clearSelection: () => void;

    removeSelected: () => Promise<void>;
    isMutating: boolean;
  };
};

export function WarehousesTable({ form }: Props) {
  // Table state - move filters declaration before useMemo
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Column configuration - Updated to match FilterBar Column type
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

  const COLUMNS: Column[] = [
    {
      id: "warehouse",
      label: "Warehouse",
      width: "30%",
      required: true,
      sortType: "alphabetical",
      sortOptions: [
        { label: "A to Z", value: "asc", icon: ArrowUpDown },
        { label: "Z to A", value: "desc", icon: ArrowUpDown },
        { label: "Clear", value: "none", icon: ArrowUpDown },
      ],
    },
    {
      id: "note",
      label: "Note",
      width: "40%",
      required: false,
      sortType: "alphabetical",
      sortOptions: [
        { label: "A to Z", value: "asc", icon: ArrowUpDown },
        { label: "Z to A", value: "desc", icon: ArrowUpDown },
        { label: "Clear", value: "none", icon: ArrowUpDown },
      ],
    },
    {
      id: "added_at",
      label: "Added At",
      width: "30%",
      required: true,
      sortType: "date",
      sortOptions: [
        { label: "Newest First", value: "desc", icon: ArrowUpDown },
        { label: "Oldest First", value: "asc", icon: ArrowUpDown },
        { label: "Clear", value: "none", icon: ArrowUpDown },
      ],
    },
  ];

  const tableRef = useRef<HTMLTableElement>(null);
  const initialWidths = COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: parseFloat(col.width) }), {});
  const { widths, onMouseDownResize } = useColumnResize(initialWidths, tableRef);

  const filtered = useMemo(() => {
    const q = (form.assignedQuery ?? "").trim().toUpperCase();
    return form.assigned.filter((r) => {
      if (q && !r.warehouse.toUpperCase().includes(q) && !(r.note ?? "").toUpperCase().includes(q)) return false;
      for (const [colId, term] of Object.entries(filters)) {
        if (term) {
          const value = (r[colId as keyof Assigned] ?? "").toString().toUpperCase();
          if (!value.includes(term.toUpperCase())) return false;
        }
      }
      return true;
    });
  }, [form.assigned, form.assignedQuery, filters]);

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    warehouse: true,
    note: true,
    added_at: true,
  });

  const [columnOrder, setColumnOrder] = useState(COLUMNS.map((col) => col.id));

  // Add displayColumns definition
  const displayColumns = columnOrder
    .map((id) => COLUMNS.find((col) => col.id === id))
    .filter((col): col is Column => !!col)
    .filter((col) => visibleColumns[col.id]);

  // Sort configuration
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: "asc" | "desc" | "none";
    type: "alphabetical" | "date";
  }>({
    column: null,
    direction: "none",
    type: "alphabetical",
  });

  // Saved views (mock data)
  const [savedViews, setSavedViews] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      isDefault: boolean;
      columnOrder: string[];
      visibleColumns: Record<string, boolean>;
      sortConfig: {
        column: string | null;
        direction: "asc" | "desc" | "none";
        type: "alphabetical" | "date";
      };
      createdAt: Date;
    }>
  >([
    {
      id: "default",
      name: "Default View",
      description: "Default warehouse view",
      isDefault: true,
      columnOrder: ["warehouse", "note", "added_at"],
      visibleColumns: { warehouse: true, note: true, added_at: true },
      sortConfig: { column: null, direction: "none", type: "alphabetical" },
      createdAt: new Date(),
    },
  ]);
  const [currentViewId, setCurrentViewId] = useState("default");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Helper functions
  const toggleExpandRow = (warehouse: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(warehouse)) {
        newSet.delete(warehouse);
      } else {
        newSet.add(warehouse);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (form.selectedAssigned.size === filtered.length && filtered.length > 0) {
      form.clearSelection();
    } else {
      filtered.forEach((row) => {
        if (!form.selectedAssigned.has(row.warehouse)) {
          form.toggleAssigned(row.warehouse);
        }
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>, columnId: string) => {
    onMouseDownResize(e, columnId);
  };

  // Column management handlers
  const handleColumnToggle = (columnId: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const handleShowAllColumns = () => {
    const allVisible = COLUMNS.reduce(
      (acc, col) => {
        acc[col.id] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
    setVisibleColumns(allVisible);
  };

  const handleHideAllColumns = () => {
    const allHidden = COLUMNS.reduce(
      (acc, col) => {
        acc[col.id] = col.required || false; // Keep required columns visible
        return acc;
      },
      {} as Record<string, boolean>,
    );
    setVisibleColumns(allHidden);
  };

  const handleResetColumnOrder = () => {
    // Reset to default column visibility and order
    setVisibleColumns({
      warehouse: true,
      note: true,
      added_at: true,
    });
    setColumnOrder(COLUMNS.map((col) => col.id));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    e.dataTransfer.setData("columnId", columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("columnId");
    if (sourceId !== columnId) {
      setColumnOrder((prev) => {
        const newOrder = [...prev];
        const sourceIndex = newOrder.indexOf(sourceId);
        const targetIndex = newOrder.indexOf(columnId);
        if (sourceIndex !== -1 && targetIndex !== -1) {
          newOrder.splice(sourceIndex, 1);
          newOrder.splice(targetIndex, 0, sourceId);
        }
        return newOrder;
      });
    }
    setDragOverColumn(null);
  };

  // Sort handlers
  const handleSortFromDropdown = (columnId: string, direction: "asc" | "desc" | "none") => {
    const column = COLUMNS.find((col) => col.id === columnId);
    if (column) {
      setSortConfig({
        column: direction === "none" ? null : columnId,
        direction,
        type: column.sortType,
      });
    }
  };

  const handleClearSorting = () => {
    setSortConfig({
      column: null,
      direction: "none",
      type: "alphabetical",
    });
  };

  // View management
  const applyView = (view: (typeof savedViews)[0]) => {
    setVisibleColumns(view.visibleColumns);
    setColumnOrder(view.columnOrder);
    setSortConfig(view.sortConfig);
    setCurrentViewId(view.id);
    setViewsMenuOpen(false);
  };

  const handleDeleteView = (viewId: string) => {
    // Mock implementation - would delete the view in a real app
    console.log("Delete view:", viewId);
  };

  const formatDateSafely = (date: Date) => {
    return date.toLocaleDateString();
  };

  // Mock action handlers
  const handleExportCSV = () => {
    console.log("Export CSV");
  };

  const openSaveViewDialog = () => {
    setSaveViewDialogOpen(true);
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;

    const newView = {
      id: Date.now().toString(),
      name: viewName,
      description: viewDescription,
      isDefault: false,
      columnOrder: displayColumns.map((c) => c.id),
      visibleColumns: { ...visibleColumns },
      sortConfig: { ...sortConfig },
      createdAt: new Date(),
    };

    setSavedViews((prev) => [...prev, newView]);
    setSaveViewDialogOpen(false);
    setViewName("");
    setViewDescription("");
  };

  return (
    <Card className="@container/card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Assigned Warehouses</CardTitle>
          <CardDescription>Warehouses where this role applies.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filter…"
            value={form.assignedQuery}
            onChange={(e) => form.setAssignedQuery(e.target.value)}
            className="w-[220px]"
          />
          <Button
            variant="destructive"
            onClick={form.removeSelected}
            disabled={!form.selectedAssigned.size || form.isMutating}
          >
            Remove
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter Bar */}
        <FilterBar
          viewsMenuOpen={viewsMenuOpen}
          setViewsMenuOpen={setViewsMenuOpen}
          savedViews={savedViews}
          currentViewId={currentViewId}
          applyView={applyView}
          handleDeleteView={handleDeleteView}
          formatDateSafely={formatDateSafely}
          columnsMenuOpen={columnsMenuOpen}
          setColumnsMenuOpen={setColumnsMenuOpen}
          COLUMNS={COLUMNS}
          visibleColumns={visibleColumns}
          displayColumns={displayColumns}
          isResizing={isResizing}
          handleColumnToggle={handleColumnToggle}
          handleShowAllColumns={handleShowAllColumns}
          handleHideAllColumns={handleHideAllColumns}
          handleResetColumnOrder={handleResetColumnOrder}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          sortMenuOpen={sortMenuOpen}
          setSortMenuOpen={setSortMenuOpen}
          sortConfig={sortConfig}
          handleSortFromDropdown={handleSortFromDropdown}
          handleClearSorting={handleClearSorting}
          showMoreFilters={showMoreFilters}
          setShowMoreFilters={setShowMoreFilters}
          handleExportCSV={handleExportCSV}
          setSaveViewDialogOpen={openSaveViewDialog}
          ViewsMenu={ViewsMenu}
          ColumnsMenu={ColumnsMenu}
          SortMenu={SortMenu}
        />

        <SaveViewDialog
          open={saveViewDialogOpen}
          viewName={viewName}
          viewDescription={viewDescription}
          visibleColumnsCount={Object.values(visibleColumns).filter((v) => v).length}
          sortingInfo={
            sortConfig.column
              ? `Sorted by: ${COLUMNS.find((c) => c.id === sortConfig.column)?.label} ${sortConfig.direction.toUpperCase()}`
              : "No sorting applied"
          }
          columnOrderCount={displayColumns.length}
          onOpenChange={setSaveViewDialogOpen}
          onViewNameChange={setViewName}
          onViewDescriptionChange={setViewDescription}
          onSave={handleSaveView}
        />

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table
            ref={tableRef}
            style={{ tableLayout: "fixed" }}
            className="w-full border border-gray-200 text-sm dark:border-gray-500"
          >
            <TableHeader
              isAllSelected={form.selectedAssigned.size === filtered.length && filtered.length > 0}
              onSelectAll={handleSelectAll}
            >
              {displayColumns.map((column, index) => (
                <TableColumn
                  key={column.id}
                  id={column.id}
                  label={column.label}
                  width={widths[column.id]}
                  sortConfig={sortConfig}
                  sortOptions={column.sortOptions}
                  showMoreFilters={showMoreFilters}
                  searchTerm={filters[column.id] || ""}
                  onSearchChange={(value) => setFilters((prev) => ({ ...prev, [column.id]: value }))}
                  onSort={(direction) => handleSortFromDropdown(column.id, direction as "asc" | "desc" | "none")}
                  onDragStart={(e) => handleDragStart(e, column.id)}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDrop={(e) => handleDrop(e, column.id)}
                  onResizeStart={(e) => handleResizeStart(e, column.id)}
                  isDragOver={dragOverColumn === column.id}
                  isLastColumn={index === displayColumns.length - 1}
                />
              ))}
              <th className="w-10 p-3"></th>
            </TableHeader>
            <tbody>
              {paginatedData.map((row) => {
                const isSelected = form.selectedAssigned.has(row.warehouse);
                const isExpanded = expandedRows.has(row.warehouse);

                return (
                  <>
                    <TableRow
                      key={row.warehouse}
                      isSelected={isSelected}
                      isExpanded={isExpanded}
                      onSelect={() => form.toggleAssigned(row.warehouse)}
                      onToggleExpand={() => toggleExpandRow(row.warehouse)}
                    >
                      {visibleColumns.warehouse && <td className="p-3">{row.warehouse}</td>}
                      {visibleColumns.note && <td className="p-3">{row.note ?? "—"}</td>}
                      {visibleColumns.added_at && <td className="p-3">{row.added_at}</td>}
                      <td className="p-3">
                        <ActionMenu
                          onEdit={() => console.log("Edit", row.warehouse)}
                          onCopy={() => console.log("Copy", row.warehouse)}
                          onFavorite={() => console.log("Favorite", row.warehouse)}
                          onDelete={() => console.log("Delete", row.warehouse)}
                        />
                      </td>
                    </TableRow>
                    {isExpanded && <ExpandedRowDetails warehouse={row} colSpan={displayColumns.length + 2} />}
                  </>
                );
              })}
              {!paginatedData.length && (
                <tr>
                  <td colSpan={displayColumns.length + 2} className="text-muted-foreground py-6 text-center">
                    No assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {paginatedData.map((row) => {
            const isSelected = form.selectedAssigned.has(row.warehouse);
            return (
              <div key={row.warehouse} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{row.warehouse}</div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => form.toggleAssigned(row.warehouse)}
                      aria-label={`Select ${row.warehouse}`}
                    />
                    <ActionMenu
                      onEdit={() => console.log("Edit", row.warehouse)}
                      onCopy={() => console.log("Copy", row.warehouse)}
                      onFavorite={() => console.log("Favorite", row.warehouse)}
                      onDelete={() => console.log("Delete", row.warehouse)}
                    />
                  </div>
                </div>
                <div className="text-muted-foreground text-xs">Added At: {row.added_at}</div>
                <div className="text-sm">{row.note ?? "—"}</div>
              </div>
            );
          })}
          {!paginatedData.length && (
            <div className="text-muted-foreground py-6 text-center text-sm">No assignments found.</div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </CardContent>
    </Card>
  );
}
