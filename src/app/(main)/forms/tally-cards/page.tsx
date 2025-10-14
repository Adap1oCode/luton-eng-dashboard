"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

import { format } from "date-fns";
import { SortAsc, SortDesc, ArrowUpDown } from "lucide-react";

// Components from data-table
import { ActionMenu } from "@/components/data-table/action-menu";
import { ColumnsMenu } from "@/components/data-table/columns-menu";
import { CreateRoleDialog } from "@/components/data-table/create-role-dialog";
import { ErrorState } from "@/components/data-table/error-state";
import { ExpandedRowDetails } from "@/components/data-table/expanded-row-details";
import { FilterBar } from "@/components/data-table/filter-bar";
import { LoadingState } from "@/components/data-table/loading-state";
import { PageHeader } from "@/components/data-table/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { SaveViewDialog } from "@/components/data-table/save-view-dialog";
import { SortMenu } from "@/components/data-table/sort-menu";
import { StatusCell } from "@/components/data-table/status-cell";
import { TableColumn } from "@/components/data-table/table-column";
import { TableHeader } from "@/components/data-table/table-header";
import { TableRow } from "@/components/data-table/table-row";
import { Toast } from "@/components/data-table/toast";
import { Toolbar } from "@/components/data-table/toolbar";
import { ViewsMenu } from "@/components/data-table/views-menu";
import { supabaseBrowser } from "@/lib/supabase";

import { tallyCardsToolbar, tallyCardsActionMenu, tallyCardsChips } from "./toolbar.config";
import { STATUS_OPTIONS, COLUMNS, ACTIONS_COLUMN, quickFilters, features, tallyCardsViewConfig } from "./view.config";

type TallyCardRow = {
  id: string;
  tally_card_number: string;
  item_number: string;
  status: string;
  warehouse: string;
  is_active: boolean;
};

type SortDirection = "asc" | "desc" | "none";
type SortConfig = {
  column: string | null;
  direction: SortDirection;
  type: "alphabetical" | "date";
};

type SavedView = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  columnOrder: string[];
  visibleColumns: Record<string, boolean>;
  sortConfig: {
    column: string | null;
    direction: SortDirection;
    type: "alphabetical" | "date";
  };
  createdAt: Date;
};

async function fetchTallyCards(): Promise<TallyCardRow[]> {
  const supabase = supabaseBrowser();

  const { data: tallyRows, error: tallyErr } = await supabase
    .from("tcm_tally_cards") // <-- fix: use the canonical table
    .select("id, tally_card_number, warehouse, item_number, note, is_active, created_at");

  if (tallyErr) throw tallyErr;

  return (tallyRows ?? []).map((r: any) => ({
    id: r.id,
    tally_card_number: String(r.tally_card_number ?? "").trim(),
    warehouse: String(r.warehouse ?? "").trim(),
    item_number: String(r.item_number ?? "").trim(), // UI-normalized
    note: r.note ?? null,
    is_active: Boolean(r.is_active),
    created_at: r.created_at ?? null,
    status: r.is_active ? "Active" : "Inactive",
  }));
}

// Actions column is separate and always fixed at the end
// Fix the ACTIONS_COLUMN definition around line 134

const formatDateSafely = (date: any) => {
  if (!date) return "-";
  try {
    return format(new Date(date), "MMM dd, yyyy");
  } catch {
    return "-";
  }
};

