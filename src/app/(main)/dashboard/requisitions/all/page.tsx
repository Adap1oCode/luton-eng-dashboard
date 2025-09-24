"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import {
  Filter,
  Printer,
  FileText,
  Package,
  ChevronDown,
  Calendar,
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
  Check,
  X,
  Save,
  Eye,
  Layout,
} from "lucide-react";
import { toast } from "sonner";

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
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock data - in real application this will come from API
const mockRequisitions = [
  {
    requisition_order_number: "LUT/REQ/AM/005/02/25",
    warehouse: "AM - WH 1",
    status: "Closed - Pick Complete",
    order_date: "2025-05-02",
    due_date: "2025-05-02",
    reference_number: "TRANSFER/BDI",
  },
  {
    requisition_order_number: "LUT/REQ/AM1/0508/02/25",
    warehouse: "AM - WH 1",
    status: "Closed - Pick Complete",
    order_date: "2025-03-03",
    due_date: "2025-07-03",
    reference_number: "AMRAHIA METE",
  },
  {
    requisition_order_number: "LUT/REQ/AM1/5323/02/25",
    warehouse: "AM - WH 1",
    status: "Closed - Pick Complete",
    order_date: "2025-03-03",
    due_date: "2025-07-03",
    reference_number: "EWUSIEJOE PRC",
  },
  {
    requisition_order_number: "LUT/REQ/AM1/2248/01/25",
    warehouse: "AM - WH 1",
    status: "In Progress - Pick Order Picked Short",
    order_date: "2025-04-10",
    due_date: "2025-04-18",
    reference_number: "SALTPOND TOW",
  },
  {
    requisition_order_number: "LUT/REQ/AM2/1894/02/25",
    warehouse: "AMC - WH 2",
    status: "In Progress - Pick Order Picked Short",
    order_date: "2025-03-10",
    due_date: "2025-04-03",
    reference_number: "BREMAN ASIKU",
  },
  {
    requisition_order_number: "LUT/REQ/AM2/1854/2025",
    warehouse: "AMC - WH 2",
    status: "Open - Pick Order Issued",
    order_date: "2025-01-20",
    due_date: "2025-04-05",
    reference_number: "ECG/PGIL-OYAR OYARIFA",
  },
  {
    requisition_order_number: "LUT/REQ/AM2/1854/01/25",
    warehouse: "AMC - WH 2",
    status: "Closed - Pick Complete",
    order_date: "2025-03-03",
    due_date: "2025-07-03",
    reference_number: "OYARIFA PROJEC",
  },
];

// Generate more mock data to reach 455 items
const generateMockData = () => {
  const data = [...mockRequisitions];
  const statuses = ["Open - Pick Order Issued", "In Progress - Pick Order Picked Short", "Closed - Pick Complete"];
  const warehouses = ["AM - WH 1", "AMC - WH 2", "BD - WH 3", "KM - WH 4"];

  for (let i = 8; i <= 455; i++) {
    data.push({
      requisition_order_number: `LUT/REQ/GEN/${String(i).padStart(4, "0")}/01/25`,
      warehouse: warehouses[i % warehouses.length],
      status: statuses[i % statuses.length],
      order_date: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        .toISOString()
        .split("T")[0],
      due_date: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        .toISOString()
        .split("T")[0],
      reference_number: `REF-${String(i).padStart(4, "0")}`,
    });
  }
  return data;
};

const allRequisitions = generateMockData();

// Available status options for editing
const STATUS_OPTIONS = ["Open - Pick Order Issued", "In Progress - Pick Order Picked Short", "Closed - Pick Complete"];

const getStatusBadgeVariant = (status: string) => {
  if (status.includes("Open")) return "default";
  if (status.includes("In Progress")) return "secondary";
  if (status.includes("Closed")) return "outline";
  return "default";
};

