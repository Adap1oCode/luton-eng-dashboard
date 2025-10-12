"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

import { format } from "date-fns";
import { SortAsc, SortDesc, ArrowUpDown } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase";

// Components
import { ActionMenu } from "./Templete/action-menu";
import { ColumnsMenu } from "./Templete/columns-menu";
import { CreateRoleDialog } from "./Templete/create-role-dialog";
import { ErrorState } from "./Templete/error-state";
import { ExpandedRowDetails } from "./Templete/expanded-row-details";
import { FilterBar } from "./Templete/filter-bar";
import { LoadingState } from "./Templete/loading-state";
import { PageHeader } from "./Templete/page-header";
import { Pagination } from "./Templete/pagination";
import { SaveViewDialog } from "./Templete/save-view-dialog";
import { SortMenu } from "./Templete/sort-menu";
import { StatusCell } from "./Templete/status-cell";
import { TableColumn } from "./Templete/table-column";
import { TableHeader } from "./Templete/table-header";
import { TableRow } from "./Templete/table-row";
import { Toast } from "./Templete/toast";
import { Toolbar } from "./Templete/toolbar";
import { ViewsMenu } from "./Templete/views-menu";

type RoleRow = {
  id: string;
  role_name: string;
  role_code: string;
  status: string;
  warehouses: string[];
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
  sortConfig: SortConfig;
  createdAt: Date;
};

async function fetchRoles(): Promise<RoleRow[]> {
  const supabase = supabaseBrowser();

  const [{ data: roleRows, error: roleErr }, { data: ruleRows, error: ruleErr }] = await Promise.all([
    supabase.from("roles").select("id, role_code, role_name, is_active").order("role_code", { ascending: true }),
    supabase.from("role_warehouse_rules").select("role_code, warehouse"),
  ]);

  if (roleErr) throw roleErr;
  if (ruleErr) throw ruleErr;

  const warehouseMap = new Map<string, string[]>();
  (ruleRows ?? []).forEach((r: any) => {
    const code = String(r.role_code ?? "").trim();
    const wh = String(r.warehouse ?? "").trim();
    if (!code || !wh) return;
    const list = warehouseMap.get(code) ?? [];
    if (!list.includes(wh)) list.push(wh);
    warehouseMap.set(code, list);
  });

  for (const [k, v] of warehouseMap) {
    warehouseMap.set(
      k,
      [...v].sort((a, b) => a.localeCompare(b)),
    );
  }

  return (roleRows ?? []).map((r: any) => ({
    id: r.id,
    role_code: String(r.role_code ?? "").trim(),
    role_name: String(r.role_name ?? "").trim(),
    warehouses: warehouseMap.get(String(r.role_code ?? "").trim()) ?? [],
    is_active: Boolean(r.is_active),
    status: r.is_active ? "Active" : "Inactive",
  }));
}

const STATUS_OPTIONS = ["Active", "Inactive"];

