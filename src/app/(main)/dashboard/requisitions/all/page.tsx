"use client";

import React, { useState, useMemo, useRef } from "react";

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
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

const getStatusBadgeVariant = (status: string) => {
  if (status.includes("Open")) return "default";
  if (status.includes("In Progress")) return "secondary";
  if (status.includes("Closed")) return "outline";
  return "default";
};

// Column configuration
const COLUMNS = [
  {
    id: "requisition_order_number",
    label: "Requisition Order Number",
    width: "22%",
    required: true, // This column cannot be hidden
  },
  {
    id: "warehouse",
    label: "Warehouse",
    width: "12%",
  },
  {
    id: "status",
    label: "Status",
    width: "22%",
  },
  {
    id: "order_date",
    label: "Order Date",
    width: "13%",
  },
  {
    id: "due_date",
    label: "Due Date",
    width: "13%",
  },
  {
    id: "reference_number",
    label: "Reference Number",
    width: "16%",
  },
];

export default function AllRequisitionsPage() {
  const router = useRouter();
  const checkboxRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [warehouseFilter, setWarehouseFilter] = useState("All Warehouses");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Column visibility state - all visible by default
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
  );

  // Filter data with Only Mine and Only Open filters
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
    // Here we'll assume "Mine" means orders from specific warehouse
    if (onlyMine) {
      filtered = filtered.filter((item) => item.warehouse === "AM - WH 1");
    }

    if (statusFilter !== "All Statuses") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (warehouseFilter !== "All Warehouses") {
      filtered = filtered.filter((item) => item.warehouse === warehouseFilter);
    }

    return filtered;
  }, [searchTerm, statusFilter, warehouseFilter, onlyMine, onlyOpen]);

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

  // Get visible columns
  const displayColumns = COLUMNS.filter((col) => visibleColumns[col.id]);

  // Calculate dynamic column widths
  const calculateColumnWidths = (): Record<string, string> => {
    const visibleCols = displayColumns.length;
    if (visibleCols === 0) return {};

    const baseWidth = Math.floor(88 / visibleCols); // 88% to leave space for checkbox
    const remainingWidth = 88 - baseWidth * visibleCols;

    return displayColumns.reduce(
      (acc, col, index) => {
        const extraWidth = index < remainingWidth ? 1 : 0;
        return { ...acc, [col.id]: `${baseWidth + extraWidth}%` };
      },
      {} as Record<string, string>,
    );
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
    // Keep required columns visible
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

  // Calculate checkbox states for current page
  const selectedInCurrentPage = selectedRows.filter(
    (index) => index >= startIndex && index < startIndex + currentData.length,
  ).length;

  const isAllSelected = currentData.length > 0 && selectedInCurrentPage === currentData.length;
  const isIndeterminate = selectedInCurrentPage > 0 && selectedInCurrentPage < currentData.length;

  return (
    <div className="bg-background min-h-screen">
      <div className="w-full space-y-6 p-4 sm:p-6">
        {/* Title */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
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
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100"
              >
                Filter/Sorting Applied
              </Badge>
            </div>
          </div>

          {/* Second row - print buttons */}
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
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          {/* Table filters */}
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex flex-col gap-4">
              {/* Main filters row */}
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Column Toggle Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Columns
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* Quick actions */}
                      <div className="flex gap-2 p-2">
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
                      </div>

                      <DropdownMenuSeparator />

                      {/* Column checkboxes */}
                      <div className="max-h-64 overflow-y-auto">
                        {COLUMNS.map((column) => (
                          <div key={column.id} className="flex items-center space-x-2 px-2 py-1.5">
                            <Checkbox
                              id={`column-${column.id}`}
                              checked={visibleColumns[column.id]}
                              onCheckedChange={(checked) => handleColumnToggle(column.id, checked as boolean)}
                              disabled={column.required}
                            />
                            <label
                              htmlFor={`column-${column.id}`}
                              className={`flex-1 cursor-pointer text-sm ${
                                column.required ? "text-muted-foreground" : ""
                              }`}
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
              </div>
            </div>
          </div>

          {/* Actual table with dynamic column widths */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <colgroup>
                <col className="w-12" />
                {displayColumns.map((col) => (
                  <col key={col.id} style={{ width: columnWidths[col.id] }} />
                ))}
              </colgroup>
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-12 p-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSelectAll}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </Button>
                  </th>
                  {displayColumns.map((col) => (
                    <th
                      key={col.id}
                      className="text-muted-foreground min-w-[50px] p-3 text-left text-xs font-medium tracking-wider uppercase"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <span className="truncate">{col.label}</span>
                          {col.id === "requisition_order_number" && <Calendar className="h-4 w-4 flex-shrink-0" />}
                        </div>
                        {showMoreFilters && (
                          <div className="flex gap-2">
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
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {currentData.map((requisition, index) => {
                  const actualIndex = startIndex + index;
                  const isSelected = selectedRows.includes(actualIndex);

                  return (
                    <tr
                      key={actualIndex}
                      className={`hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/50" : ""}`}
                    >
                      <td className="p-3">
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
                      </td>
                      {displayColumns.map((col) => (
                        <td key={col.id} className="p-3">
                          {col.id === "requisition_order_number" && (
                            <div
                              className="truncate text-sm font-medium text-gray-900 dark:text-gray-100"
                              title={requisition.requisition_order_number}
                            >
                              {requisition.requisition_order_number}
                            </div>
                          )}
                          {col.id === "warehouse" && (
                            <div
                              className="truncate text-sm text-gray-900 dark:text-gray-100"
                              title={requisition.warehouse}
                            >
                              {requisition.warehouse}
                            </div>
                          )}
                          {col.id === "status" && (
                            <div className="w-full">
                              <Badge
                                variant={getStatusBadgeVariant(requisition.status)}
                                className="inline-block max-w-full truncate px-2 py-1 text-xs"
                                title={requisition.status}
                              >
                                {requisition.status}
                              </Badge>
                            </div>
                          )}
                          {col.id === "order_date" && (
                            <div className="truncate text-sm text-gray-900 dark:text-gray-100">
                              {format(new Date(requisition.order_date), "MMM dd, yyyy")}
                            </div>
                          )}
                          {col.id === "due_date" && (
                            <div className="truncate text-sm text-gray-900 dark:text-gray-100">
                              {format(new Date(requisition.due_date), "MMM dd, yyyy")}
                            </div>
                          )}
                          {col.id === "reference_number" && (
                            <div
                              className="truncate text-sm text-gray-900 dark:text-gray-100"
                              title={requisition.reference_number}
                            >
                              {requisition.reference_number}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
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
    </div>
  );
}