// Column configuration with sorting types and options
const COLUMNS = [
  {
    id: "requisition_order_number",
    label: "Requisition Order Number",
    width: "22%",
    required: true,
    sortType: "alphabetical" as const,
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "warehouse",
    label: "Warehouse",
    width: "12%",
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
    width: "22%",
    sortType: "status" as const,
    sortOptions: [
      { label: "Open → In Progress → Closed", value: "asc", icon: SortAsc },
      { label: "Closed → In Progress → Open", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "order_date",
    label: "Order Date",
    width: "13%",
    sortType: "date" as const,
    sortOptions: [
      { label: "Oldest First", value: "asc", icon: SortAsc },
      { label: "Newest First", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "due_date",
    label: "Due Date",
    width: "13%",
    sortType: "date" as const,
    sortOptions: [
      { label: "Oldest First", value: "asc", icon: SortAsc },
      { label: "Newest First", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "reference_number",
    label: "Reference Number",
    width: "16%",
    sortType: "alphabetical" as const,
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
];

// Sorting types
type SortDirection = "asc" | "desc" | "none";
type SortConfig = {
  column: string | null;
  direction: SortDirection;
  type: "alphabetical" | "date" | "status";
};

// Status priority for sorting
const STATUS_PRIORITY: Record<string, number> = {
  "Open - Pick Order Issued": 1,
  "In Progress - Pick Order Picked Short": 2,
  "Closed - Pick Complete": 3,
};

// View configuration type
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

// Mock items data for expanded rows
const mockItems = [
  {
    itemNumber: "5061037378338",
    type: "Inventory",
    requestedQty: 121,
    unit: "Ea",
    pickedQty: 0,
  },
  {
    itemNumber: "5061037378345",
    type: "Inventory",
    requestedQty: 148,
    unit: "Ea",
    pickedQty: 0,
  },
  {
    itemNumber: "5061003010118",
    type: "Inventory",
    requestedQty: 41,
    unit: "Ea",
    pickedQty: 0,
  },
  {
    itemNumber: "5061003010101",
    type: "Inventory",
    requestedQty: 1440,
    unit: "gr",
    pickedQty: 0,
  },
  {
    itemNumber: "5061003011900",
    type: "Inventory",
    requestedQty: 27,
    unit: "Ea",
    pickedQty: 0,
  },
];

// Helper function to format dates safely
const formatDateSafely = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return format(date, "MMM dd, yyyy");
  } catch (error) {
    return "Invalid Date";
  }
};

export default function AllRequisitionsPage() {
  const router = useRouter();
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [warehouseFilter, setWarehouseFilter] = useState("All Warehouses");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Column visibility and order state
  const [columnOrder, setColumnOrder] = useState<string[]>(COLUMNS.map((col) => col.id));
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
  );

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: "none",
    type: "alphabetical",
  });

  // Drag and drop state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  // Inline editing state
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");

  // Save View Dialog state
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");

  // Saved Views state
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    // Create default view
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

  // Get current view
  const currentView = useMemo(() => {
    return savedViews.find((view) => view.id === currentViewId) || savedViews[0];
  }, [savedViews, currentViewId]);

  // Apply view configuration
  const applyView = (view: SavedView) => {
    setColumnOrder(view.columnOrder);
    setVisibleColumns(view.visibleColumns);
    setSortConfig(view.sortConfig);
    setCurrentViewId(view.id);
    toast.success(`Applied view: ${view.name}`);
  };

  // Handle saving a new view
  const handleSaveView = () => {
    if (!viewName.trim()) {
      toast.error("Please enter a view name");
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

    toast.success(`View "${viewName}" saved successfully`);
  };

  // Handle deleting a view
  const handleDeleteView = (viewId: string) => {
    if (viewId === "default") {
      toast.error("Cannot delete the default view");
      return;
    }

    setSavedViews((prev) => prev.filter((view) => view.id !== viewId));

    if (currentViewId === viewId) {
      setCurrentViewId("default");
      applyView(savedViews.find((view) => view.id === "default")!);
    }

    toast.success("View deleted successfully");
  };

  // Handle sorting from header button
  const handleSort = (columnId: string) => {
    const column = COLUMNS.find((col) => col.id === columnId);
    if (!column) return;

    let newDirection: SortDirection = "asc";

    if (sortConfig.column === columnId) {
      if (sortConfig.direction === "asc") {
        newDirection = "desc";
      } else if (sortConfig.direction === "desc") {
        newDirection = "none";
      } else {
        newDirection = "asc";
      }
    }

    setSortConfig({
      column: newDirection === "none" ? null : columnId,
      direction: newDirection,
      type: column.sortType,
    });

    // Show toast notification
    if (newDirection === "none") {
      toast.success(`Sorting cleared for ${column.label}`);
    } else {
      const directionText = newDirection === "asc" ? "Ascending" : "Descending";
      toast.success(`Sorted by ${column.label} (${directionText})`);
    }
  };

  // Handle sorting from dropdown
  const handleSortFromDropdown = (columnId: string, direction: SortDirection) => {
    const column = COLUMNS.find((col) => col.id === columnId);
    if (!column) return;

    if (direction === "none") {
      setSortConfig({
        column: null,
        direction: "none",
        type: "alphabetical",
      });
      toast.success(`Sorting cleared for ${column.label}`);
    } else {
      setSortConfig({
        column: columnId,
        direction: direction,
        type: column.sortType,
      });

      const option = column.sortOptions.find((opt) => opt.value === direction);
      if (option) {
        toast.success(`Sorted by ${column.label} (${option.label})`);
      }
    }
  };

  // Get sort icon based on current state
  const getSortIcon = (columnId: string) => {
    if (sortConfig.column !== columnId) {
      return <ArrowUpDown className="h-3 w-3" />;
    }

    if (sortConfig.direction === "asc") {
      return <ArrowUp className="h-3 w-3" />;
    } else if (sortConfig.direction === "desc") {
      return <ArrowDown className="h-3 w-3" />;
    }

    return <ArrowUpDown className="h-3 w-3" />;
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = allRequisitions;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.requisition_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ??
          item.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ??
          item.reference_number.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Only Open filter - show only open orders
    if (onlyOpen) {
      filtered = filtered.filter((item) => item.status.includes("Open"));
    }

    // Only Mine filter - in real app this would depend on current user
    if (onlyMine) {
      filtered = filtered.filter((item) => item.warehouse === "AM - WH 1");
    }

    if (statusFilter !== "All Statuses") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (warehouseFilter !== "All Warehouses") {
      filtered = filtered.filter((item) => item.warehouse === warehouseFilter);
    }

    // Apply sorting
    if (sortConfig.column && sortConfig.direction !== "none") {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.column as keyof typeof a];
        const bValue = b[sortConfig.column as keyof typeof b];

        if (sortConfig.type === "date") {
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          return sortConfig.direction === "asc" ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
        }

        if (sortConfig.type === "status") {
          const aPriority = STATUS_PRIORITY[aValue] || 999;
          const bPriority = STATUS_PRIORITY[bValue] || 999;
          return sortConfig.direction === "asc" ? aPriority - bPriority : bPriority - aPriority;
        }

        // Alphabetical sorting
        if (sortConfig.direction === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }

    return filtered;
  }, [searchTerm, statusFilter, warehouseFilter, onlyMine, onlyOpen, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(allRequisitions.map((item) => item.status)));
  }, []);
  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(allRequisitions.map((item) => item.warehouse)));
  }, []);

  // Get visible columns in the correct order
  const displayColumns = useMemo(() => {
    return columnOrder
      .map((id) => COLUMNS.find((col) => col.id === id))
      .filter((col): col is NonNullable<typeof col> => col !== undefined && visibleColumns[col.id]);
  }, [columnOrder, visibleColumns]);

  // Calculate dynamic column widths
  const calculateColumnWidths = (): Record<string, string> => {
    const visibleCols = displayColumns.length;
    if (visibleCols === 0) return {};

    // Use fixed widths for better control
    const widths: Record<string, string> = {
      requisition_order_number: "22%",
      warehouse: "12%",
      status: "22%",
      order_date: "13%",
      due_date: "13%",
      reference_number: "16%",
    };

    return widths;
  };

  const columnWidths = calculateColumnWidths();

  // Button functions
  const handleNewRequisition = () => {
    router.push("/dashboard/requisitions/new");
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) {
      toast.error("Please select items to delete");
      return;
    }
    toast.success(`Successfully deleted ${selectedRows.length} items`);
    setSelectedRows([]);
  };

  const handleDuplicateSelected = () => {
    if (selectedRows.length === 0) {
      toast.error("Please select items to duplicate");
      return;
    }
    toast.success(`Successfully duplicated ${selectedRows.length} items`);
    setSelectedRows([]);
  };

  const handlePrintReport = (type: string) => {
    if (selectedRows.length === 0) {
      toast.error("Please select items to print");
      return;
    }
    toast.success(`Printing ${type} for ${selectedRows.length} items`);
  };

  const handlePrintInvoice = (type: string) => {
    if (selectedRows.length === 0) {
      toast.error("Please select items to print invoice");
      return;
    }
    toast.success(`Printing ${type} for ${selectedRows.length} items`);
  };

  const handlePrintPackingSlip = (type: string) => {
    if (selectedRows.length === 0) {
      toast.error("Please select items to print packing slip");
      return;
    }
    toast.success(`Printing ${type} for ${selectedRows.length} items`);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      const currentPageIndices = currentData.map((_, index) => startIndex + index);
      setSelectedRows(selectedRows.filter((i) => !currentPageIndices.includes(i)));
    } else {
      const currentPageIndices = currentData.map((_, index) => startIndex + index);
      const newSelectedRows = [...new Set([...selectedRows, ...currentPageIndices])];
      setSelectedRows(newSelectedRows);
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

  // Column visibility functions
  const handleColumnToggle = (columnId: string, visible: boolean) => {
    setVisibleColumns((prev) => ({ ...prev, [columnId]: visible }));
  };

  const handleShowAllColumns = () => {
    setVisibleColumns(COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}));
  };

  const handleHideAllColumns = () => {
    setVisibleColumns(
      COLUMNS.reduce(
        (acc, col) => ({
          ...acc,
          [col.id]: col.required ?? false,
        }),
        {},
      ),
    );
  };

  // Drag and drop functions for column reordering
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== targetColumnId) {
      const newColumnOrder = [...columnOrder];
      const draggedIndex = newColumnOrder.indexOf(draggedColumn);
      const targetIndex = newColumnOrder.indexOf(targetColumnId);

      // Remove dragged column from current position
      newColumnOrder.splice(draggedIndex, 1);
      // Insert dragged column before target column
      newColumnOrder.splice(targetIndex, 0, draggedColumn);

      setColumnOrder(newColumnOrder);

      const draggedColumnConfig = COLUMNS.find((col) => col.id === draggedColumn);
      if (draggedColumnConfig) {
        toast.success(`Column "${draggedColumnConfig.label}" moved`);
      }
    }

    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Reset column order to default
  const handleResetColumnOrder = () => {
    setColumnOrder(COLUMNS.map((col) => col.id));
    toast.success("Column order reset to default");
  };

  // Clear all sorting
  const handleClearSorting = () => {
    setSortConfig({
      column: null,
      direction: "none",
      type: "alphabetical",
    });
    toast.success("Sorting cleared");
  };

  // Handle row expansion
  const toggleRowDetails = (index: number) => {
    setExpandedRows((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  // Inline editing functions for status column
  const handleEditStatus = (index: number) => {
    const actualIndex = startIndex + index;
    const requisition = filteredData[actualIndex];
    setEditingRow(actualIndex);
    setEditingStatus(requisition.status);
  };

  const handleSaveStatus = (index: number) => {
    const actualIndex = startIndex + index;

    // In a real application, you would update the data via API here
    // For now, we'll just show a success message
    toast.success(`Status updated to: ${editingStatus}`);

    setEditingRow(null);
    setEditingStatus("");
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditingStatus("");
  };

  // CSV Export function
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Use only visible columns for export
      const columnsToExport = displayColumns.map((col) => col.id);

      // Create CSV headers
      const headers = columnsToExport
        .map((colId) => {
          const column = COLUMNS.find((c) => c.id === colId);
          return column ? `"${column.label}"` : `"${colId}"`;
        })
        .join(",");

      // Create data rows
      const csvRows = filteredData.map((item) => {
        return columnsToExport
          .map((colId) => {
            // Clean data and add quotes
            const value = item[colId as keyof typeof item] || "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",");
      });

      // Combine headers and data
      const csvContent = [headers, ...csvRows].join("\n");

      // Create file and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `requisitions_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredData.length} records to CSV`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  // Row action menu functions
  const handleEditRow = (index: number) => {
    const actualIndex = startIndex + index;
    const requisition = filteredData[actualIndex];
    toast.success(`Editing: ${requisition.requisition_order_number}`);
    // Add edit logic here
  };

  const handleDeleteRow = (index: number) => {
    const actualIndex = startIndex + index;
    const requisition = filteredData[actualIndex];
    toast.success(`Deleted: ${requisition.requisition_order_number}`);
    // Add delete logic here
  };

  const handleFavoriteRow = (index: number) => {
    const actualIndex = startIndex + index;
    const requisition = filteredData[actualIndex];
    toast.success(`Added to favorites: ${requisition.requisition_order_number}`);
    // Add favorite logic here
  };

  const handleMakeCopyRow = (index: number) => {
    const actualIndex = startIndex + index;
    const requisition = filteredData[actualIndex];
    toast.success(`Copied: ${requisition.requisition_order_number}`);
    // Add copy logic here
  };

  // Calculate checkbox states for current page
  const selectedInCurrentPage = selectedRows.filter(
    (index) => index >= startIndex && index < startIndex + currentData.length,
  ).length;

  const isAllSelected = currentData.length > 0 && selectedInCurrentPage === currentData.length;
  const isIndeterminate = selectedInCurrentPage > 0 && selectedInCurrentPage < currentData.length;

  // Render nothing on server to avoid hydration mismatch
  if (!isClient) {
    return (
      <div className="bg-background min-h-screen">
        <div className="w-full space-y-6 p-4 sm:p-6">
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
                  View Requisition Order
                </h1>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-center py-8">
              <div className="text-lg text-gray-500">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="w-full space-y-6 p-4 sm:p-6">
        {/* Title */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
                View Requisition Order
              </h1>
            </div>
          </div>
        </div>

        {/* Top toolbar */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          {/* First row - buttons and switches */}
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleNewRequisition} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedRows.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={handleDuplicateSelected} disabled={selectedRows.length === 0}>
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
                  <DropdownMenuItem onClick={() => handlePrintReport("Report")}>
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
                  <DropdownMenuItem onClick={() => handlePrintInvoice("Invoice")}>
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
                  <DropdownMenuItem onClick={() => handlePrintPackingSlip("Packing Slip")}>
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

        {/* Table */}
        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          {/* Table filters */}
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Views Dropdown */}
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
                            className={`flex items-center justify-between rounded-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${currentViewId === view.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
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
                                {format(view.createdAt, "MMM dd, yyyy")}
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

                  {/* Column Toggle Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Columns
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">
                        Show/Hide Columns
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="flex gap-1 p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleShowAllColumns}
                          className="h-7 flex-1 text-xs"
                        >
                          Show All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleHideAllColumns}
                          className="h-7 flex-1 text-xs"
                        >
                          Hide All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetColumnOrder}
                          className="h-7 flex-1 text-xs"
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
                            draggable
                            onDragStart={(e) => handleDragStart(e, column.id)}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column.id)}
                            onDragEnd={handleDragEnd}
                          >
                            <GripVertical className="h-3.5 w-3.5 cursor-move text-gray-400" />
                            <Checkbox
                              id={`column-${column.id}`}
                              checked={visibleColumns[column.id]}
                              onCheckedChange={(checked) => handleColumnToggle(column.id, checked as boolean)}
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

                  {/* Sorting Dropdown */}
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

                {/* Export CSV button on the far right */}
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

          {/* Actual table with dynamic column widths */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <colgroup>
                <col className="w-16" />
                {displayColumns.map((col) => (
                  <col key={col.id} style={{ width: columnWidths[col.id] }} />
                ))}
                <col className="w-16" />
              </colgroup>
              <thead className="bg-muted/50">
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
                  {displayColumns.map((col) => (
                    <th
                      key={col.id}
                      className={`text-muted-foreground min-w-[120px] p-3 text-center text-xs font-medium tracking-wider uppercase ${
                        dragOverColumn === col.id ? "bg-blue-100 dark:bg-blue-900" : ""
                      } ${sortConfig.column === col.id ? "bg-muted/70" : ""}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, col.id)}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, col.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-1">
                          <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
                          <span className="truncate">{col.label}</span>

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
                                  onClick={() => handleSortFromDropdown(col.id, option.value as SortDirection)}
                                >
                                  <option.icon className="h-3.5 w-3.5" />
                                  {option.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {showMoreFilters && (
                          <div className="flex justify-center gap-2">
                            <Input
                              placeholder="Filter..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 w-21 text-xs"
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
                                    Equal to
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                                    Starts with
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                                    Ends with
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
                    </th>
                  ))}

                  <th className="w-16 p-3 text-xs font-medium tracking-wider uppercase">ACTIONS</th>
                </tr>
              </thead>

              <tbody className="divide-border divide-y">
                {currentData.map((requisition, index) => {
                  const actualIndex = startIndex + index;
                  const isSelected = selectedRows.includes(actualIndex);
                  const isExpanded = expandedRows.includes(actualIndex);
                  const isEditing = editingRow === actualIndex;

                  return (
                    <React.Fragment key={actualIndex}>
                      <tr className={`hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/50" : ""}`}>
                        {/* Checkbox Column */}
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleRowDetails(actualIndex)}
                              className={`text-gray-400 transition-transform hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleSelectRow(index, !isSelected)}
                              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Dynamic Columns */}
                        {displayColumns.map((col) => (
                          <td key={col.id} className="p-3 text-center">
                            {col.id === "status" ? (
                              <div className="flex items-center justify-center gap-2">
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
                                  <div className="group flex items-center justify-center gap-2">
                                    <Badge
                                      variant={getStatusBadgeVariant(requisition.status)}
                                      className="px-2 py-1 text-xs"
                                    >
                                      {requisition.status}
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
                            ) : col.id.includes("date") ? (
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {formatDateSafely(requisition[col.id as keyof typeof requisition])}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {requisition[col.id as keyof typeof requisition]}
                              </div>
                            )}
                          </td>
                        ))}

                        {/* Actions Menu */}
                        <td className="p-3">
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
                              <DropdownMenuItem onClick={() => handleEditRow(index)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMakeCopyRow(index)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Make a Copy
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleFavoriteRow(index)}>
                                <Star className="mr-2 h-4 w-4" />
                                Favorite
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteRow(index)}
                                className="text-red-600 focus:text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>

                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <td colSpan={displayColumns.length + 2} className="p-4">
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                Requisition Details: {requisition.requisition_order_number}
                              </h4>

                              <div className="overflow-x-auto">
                                <table className="w-2xl border border-gray-200 text-sm dark:border-gray-500">
                                  <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Item Number
                                      </th>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Type
                                      </th>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Requested Qty
                                      </th>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Unit
                                      </th>
                                      <th className="border border-gray-200 p-3 text-left font-medium dark:border-gray-700">
                                        Picked Qty
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {mockItems.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="border border-gray-200 p-3 dark:border-gray-700">
                                          {item.itemNumber}
                                        </td>
                                        <td className="border border-gray-200 p-3 dark:border-gray-700">{item.type}</td>
                                        <td className="border border-gray-200 p-3 dark:border-gray-700">
                                          {item.requestedQty}
                                        </td>
                                        <td className="border border-gray-200 p-3 dark:border-gray-700">{item.unit}</td>
                                        <td className="border border-gray-200 p-3 dark:border-gray-700">
                                          {item.pickedQty}
                                        </td>
                                      </tr>
                                    ))}
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

          {/* Table footer with pagination info */}
          <div className="flex flex-col items-start justify-between gap-4 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center dark:border-gray-700">
            <div className="text-muted-foreground text-sm">
              <span>
                {selectedRows.length} of {filteredData.length} row(s) selected
              </span>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-sm">
                <span>Rows per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-muted-foreground text-sm">
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
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
      </div>

      {/* Save View Dialog */}
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
    </div>
  );
}