const COLUMNS = [
  {
    id: "role_name",
    label: "Role Name",
    width: "25%",
    required: true,
    sortType: "alphabetical" as const,
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "role_code",
    label: "Role Code",
    width: "20%",
    sortType: "alphabetical" as const,
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "status",
    label: "Status",
    width: "27%",
    sortType: "alphabetical" as const,
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "warehouses",
    label: "Warehouses",
    width: "28%",
    sortType: "alphabetical" as const,
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
];

const formatDateSafely = (date: any) => {
  if (!date) return "-";
  try {
    return format(new Date(date), "MMM dd, yyyy");
  } catch {
    return "-";
  }
};

export default function RolesManagementPage() {
  const tableRef = useRef<HTMLTableElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [allRoles, setAllRoles] = useState<RoleRow[]>([]);
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

  // Column management states
  const [columnOrder, setColumnOrder] = useState<string[]>(COLUMNS.map((col) => col.id));
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    COLUMNS.reduce(
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
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleActive, setNewRoleActive] = useState(true);
  const [newRoleWarehousesText, setNewRoleWarehousesText] = useState("");

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
    fetchRoles()
      .then((roles) => {
        setAllRoles(roles);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching roles:", err);
        setError(err.message || "Failed to load roles");
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
    setSortConfig(view.sortConfig);
    setCurrentViewId(view.id);
    showToast(`Applied view: ${view.name}`);
  };

  const handleSaveView = () => {
    if (!viewName.trim()) {
      showToast("Please enter a view name");
      return;
    }

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

  // Create role
  const handleCreateRole = () => {
    const warehouses = newRoleWarehousesText
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    const newRow: RoleRow = {
      id: String(Date.now()),
      role_name: newRoleName.trim(),
      role_code: newRoleCode.trim(),
      is_active: newRoleActive,
      status: newRoleActive ? "Active" : "Inactive",
      warehouses,
    };

    setAllRoles((prev) => [newRow, ...prev]);
    setCreateRoleDialogOpen(false);
    setNewRoleName("");
    setNewRoleCode("");
    setNewRoleActive(true);
    setNewRoleWarehousesText("");
    showToast(`Role "${newRow.role_name}" created`);
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = allRoles;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.role_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.warehouses.some((wh) => wh.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    if (statusFilter !== "All Statuses") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (sortConfig.column && sortConfig.direction !== "none") {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.column as keyof typeof a];
        const bValue = b[sortConfig.column as keyof typeof b];

        if (Array.isArray(aValue) && Array.isArray(bValue)) {
          const aStr = aValue.join(", ");
          const bStr = bValue.join(", ");
          return sortConfig.direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        }

        return sortConfig.direction === "asc"
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }

    return filtered;
  }, [allRoles, searchTerm, statusFilter, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const displayColumns = useMemo(() => {
    return columnOrder
      .map((id) => COLUMNS.find((col) => col.id === id))
      .filter((col): col is NonNullable<typeof col> => col !== undefined && visibleColumns[col.id]);
  }, [columnOrder, visibleColumns]);

  // Column resize handler
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnId: string) => {
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
    const role = currentData[index];
    setEditingRow(actualIndex);
    setEditingStatus(role.status);
  };

  const handleSaveStatus = useCallback(
    (index: number) => {
      const roleId = currentData[index]?.id;
      if (!roleId) {
        setEditingStatus("");
        setEditingRow(null);
        return;
      }
      if (editingStatus.trim()) {
        setAllRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, status: editingStatus } : r)));
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
          if (Array.isArray(value)) {
            return `"${value.join(", ")}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `roles_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`);
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
    return <ErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {toastMessage && <Toast message={toastMessage} />}

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
        open={createRoleDialogOpen}
        roleName={newRoleName}
        roleCode={newRoleCode}
        warehousesText={newRoleWarehousesText}
        isActive={newRoleActive}
        onOpenChange={setCreateRoleDialogOpen}
        onRoleNameChange={setNewRoleName}
        onRoleCodeChange={setNewRoleCode}
        onWarehousesChange={setNewRoleWarehousesText}
        onIsActiveChange={setNewRoleActive}
        onSave={handleCreateRole}
      />

      <div className="w-full space-y-6 p-4 sm:p-6">
        <PageHeader />

        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <Toolbar
            selectedCount={selectedRows.length}
            hasSorting={!!sortConfig.column}
            onCreateNew={() => setCreateRoleDialogOpen(true)}
            onDelete={() => showToast("Delete functionality")}
            onDuplicate={() => showToast("Duplicate functionality")}
            onClearSorting={handleClearSorting}
          />
        </div>

        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
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
              setSaveViewDialogOpen={setSaveViewDialogOpen}
              ViewsMenu={ViewsMenu}
              ColumnsMenu={ColumnsMenu}
              SortMenu={SortMenu}
            />
          </div>

          <div className="w-full overflow-x-auto">
            <table ref={tableRef} className="w-full table-fixed">
              <colgroup>
                <col className="w-16" />
                {displayColumns.map((col) => (
                  <col key={col.id} style={{ width: `${columnWidths[col.id]}%` }} />
                ))}
                <col className="w-16" />
              </colgroup>

              <TableHeader isAllSelected={isAllSelected} onSelectAll={handleSelectAll}>
                {displayColumns.map((col, index) => (
                  <TableColumn
                    key={col.id}
                    id={col.id}
                    label={col.label}
                    width={columnWidths[col.id]}
                    sortConfig={sortConfig}
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
                    isLastColumn={index === displayColumns.length - 1}
                  />
                ))}
                <th className="sticky right-0 w-16 border-l border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"></th>
              </TableHeader>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentData.map((role, index) => {
                  const actualIndex = startIndex + index;
                  const isSelected = selectedRows.includes(actualIndex);
                  const isExpanded = expandedRows.includes(actualIndex);
                  const isEditing = editingRow === actualIndex;

                  return (
                    <React.Fragment key={actualIndex}>
                      <TableRow
                        isSelected={isSelected}
                        isExpanded={isExpanded}
                        onSelect={() => handleSelectRow(index, !isSelected)}
                        onToggleExpand={() => toggleRowDetails(actualIndex)}
                      >
                        {displayColumns.map((col) => (
                          <td
                            key={col.id}
                            className="overflow-hidden p-3 text-left whitespace-nowrap"
                            style={{ width: `${columnWidths[col.id]}%`, minWidth: "80px" }}
                          >
                            {col.id === "status" ? (
                              <StatusCell
                                status={role.status}
                                isEditing={isEditing}
                                editingStatus={editingStatus}
                                statusOptions={STATUS_OPTIONS}
                                onEditStart={() => handleEditStatus(index)}
                                onEditChange={setEditingStatus}
                                onSave={() => handleSaveStatus(index)}
                                onCancel={handleCancelEdit}
                              />
                            ) : col.id === "warehouses" ? (
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {role.warehouses.length > 0 ? role.warehouses.join(", ") : "No warehouses"}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {role[col.id as keyof typeof role]}
                              </div>
                            )}
                          </td>
                        ))}

                        <td className="sticky right-0 w-16 border-l border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                          <ActionMenu
                            onEdit={() => showToast(`Editing: ${role.role_name}`)}
                            onCopy={() => showToast(`Copied: ${role.role_name}`)}
                            onFavorite={() => showToast(`Added to favorites: ${role.role_name}`)}
                            onDelete={() => showToast(`Deleted: ${role.role_name}`)}
                          />
                        </td>
                      </TableRow>

                      {isExpanded && <ExpandedRowDetails role={role} colSpan={displayColumns.length + 2} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
}