export default function TallyCardsManagementPage() {
  const tableRef = useRef<HTMLTableElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [allTallyCards, setAllTallyCards] = useState<TallyCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isResizing, setIsResizing] = useState(false);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Menu state management
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Column management states - exclude actions from moveable columns
  const [columnOrder, setColumnOrder] = useState<string[]>(COLUMNS.map((col) => col.id));
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    [...COLUMNS, ACTIONS_COLUMN].reduce(
      (acc, col) => ({
        ...acc,
        [col.id]: parseFloat(col.width.replace("%", "")),
      }),
      {},
    ),
  );

  // Sorting states
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: "none",
    type: "alphabetical",
  });

  // Row expansion and drag states
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Editing states
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");

  // Dialog states
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [createTallyCardDialogOpen, setCreateTallyCardDialogOpen] = useState(false);
  const [newTallyCardNumber, setNewTallyCardNumber] = useState("");
  const [newItemNumber, setNewItemNumber] = useState("");
  const [newTallyCardActive, setNewTallyCardActive] = useState(true);
  const [newWarehouse, setNewWarehouse] = useState("");

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>([
    {
      id: "default",
      name: "Default View",
      description: "Default table view",
      isDefault: true,
      columnOrder: COLUMNS.map((col) => col.id),
      visibleColumns: COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
      sortConfig: { column: null, direction: "none", type: "alphabetical" },
      createdAt: new Date(),
    },
  ]);
  const [currentViewId, setCurrentViewId] = useState("default");

  // Refs for resizing
  const isResizingRef = useRef(false);
  const resizingColumnRef = useRef<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Load data
  useEffect(() => {
    setIsClient(true);
    setLoading(true);
    fetchTallyCards()
      .then((cards) => {
        setAllTallyCards(cards);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching tally cards:", err);
        const message =
          typeof err === "string"
            ? err
            : err && typeof err === "object" && "message" in err
              ? String(err.message)
              : "Failed to load tally cards";
        setError(message);
        setLoading(false);
      });
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // View management
  const applyView = (view: SavedView) => {
    setColumnOrder(view.columnOrder);
    setVisibleColumns(view.visibleColumns);
    setSortConfig(view.sortConfig); // <-- fix: now matches SortConfig
    setCurrentViewId(view.id);
    showToast(`Applied view: ${view.name}`);
  };

  const handleSaveView = () => {
    if (!viewName.trim()) {
      showToast("Please enter a view name");
      return;
    }

    // Add the missing handleSort function after line 540
    const handleSort = (columnId: string) => {
      const column = COLUMNS.find((col) => col.id === columnId);
      if (!column) return;

      let newDirection: SortDirection = "asc";
      if (sortConfig.column === columnId) {
        newDirection = sortConfig.direction === "asc" ? "desc" : sortConfig.direction === "desc" ? "none" : "asc";
      }

      if (newDirection === "none") {
        setSortConfig({ column: null, direction: "none", type: "alphabetical" });
        showToast(`Sorting cleared for ${column.label}`);
      } else {
        setSortConfig({
          column: columnId,
          direction: newDirection,
          type: column.sortType,
        });
        showToast(`Sorted by ${column.label} (${newDirection === "asc" ? "A to Z" : "Z to A"})`);
      }
    };

    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name: viewName.trim(),
      description: viewDescription.trim(),
      isDefault: false,
      columnOrder,
      visibleColumns,
      sortConfig,
      createdAt: new Date(),
    };

    setSavedViews((prev) => [...prev, newView]);
    setCurrentViewId(newView.id);
    setSaveViewDialogOpen(false);
    setViewName("");
    setViewDescription("");
    showToast(`View "${viewName}" saved successfully`);
  };

  const handleDeleteView = (viewId: string) => {
    if (viewId === "default") {
      showToast("Cannot delete the default view");
      return;
    }

    setSavedViews((prev) => prev.filter((view) => view.id !== viewId));
    if (currentViewId === viewId) {
      setCurrentViewId("default");
    }
    showToast("View deleted successfully");
  };

  // Create tally card
  const handleCreateTallyCard = () => {
    const newRow: TallyCardRow = {
      id: String(Date.now()),
      tally_card_number: newTallyCardNumber.trim(),
      item_number: newItemNumber.trim(),
      is_active: newTallyCardActive,
      status: newTallyCardActive ? "Active" : "Inactive",
      warehouse: newWarehouse.trim(),
    };
    setAllTallyCards((prev) => [newRow, ...prev]);
    setCreateTallyCardDialogOpen(false);
    setNewTallyCardNumber("");
    setNewItemNumber("");
    setNewTallyCardActive(true);
    setNewWarehouse("");
    showToast(`Tally Card "${newRow.tally_card_number}" created`);
  };

  // Action handlers for ActionMenu
  const handleEdit = (item: TallyCardRow) => {
    showToast(`Edit action for ${item.tally_card_number}`);
    // TODO: Implement edit functionality
  };

  const handleCopy = (item: TallyCardRow) => {
    showToast(`Copy action for ${item.tally_card_number}`);
    // TODO: Implement copy functionality
  };

  const handleFavorite = (item: TallyCardRow) => {
    showToast(`Favorite action for ${item.tally_card_number}`);
    // TODO: Implement favorite functionality
  };

  const handleDelete = (item: TallyCardRow) => {
    showToast(`Delete action for ${item.tally_card_number}`);
    // TODO: Implement delete functionality
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = allTallyCards;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.tally_card_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.item_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.warehouse.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "All Statuses") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (sortConfig.column && sortConfig.direction !== "none") {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.column as keyof typeof a];
        const bValue = b[sortConfig.column as keyof typeof b];

        return sortConfig.direction === "asc"
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }

    return filtered;
  }, [allTallyCards, searchTerm, statusFilter, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const displayColumns = useMemo(() => {
    // Get regular columns (excluding actions)
    const regularColumns = columnOrder
      .map((id) => COLUMNS.find((col) => col.id === id))
      .filter((col): col is NonNullable<typeof col> => col !== undefined && visibleColumns[col.id]);

    // Always add actions column at the end
    return [...regularColumns, ACTIONS_COLUMN];
  }, [columnOrder, visibleColumns]);

  // Column resize handler - prevent resizing actions column
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnId: string) => {
      // Prevent resizing the actions column
      if (columnId === "actions") return;

      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);
      isResizingRef.current = true;
      resizingColumnRef.current = columnId;
      startXRef.current = e.clientX;
      startWidthRef.current = columnWidths[columnId];

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current || !resizingColumnRef.current) return;

        const deltaX = moveEvent.clientX - startXRef.current;
        const tableWidth = tableRef.current?.getBoundingClientRect().width || window.innerWidth;
        const deltaPercent = (deltaX / tableWidth) * 100;
        const newWidth = Math.max(5, Math.min(80, startWidthRef.current + deltaPercent));

        setColumnWidths((prev) => ({ ...prev, [resizingColumnRef.current!]: newWidth }));
      };

      const handleMouseUp = () => {
        isResizingRef.current = false;
        resizingColumnRef.current = null;
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths],
  );

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== targetColumnId) {
      const newColumnOrder = [...columnOrder];
      const draggedIndex = newColumnOrder.indexOf(draggedColumn);
      const targetIndex = newColumnOrder.indexOf(targetColumnId);

      newColumnOrder.splice(draggedIndex, 1);
      newColumnOrder.splice(targetIndex, 0, draggedColumn);
      setColumnOrder(newColumnOrder);

      const draggedColumnConfig = COLUMNS.find((col) => col.id === draggedColumn);
      if (draggedColumnConfig) {
        showToast(`Column "${draggedColumnConfig.label}" moved`);
      }
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Column management
  const handleColumnToggle = (columnId: string, visible: boolean) => {
    setVisibleColumns((prev) => ({ ...prev, [columnId]: visible }));
  };

  const handleShowAllColumns = () => {
    setVisibleColumns(COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}));
  };

  const handleHideAllColumns = () => {
    setVisibleColumns(COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.required ?? false }), {}));
  };

  const handleResetColumnOrder = () => {
    setColumnOrder(COLUMNS.map((col) => col.id));
    showToast("Column order reset to default");
  };
  // Add this useEffect to debug the columns visibility
  useEffect(() => {
    console.log("Column Order:", columnOrder);
    console.log("Visible Columns:", visibleColumns);
    console.log(
      "Display Columns:",
      displayColumns.map((col) => col.id),
    );
  }, [columnOrder, visibleColumns, displayColumns]);

  // Sorting handlers
  const handleSortFromDropdown = (columnId: string, direction: SortDirection) => {
    const column = COLUMNS.find((col) => col.id === columnId);
    if (!column) return;

    if (direction === "none") {
      setSortConfig({ column: null, direction: "none", type: "alphabetical" });
      showToast(`Sorting cleared for ${column.label}`);
    } else {
      setSortConfig({
        column: columnId,
        direction,
        type: column.sortType,
      });
      const option = column.sortOptions.find((opt) => opt.value === direction);
      if (option) showToast(`Sorted by ${column.label} (${option.label})`);
    }
  };

  const handleClearSorting = () => {
    setSortConfig({ column: null, direction: "none", type: "alphabetical" });
    showToast("Sorting cleared");
  };

  // Row selection handlers
  const handleSelectAll = () => {
    if (isAllSelected) {
      const currentPageIndices = currentData.map((_, index) => startIndex + index);
      setSelectedRows(selectedRows.filter((i) => !currentPageIndices.includes(i)));
    } else {
      const currentPageIndices = currentData.map((_, index) => startIndex + index);
      setSelectedRows([...new Set([...selectedRows, ...currentPageIndices])]);
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const actualIndex = startIndex + index;
    if (checked) {
      setSelectedRows([...selectedRows, actualIndex]);
    } else {
      setSelectedRows(selectedRows.filter((i) => i !== actualIndex));
    }
  };

  const toggleRowDetails = (index: number) => {
    setExpandedRows((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  // Status editing handlers
  const handleEditStatus = (index: number) => {
    const actualIndex = startIndex + index;
    const card = currentData[index];
    setEditingRow(actualIndex);
    setEditingStatus(card.status);
  };

  const handleSaveStatus = useCallback(
    (index: number) => {
      const cardId = currentData[index]?.id;
      if (!cardId) {
        setEditingStatus("");
        setEditingRow(null);
        return;
      }
      if (editingStatus.trim()) {
        setAllTallyCards((prev) => prev.map((r) => (r.id === cardId ? { ...r, status: editingStatus } : r)));
        showToast(`Status updated to: ${editingStatus}`);
      }
      setEditingStatus("");
      setEditingRow(null);
    },
    [editingStatus, currentData],
  );

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditingStatus("");
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      showToast("No data to export");
      return;
    }

    const columnsToExport = displayColumns.map((col) => col.id);
    const headers = columnsToExport
      .map((colId) => {
        const column = COLUMNS.find((c) => c.id === colId);
        return column ? `"${column.label}"` : `"${colId}"`;
      })
      .join(",");

    const csvRows = filteredData.map((item) => {
      return columnsToExport
        .map((colId) => {
          const value = item[colId as keyof typeof item] || "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `tally_cards_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredData.length} records to CSV`);
  };

  const selectedInCurrentPage = selectedRows.filter(
    (index) => index >= startIndex && index < startIndex + currentData.length,
  ).length;

  const isAllSelected = currentData.length > 0 && selectedInCurrentPage === currentData.length;

  // Render loading or error states
  if (!isClient || loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState title="Error loading tally cards" error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 dark:bg-gray-900">
      {/* Toast Notifications */}
      {toastMessage && <Toast message={toastMessage} />}

      {/* Dialogs */}
      <SaveViewDialog
        open={saveViewDialogOpen}
        viewName={viewName}
        viewDescription={viewDescription}
        visibleColumnsCount={displayColumns.length}
        sortingInfo={
          sortConfig.column
            ? `Sorted by: ${COLUMNS.find((c) => c.id === sortConfig.column)?.label}`
            : "No sorting applied"
        }
        columnOrderCount={columnOrder.filter((id) => visibleColumns[id]).length}
        onOpenChange={setSaveViewDialogOpen}
        onViewNameChange={setViewName}
        onViewDescriptionChange={setViewDescription}
        onSave={handleSaveView}
      />

      <CreateRoleDialog
        open={createTallyCardDialogOpen}
        roleName={newTallyCardNumber}
        roleCode={newItemNumber}
        warehousesText={newWarehouse}
        isActive={newTallyCardActive}
        onOpenChange={setCreateTallyCardDialogOpen}
        onRoleNameChange={setNewTallyCardNumber}
        onRoleCodeChange={setNewItemNumber}
        onWarehousesChange={setNewWarehouse}
        onIsActiveChange={setNewTallyCardActive}
        onSave={handleCreateTallyCard}
      />

      {/* Page Header Section */}
      <section className="mb-6 px-6">
        <PageHeader title="View Tally Cards" />
      </section>

      {/* Toolbar Section */}
      <section className="mb-6 px-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Toolbar
            selectedCount={selectedRows.length}
            hasSorting={sortConfig.column !== null}
            onCreateNew={() => setCreateTallyCardDialogOpen(true)}
            onDelete={() => {
              showToast("Deleted selected tally cards");
            }}
            onDuplicate={() => {
              showToast("Duplicated selected tally cards");
            }}
            onClearSorting={handleClearSorting}
          />
        </div>
      </section>

      {/* Filter Bar Section */}
      <section className="mb-6 px-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <FilterBar
            // Views props
            viewsMenuOpen={viewsMenuOpen}
            setViewsMenuOpen={setViewsMenuOpen}
            savedViews={savedViews}
            currentViewId={currentViewId}
            applyView={applyView}
            handleDeleteView={handleDeleteView}
            formatDateSafely={formatDateSafely}
            // Columns props
            columnsMenuOpen={columnsMenuOpen}
            setColumnsMenuOpen={setColumnsMenuOpen}
            COLUMNS={COLUMNS.map((c) => ({
              id: c.id,
              label: c.label,
              width: c.width,
              required: c.required,
              sortType: c.sortType,
              sortOptions: c.sortOptions,
            }))}
            visibleColumns={visibleColumns}
            displayColumns={displayColumns.map((c) => ({
              id: c.id,
              label: c.label,
              width: c.width,
              required: c.required,
              sortType: c.sortType,
              sortOptions: c.sortOptions,
            }))}
            isResizing={isResizing}
            handleColumnToggle={handleColumnToggle}
            handleShowAllColumns={handleShowAllColumns}
            handleHideAllColumns={handleHideAllColumns}
            handleResetColumnOrder={handleResetColumnOrder}
            handleDragStart={(e, colId) => handleDragStart(e, colId)}
            handleDragOver={(e, colId) => handleDragOver(e, colId)}
            handleDrop={(e, colId) => handleDrop(e, colId)}
            // Sort props
            sortMenuOpen={sortMenuOpen}
            setSortMenuOpen={setSortMenuOpen}
            sortConfig={{ column: sortConfig.column, direction: sortConfig.direction, type: sortConfig.type }}
            handleSortFromDropdown={(columnId, direction) => handleSortFromDropdown(columnId, direction)}
            handleClearSorting={handleClearSorting}
            // Filter props
            showMoreFilters={showMoreFilters}
            setShowMoreFilters={setShowMoreFilters}
            // Actions
            handleExportCSV={handleExportCSV}
            setSaveViewDialogOpen={setSaveViewDialogOpen}
            // Menu components
            ViewsMenu={ViewsMenu}
            ColumnsMenu={ColumnsMenu}
            SortMenu={SortMenu}
          />
        </div>
      </section>

      {/* Data Table Section */}
      <section className="mb-6 px-6">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="relative overflow-x-auto">
            <table ref={tableRef} className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
              <TableHeader isAllSelected={isAllSelected} onSelectAll={handleSelectAll}>
                {displayColumns.map((col, idx) =>
                  col.id === "actions" ? (
                    <th
                      key={col.id}
                      style={{ width: `${columnWidths[col.id]}%` }}
                      className="text-muted-foreground relative overflow-hidden border border-gray-200 p-3 pr-4 text-left text-xs font-medium tracking-wider whitespace-nowrap dark:border-gray-700"
                      draggable={false}
                    />
                  ) : (
                    <TableColumn
                      key={col.id}
                      id={col.id}
                      label={col.label}
                      width={columnWidths[col.id]}
                      sortConfig={{ column: sortConfig.column, direction: sortConfig.direction }}
                      sortOptions={col.sortOptions}
                      showMoreFilters={showMoreFilters}
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      onSort={(direction) => handleSortFromDropdown(col.id, direction as SortDirection)}
                      onDragStart={(e) => handleDragStart(e, col.id)}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDrop={(e) => handleDrop(e, col.id)}
                      onResizeStart={(e) => handleResizeStart(e, col.id)}
                      isDragOver={dragOverColumn === col.id}
                      isLastColumn={idx === displayColumns.length - 1}
                    />
                  ),
                )}
              </TableHeader>

              <tbody>
                {currentData.map((item, index) => (
                  <TableRow
                    key={item.id}
                    isSelected={selectedRows.includes(startIndex + index)}
                    isExpanded={expandedRows.includes(index)}
                    onSelect={() => handleSelectRow(index, !selectedRows.includes(startIndex + index))}
                    onToggleExpand={() => toggleRowDetails(index)}
                  >
                    {displayColumns.map((col) => {
                      const value = item[col.id as keyof TallyCardRow];
                      return (
                        <td key={`${item.id}-${col.id}`} className="p-3">
                          {col.id === "status" ? (
                            <StatusCell
                              status={String(value)}
                              isEditing={editingRow === startIndex + index}
                              editingStatus={editingStatus}
                              statusOptions={STATUS_OPTIONS}
                              onEditStart={() => handleEditStatus(index)}
                              onEditChange={setEditingStatus}
                              onSave={() => handleSaveStatus(index)}
                              onCancel={handleCancelEdit}
                            />
                          ) : col.id === "actions" ? (
                            <ActionMenu
                              onEdit={() => handleEdit(item)}
                              onCopy={() => handleCopy(item)}
                              onFavorite={() => handleFavorite(item)}
                              onDelete={() => handleDelete(item)}
                            />
                          ) : (
                            <span>{Array.isArray(value) ? String(value.join(", ")) : String(value)}</span>
                          )}
                        </td>
                      );
                    })}
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pagination Section */}
      <section className="px-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </section>
    </div>
  );
}
