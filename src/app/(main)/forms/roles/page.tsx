"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

import Link from "next/link";

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
  Package,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-md bg-green-600 px-4 py-2 text-white shadow-lg">{message}</div>
  );
};

// Helper function to get badge variant based on status
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "Active":
      return "default";
    case "Inactive":
      return "secondary";
    case "Open - Pick Order Issued":
      return "outline";
    case "In Progress - Pick Order Picked Short":
      return "secondary";
    case "Closed - Pick Complete":
      return "default";
    default:
      return "outline";
  }
};

// Helper function to format dates safely
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
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<number | null>(null);

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
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");

  // Create New Role dialog state
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleActive, setNewRoleActive] = useState(true);
  const [newRoleWarehousesText, setNewRoleWarehousesText] = useState("");

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

  const isResizingRef = useRef(false);
  const resizingColumnRef = useRef<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleCloseAllMenus = () => {
    setShowMoreFilters(false);
    setShowColumnsMenu(false);
    setShowSortMenu(false);
    setShowActionMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        handleCloseAllMenus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

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

  const handleCreateRole = () => {
    const warehouses = newRoleWarehousesText
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    const id = String(Date.now());

    const newRow: RoleRow = {
      id,
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

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
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

    setSortConfig({
      column: columnId,
      direction,
      type: column.sortType,
    });

    if (direction === "none") {
      setSortConfig({ column: null, direction: "none", type: "alphabetical" });
      showToast(`Sorting cleared for ${column.label}`);
    } else {
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
    const role = currentData[index];
    setEditingRow(actualIndex);
    setEditingStatus(role.status);
    setShowActionMenu(null);
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

      {/* Save View dialog */}
      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Save your current column layout, sorting, and visibility settings as a named view for quick access later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="view-name">View Name *</Label>
              <Input
                id="view-name"
                placeholder="e.g., My Custom View, Status Overview, etc."
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="view-description">Description</Label>
              <Input
                id="view-description"
                placeholder="Brief description of this view..."
                value={viewDescription}
                onChange={(e) => setViewDescription(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <div className="font-medium">Current Settings:</div>
              <div className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div>• {displayColumns.length} columns visible</div>
                <div>
                  •{" "}
                  {sortConfig.column
                    ? `Sorted by: ${COLUMNS.find((c) => c.id === sortConfig.column)?.label}`
                    : "No sorting applied"}
                </div>
                <div>• Column order: {columnOrder.filter((id) => visibleColumns[id]).length} columns</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveViewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={!viewName.trim()}>
              <Save className="mr-2 h-4 w-4" />
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Role dialog */}
      <Dialog open={createRoleDialogOpen} onOpenChange={setCreateRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Enter role details and it will be added to the table.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-role-name">Role Name *</Label>
              <Input
                id="new-role-name"
                placeholder="e.g., Store Officer"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-role-code">Role Code *</Label>
              <Input
                id="new-role-code"
                placeholder="e.g., SO_RTZ"
                value={newRoleCode}
                onChange={(e) => setNewRoleCode(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-role-warehouses">Warehouses (comma-separated)</Label>
              <Input
                id="new-role-warehouses"
                placeholder="RTZ, BDI, CCW"
                value={newRoleWarehousesText}
                onChange={(e) => setNewRoleWarehousesText(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="new-role-active" checked={newRoleActive} onCheckedChange={(v) => setNewRoleActive(!!v)} />
              <Label htmlFor="new-role-active">Active</Label>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCreateRoleDialogOpen(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleCreateRole} disabled={!newRoleName.trim() || !newRoleCode.trim()}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full space-y-6 p-4 sm:p-6">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">View Roles</h1>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          {/* First row - buttons and switches */}
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    New
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setCreateRoleDialogOpen(true)}>
                    Basic Data (Quick Add)
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/forms/roles/new">Detailed Data</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="destructive" disabled={selectedRows.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" disabled={selectedRows.length === 0}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {sortConfig.column && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100">
                  Sorting Applied
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100"
              >
                Filter/Sorting Applied
              </Badge>
            </div>
          </div>

          {/* Second row - print buttons and export */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={selectedRows.length === 0}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Report
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Print Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={selectedRows.length === 0}>
                    <FileText className="mr-2 h-4 w-4" />
                    Print Invoice
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Print Invoice
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={selectedRows.length === 0}>
                    <Package className="mr-2 h-4 w-4" />
                    Print Packing Slip
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Package className="mr-2 h-4 w-4" />
                    Print Packing Slip
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {sortConfig.column && (
                <Button variant="outline" onClick={handleClearSorting}>
                  Clear Sorting
                </Button>
              )}
            </div>

            {/* Save View Button */}
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

        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
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
                      <div className="max-h-64 space-y-1 overflow-y-auto p-1">
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
                                  <Badge variant="outline" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground mt-1 truncate text-xs">{view.description}</div>
                              <div className="text-muted-foreground mt-1 text-xs">
                                {formatDateSafely(view.createdAt)}
                              </div>
                            </div>
                            <div className="ml-2 flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => applyView(view)} className="h-7 w-7 p-0">
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              {!view.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteView(view.id)}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <DropdownMenuSeparator />
                      <div className="text-muted-foreground p-2 text-xs">
                        {savedViews.length} saved view{savedViews.length !== 1 ? "s" : ""}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
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
                      <div className="grid grid-cols-3 gap-1 p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleShowAllColumns}
                          className="h-7 w-full text-xs"
                        >
                          Show All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleHideAllColumns}
                          className="h-7 w-full text-xs"
                        >
                          Hide All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetColumnOrder}
                          className="h-7 w-full text-xs"
                        >
                          Reset Order
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="max-h-64 space-y-1 overflow-y-auto p-1">
                        {COLUMNS.map((column) => (
                          <div
                            key={column.id}
                            className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                            draggable={!isResizing}
                            onDragStart={(e) => {
                              if (isResizing) return;
                              handleDragStart(e, column.id);
                            }}
                            onDragOver={(e) => {
                              if (isResizing) return;
                              handleDragOver(e, column.id);
                            }}
                            onDragLeave={() => setDragOverColumn(null)}
                            onDrop={(e) => {
                              if (isResizing) return;
                              handleDrop(e, column.id);
                            }}
                            onDragEnd={() => {
                              setDraggedColumn(null);
                              setDragOverColumn(null);
                            }}
                          >
                            <GripVertical className="h-3.5 w-3.5 cursor-move text-gray-400" />
                            <Checkbox
                              id={`column-${column.id}`}
                              checked={visibleColumns[column.id]}
                              onCheckedChange={(checked: boolean) => handleColumnToggle(column.id, checked)}
                              disabled={column.required}
                              className="h-4 w-4"
                            />
                            <label
                              htmlFor={`column-${column.id}`}
                              className={`flex-1 cursor-pointer text-sm ${column.required ? "text-muted-foreground" : ""}`}
                            >
                              {column.label}
                              {column.required && (
                                <span className="text-muted-foreground ml-1 text-xs">(Required)</span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                      <DropdownMenuSeparator />
                      <div className="text-muted-foreground p-2 text-xs">
                        {displayColumns.length} of {COLUMNS.length} columns visible
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Sort
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">
                        Sort by Column
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="max-h-64 space-y-2 overflow-y-auto p-1">
                        {COLUMNS.map((column) => (
                          <div key={column.id} className="space-y-1">
                            <div className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                              {column.label}
                            </div>
                            <div className="grid grid-cols-1 gap-0.5">
                              {column.sortOptions.map((option) => (
                                <DropdownMenuItem
                                  key={`${column.id}-${option.value}`}
                                  className={`flex items-center gap-2 p-2 text-xs ${
                                    sortConfig.column === column.id && sortConfig.direction === option.value
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                                      : ""
                                  }`}
                                  onClick={() => handleSortFromDropdown(column.id, option.value as SortDirection)}
                                >
                                  <option.icon className="h-3.5 w-3.5" />
                                  {option.label}
                                </DropdownMenuItem>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearSorting}
                          className="h-7 w-full text-xs"
                          disabled={!sortConfig.column}
                        >
                          Clear All Sorting
                        </Button>
                      </div>
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

                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="ml-auto bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          <div className="w-full">
            <table ref={tableRef} className="w-full table-fixed">
              <colgroup>
                <col className="w-16" />
                {displayColumns.map((col) => (
                  <col key={col.id} style={{ width: `${columnWidths[col.id]}%` }} />
                ))}
                <col className="w-16" />
              </colgroup>
              <thead className="bg-muted/50 border border-gray-200 text-sm dark:border-gray-500">
                <tr>
                  <th className="w-16 p-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSelectAll}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </Button>
                  </th>

                  {/* Main columns with drag and drop support */}
                  {displayColumns.map((col, index) => (
                    <th
                      key={col.id}
                      className={`text-muted-foreground relative min-w-[120px] overflow-hidden p-3 pr-4 text-left text-xs font-medium tracking-wider whitespace-nowrap uppercase ${
                        dragOverColumn === col.id ? "bg-blue-100 dark:bg-blue-900" : ""
                      } ${sortConfig.column === col.id ? "bg-muted/70" : ""} border border-gray-200 dark:border-gray-700`}
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

                          <div className="flex shrink-0 items-center gap-1">
                            {/* Dropdown for sorting options */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex items-center">
                                  {getSortIcon(col.id)}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-48">
                                <DropdownMenuLabel className="py-.5 text-xs font-semibold">
                                  Sort {col.label}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {col.sortOptions.map((option) => (
                                  <DropdownMenuItem
                                    key={option.value}
                                    className={`flex items-center gap-2 p-2 text-xs ${
                                      sortConfig.column === col.id && sortConfig.direction === option.value
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      const newDirection = option.value as SortDirection;
                                      setSortConfig({
                                        column: newDirection === "none" ? null : col.id,
                                        direction: newDirection,
                                        type: col.sortType,
                                      });
                                    }}
                                  >
                                    <option.icon className="h-2 w-2" />
                                    {option.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {showMoreFilters && (
                          <div className="justify-left flex gap-2">
                            <Input
                              placeholder="Filter..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 w-full text-xs"
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-10 px-2 text-xs">
                                  <Filter className="mr-1 h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-36 p-1">
                                <div className="space-y-1">
                                  <Button variant="default" size="sm" className="h-7 w-full justify-start text-xs">
                                    Contains
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                                    Starts with
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                                    Ends with
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                                    Equal to
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                                    Not equal
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>

                      {/* Column Resize Handle */}
                      {index < displayColumns.length - 1 && (
                        <div
                          className="absolute top-0 right-0 z-20 h-full w-3 cursor-col-resize bg-transparent transition-colors hover:bg-blue-300"
                          onMouseDown={(e) => handleResizeStart(e, col.id)}
                        />
                      )}
                    </th>
                  ))}
                  <th className="sticky right-0 w-16 border-l border-gray-200 bg-white p-3 text-xs font-medium tracking-wider uppercase dark:border-gray-700 dark:bg-gray-900"></th>
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
                          <td
                            key={col.id}
                            className="overflow-hidden p-3 text-left whitespace-nowrap"
                            style={{ width: `${columnWidths[col.id]}%`, minWidth: "80px" }}
                          >
                            {col.id === "status" ? (
                              <div className="flex items-center justify-start gap-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Select value={editingStatus} onValueChange={setEditingStatus}>
                                      <SelectTrigger className="w-48">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {STATUS_OPTIONS.map((status) => (
                                          <SelectItem key={status} value={status}>
                                            {status}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={() => handleSaveStatus(index)} className="h-8 w-8 p-0">
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="group flex items-center justify-start gap-2">
                                    <Badge variant={getStatusBadgeVariant(role.status)} className="px-2 py-1 text-xs">
                                      {role.status}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditStatus(index)}
                                      className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : col.id === "warehouses" ? (
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {role.warehouses.length > 0 ? role.warehouses.join(", ") : "No warehouses"}
                              </div>
                            ) : col.id.includes("date") ? (
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {formatDateSafely(role[col.id as keyof typeof role])}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {role[col.id as keyof typeof role]}
                              </div>
                            )}
                          </td>
                        ))}

                        <td className="sticky right-0 w-16 border-l border-gray-200 bg-white p-3 text-xs font-medium tracking-wider uppercase dark:border-gray-700 dark:bg-gray-900">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold">
                                Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => showToast(`Editing: ${role.role_name}`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => showToast(`Copied: ${role.role_name}`)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Make a Copy
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => showToast(`Added to favorites: ${role.role_name}`)}>
                                <Star className="mr-2 h-4 w-4" />
                                Favorite
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => showToast(`Deleted: ${role.role_name}`)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <td colSpan={displayColumns.length + 2} className="p-4">
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                Role Details: {role.role_name}
                              </h4>

                              <div className="overflow-x-auto">
                                <table className="w-2xl border border-gray-200 text-sm dark:border-gray-500">
                                  <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Role Code
                                      </th>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Status
                                      </th>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Active
                                      </th>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Warehouses Count
                                      </th>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Associated Warehouses
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                      <td className="border border-gray-200 p-3 dark:border-gray-700">
                                        {role.role_code}
                                      </td>
                                      <td className="border border-gray-200 p-3 dark:border-gray-700">{role.status}</td>
                                      <td className="border border-gray-200 p-3 dark:border-gray-700">
                                        {role.is_active ? "Yes" : "No"}
                                      </td>
                                      <td className="border border-gray-200 p-3 dark:border-gray-700">
                                        {role.warehouses.length}
                                      </td>
                                      <td className="border border-gray-200 p-3 dark:border-gray-700">
                                        {role.warehouses.join(", ")}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
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
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</span>
            <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
