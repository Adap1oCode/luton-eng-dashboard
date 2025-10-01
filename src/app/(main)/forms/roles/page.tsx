"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

import { format } from "date-fns";
import {
  Filter,
  Printer,
  FileText,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Settings,
  Square,
  CheckSquare,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  ChevronRight,
  MoreVertical,
  Star,
  Edit,
  Download,
  Save,
  Eye,
  Layout,
  Check,
  X,
} from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase";

type RoleRow = {
  id: string;
  role_name: string;
  role_code: string;
  status: string;
  warehouses: string[];
  is_active: boolean;
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
    width: "15%",
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
    width: "40%",
    sortType: "alphabetical" as const,
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
];

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

const Toast = ({ message }: { message: string }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-green-500 p-4 text-white shadow-lg">{message}</div>;
};

export default function RolesManagementPage() {
  const tableRef = useRef<HTMLTableElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [allRoles, setAllRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isResizing, setIsResizing] = useState(false);

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

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showViewsMenu, setShowViewsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<number | null>(null);

  const [columnOrder, setColumnOrder] = useState<string[]>(COLUMNS.map((col) => col.id));
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: parseFloat(col.width) }), {}),
  );

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: "none",
    type: "alphabetical",
  });

  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");

  const isResizingRef = useRef(false);
  const resizingColumnRef = useRef<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");

  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    const defaultView: SavedView = {
      id: "default",
      name: "Default View",
      description: "Default table layout with all columns visible",
      isDefault: true,
      columnOrder: COLUMNS.map((col) => col.id),
      visibleColumns: COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
      sortConfig: { column: null, direction: "none", type: "alphabetical" },
      createdAt: new Date(),
    };
    return [defaultView];
  });

  const [currentViewId, setCurrentViewId] = useState("default");

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const applyView = (view: SavedView) => {
    setColumnOrder(view.columnOrder);
    setVisibleColumns(view.visibleColumns);
    setSortConfig(view.sortConfig);
    setCurrentViewId(view.id);
    setShowViewsMenu(false);
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

        if (sortConfig.direction === "asc") {
          return String(aValue).localeCompare(String(bValue));
        } else {
          return String(bValue).localeCompare(String(aValue));
        }
      });
    }

    return filtered;
  }, [allRoles, searchTerm, statusFilter, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const displayColumns = useMemo(() => {
    return columnOrder
      .map((id) => COLUMNS.find((col) => col.id === id))
      .filter((col): col is NonNullable<typeof col> => col !== undefined && visibleColumns[col.id]);
  }, [columnOrder, visibleColumns]);

  const handleSortFromDropdown = (columnId: string, direction: SortDirection) => {
    const column = COLUMNS.find((col) => col.id === columnId);
    if (!column) return;

    if (direction === "none") {
      setSortConfig({ column: null, direction: "none", type: "alphabetical" });
      showToast(`Sorting cleared for ${column.label}`);
    } else {
      setSortConfig({ column: columnId, direction: direction, type: column.sortType });
      const option = column.sortOptions.find((opt) => opt.value === direction);
      if (option) showToast(`Sorted by ${column.label} (${option.label})`);
    }
    setShowSortMenu(false);
  };

  const getSortIcon = (columnId: string) => {
    if (sortConfig.column !== columnId) return <ArrowUpDown className="h-3 w-3" />;
    if (sortConfig.direction === "asc") return <ArrowUp className="h-3 w-3" />;
    if (sortConfig.direction === "desc") return <ArrowDown className="h-3 w-3" />;
    return <ArrowUpDown className="h-3 w-3" />;
  };

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

  const handleClearSorting = () => {
    setSortConfig({ column: null, direction: "none", type: "alphabetical" });
    showToast("Sorting cleared");
  };

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

  const handleEditStatus = (index: number) => {
    const actualIndex = startIndex + index;
    const role = filteredData[actualIndex];
    setEditingRow(actualIndex);
    setEditingStatus(role.status);
    setShowActionMenu(null);
  };

  const handleSaveStatus = () => {
    showToast(`Status updated to: ${editingStatus}`);
    setEditingRow(null);
    setEditingStatus("");
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditingStatus("");
  };

  const selectedInCurrentPage = selectedRows.filter(
    (index) => index >= startIndex && index < startIndex + currentData.length,
  ).length;

  const isAllSelected = currentData.length > 0 && selectedInCurrentPage === currentData.length;

  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full space-y-6 p-4 sm:p-6">
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-center py-8">
              <div className="text-lg text-gray-500">Loading roles...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full space-y-6 p-4 sm:p-6">
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mb-2 text-lg text-red-500">Error loading roles</div>
                <div className="text-sm text-gray-500">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {toastMessage && <Toast message={toastMessage} />}

      <div className="w-full space-y-6 p-4 sm:p-6">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">View Roles</h1>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <button className="flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
                <Plus className="h-4 w-4" />
                New
              </button>
              <button
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={selectedRows.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                disabled={selectedRows.length === 0}
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {sortConfig.column && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-700 dark:text-blue-100">
                  Sorting Applied
                </span>
              )}
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 dark:bg-orange-700 dark:text-orange-100">
                Filter/Sorting Applied
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                disabled={selectedRows.length === 0}
              >
                <Printer className="h-4 w-4" />
                Print Report
                <ChevronDown className="h-4 w-4" />
              </button>

              {sortConfig.column && (
                <button
                  onClick={handleClearSorting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  Clear Sorting
                </button>
              )}
            </div>

            <button
              onClick={() => setSaveViewDialogOpen(true)}
              className="flex items-center gap-2 rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <Save className="h-4 w-4" />
              Save View
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowViewsMenu(!showViewsMenu)}
                      className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Layout className="h-4 w-4" />
                      Views
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {showViewsMenu && (
                      <div className="absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <div className="p-2">
                          <div className="px-2 py-1.5 text-sm font-semibold">Saved Views</div>
                          <div className="mt-2 space-y-1">
                            {savedViews.map((view) => (
                              <div
                                key={view.id}
                                className={`flex items-center justify-between rounded-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  currentViewId === view.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="truncate text-sm font-medium">{view.name}</span>
                                    {view.isDefault && (
                                      <span className="rounded border border-gray-300 px-1 text-xs">Default</span>
                                    )}
                                  </div>
                                  <div className="mt-1 truncate text-xs text-gray-500">{view.description}</div>
                                </div>
                                <div className="ml-2 flex items-center gap-1">
                                  <button
                                    onClick={() => applyView(view)}
                                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  {!view.isDefault && (
                                    <button
                                      onClick={() => handleDeleteView(view.id)}
                                      className="flex h-7 w-7 items-center justify-center rounded text-red-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                      className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Settings className="h-4 w-4" />
                      Columns
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {showColumnsMenu && (
                      <div className="absolute top-full left-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <div className="p-2">
                          <div className="px-2 py-1.5 text-sm font-semibold">Show/Hide Columns</div>
                          <div className="mt-2 grid grid-cols-3 gap-1">
                            <button
                              onClick={handleShowAllColumns}
                              className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                              Show All
                            </button>
                            <button
                              onClick={handleHideAllColumns}
                              className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                              Hide All
                            </button>
                            <button
                              onClick={handleResetColumnOrder}
                              className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                              Reset
                            </button>
                          </div>
                          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                            {COLUMNS.map((column) => (
                              <div
                                key={column.id}
                                className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <GripVertical className="h-3.5 w-3.5 cursor-move text-gray-400" />
                                <input
                                  type="checkbox"
                                  id={`column-${column.id}`}
                                  checked={visibleColumns[column.id]}
                                  onChange={(e) => handleColumnToggle(column.id, e.target.checked)}
                                  disabled={column.required}
                                  className="h-4 w-4"
                                />
                                <label
                                  htmlFor={`column-${column.id}`}
                                  className={`flex-1 cursor-pointer text-sm ${column.required ? "text-gray-500" : ""}`}
                                >
                                  {column.label}
                                  {column.required && <span className="ml-1 text-xs">(Required)</span>}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      Sort
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {showSortMenu && (
                      <div className="absolute top-full left-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <div className="p-2">
                          <div className="px-2 py-1.5 text-sm font-semibold">Sort by Column</div>
                          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                            {COLUMNS.map((column) => (
                              <div key={column.id} className="space-y-1">
                                <div className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                                  {column.label}
                                </div>
                                <div className="grid grid-cols-1 gap-0.5">
                                  {column.sortOptions.map((option) => (
                                    <button
                                      key={`${column.id}-${option.value}`}
                                      className={`flex items-center gap-2 rounded p-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                        sortConfig.column === column.id && sortConfig.direction === option.value
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                                          : ""
                                      }`}
                                      onClick={() => handleSortFromDropdown(column.id, option.value as SortDirection)}
                                    >
                                      <option.icon className="h-3.5 w-3.5" />
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                            <button
                              onClick={handleClearSorting}
                              disabled={!sortConfig.column}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                              Clear All Sorting
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowMoreFilters(!showMoreFilters)}
                    className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <Filter className="h-4 w-4" />
                    More Filters
                    <ChevronDown className={`h-4 w-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
                  </button>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="ml-auto flex items-center gap-2 rounded-md bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table ref={tableRef} className="w-full min-w-[1400px] table-fixed">
              <colgroup>
                <col className="w-16" />
                {displayColumns.map((col) => (
                  <col key={col.id} style={{ width: `${columnWidths[col.id]}%` }} />
                ))}
                <col className="w-16" />
              </colgroup>
              <thead className="border border-gray-200 bg-gray-50 text-sm dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <th className="w-16 p-3">
                    <button
                      onClick={handleSelectAll}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>

                  {displayColumns.map((col, index) => (
                    <th
                      key={col.id}
                      className={`relative min-w-[120px] overflow-hidden border border-gray-200 p-3 pr-4 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:border-gray-700 dark:text-gray-400 ${
                        dragOverColumn === col.id ? "bg-blue-100 dark:bg-blue-900" : ""
                      } ${sortConfig.column === col.id ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                      draggable={!isResizing}
                      onDragStart={(e) => handleDragStart(e, col.id)}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDragLeave={() => setDragOverColumn(null)}
                      onDrop={(e) => handleDrop(e, col.id)}
                      onDragEnd={() => {
                        setDraggedColumn(null);
                        setDragOverColumn(null);
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-1">
                            <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
                            <span className="mr-2 truncate">{col.label}</span>
                          </div>

                          <button
                            onClick={() => {
                              const column = COLUMNS.find((c) => c.id === col.id);
                              if (!column) return;
                              let newDirection: SortDirection = "asc";
                              if (sortConfig.column === col.id) {
                                if (sortConfig.direction === "asc") newDirection = "desc";
                                else if (sortConfig.direction === "desc") newDirection = "none";
                              }
                              setSortConfig({
                                column: newDirection === "none" ? null : col.id,
                                direction: newDirection,
                                type: column.sortType,
                              });
                            }}
                            className="flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
                          >
                            {getSortIcon(col.id)}
                          </button>
                        </div>
                        {showMoreFilters && (
                          <div className="flex gap-2">
                            <input
                              placeholder="Filter..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 w-full rounded-md border border-gray-300 px-2 text-xs dark:border-gray-600 dark:bg-gray-700"
                            />
                            <button className="flex h-8 w-10 items-center justify-center rounded-md border border-gray-300 px-2 text-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                              <Filter className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {index < displayColumns.length - 1 && (
                        <div
                          className="absolute top-0 right-0 z-20 h-full w-3 cursor-col-resize bg-transparent transition-colors hover:bg-blue-300"
                          onMouseDown={(e) => handleResizeStart(e, col.id)}
                        />
                      )}
                    </th>
                  ))}

                  <th className="sticky right-0 w-16 border-l border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentData.map((role, index) => {
                  const actualIndex = startIndex + index;
                  const isSelected = selectedRows.includes(actualIndex);
                  const isExpanded = expandedRows.includes(actualIndex);
                  const isEditing = editingRow === actualIndex;

                  return (
                    <React.Fragment key={actualIndex}>
                      <tr
                        className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? "bg-gray-50 dark:bg-gray-800" : ""}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleRowDetails(actualIndex)}
                              className={`text-gray-400 transition-transform hover:text-gray-600 dark:text-gray-500 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleSelectRow(index, !isSelected)}>
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </td>

                        {displayColumns.map((col) => (
                          <td key={col.id} className="overflow-hidden p-3 text-left text-sm">
                            {col.id === "status" ? (
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <select
                                      value={editingStatus}
                                      onChange={(e) => setEditingStatus(e.target.value)}
                                      className="w-48 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                                    >
                                      {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                          {status}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={handleSaveStatus}
                                      className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 hover:bg-gray-50 dark:border-gray-600"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <div className="group flex items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-1 text-xs ${
                                        role.status === "Active"
                                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                                          : "border border-gray-300 bg-white text-gray-700"
                                      }`}
                                    >
                                      {role.status}
                                    </span>
                                    <button
                                      onClick={() => handleEditStatus(index)}
                                      className="opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
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
                          <div className="relative">
                            <button
                              onClick={() => setShowActionMenu(showActionMenu === actualIndex ? null : actualIndex)}
                              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {showActionMenu === actualIndex && (
                              <div className="absolute top-full right-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                <div className="p-1">
                                  <div className="px-2 py-1.5 text-xs font-semibold">Actions</div>
                                  <button
                                    onClick={() => {
                                      showToast(`Editing: ${role.role_name}`);
                                      setShowActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      showToast(`Copied: ${role.role_name}`);
                                      setShowActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Copy className="h-4 w-4" />
                                    Make a Copy
                                  </button>
                                  <button
                                    onClick={() => {
                                      showToast(`Added to favorites: ${role.role_name}`);
                                      setShowActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Star className="h-4 w-4" />
                                    Favorite
                                  </button>
                                  <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                                  <button
                                    onClick={() => {
                                      showToast(`Deleted: ${role.role_name}`);
                                      setShowActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <td colSpan={displayColumns.length + 2} className="p-4">
                            <div className="space-y-4">
                              <h4 className="font-semibold">Role Details: {role.role_name}</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Role Code:</span> {role.role_code}
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span> {role.status}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">Associated Warehouses:</span>
                                  {role.warehouses.length > 0 ? (
                                    <ul className="mt-2 list-disc space-y-1 pl-5">
                                      {role.warehouses.map((wh, idx) => (
                                        <li key={idx}>{wh}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-2 text-gray-500">No warehouses associated with this role</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center dark:border-gray-700">
            <div className="text-sm text-gray-500">
              {selectedRows.length} of {filteredData.length} row(s) selected
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-sm">
                <span>Rows per page:</span>
                <select
                  value={itemsPerPage.toString()}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-16 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>

              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {saveViewDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-semibold">Save Current View</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Save your current column layout, sorting, and visibility settings as a named view for quick access later.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">View Name *</label>
                <input
                  type="text"
                  placeholder="e.g., My Custom View"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={viewDescription}
                  onChange={(e) => setViewDescription(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
                <div className="font-medium">Current Settings:</div>
                <div className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>• {displayColumns.length} columns visible</div>
                  <div>
                    •{" "}
                    {sortConfig.column
                      ? `Sorted by: ${COLUMNS.find((c) => c.id === sortConfig.column)?.label}`
                      : "No sorting applied"}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setSaveViewDialogOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                disabled={!viewName.trim()}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
