"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import {
  Search,
  Filter,
  Printer,
  FileText,
  Package,
  ChevronDown,
  Calendar,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

import { getRequisitions } from "@/app/(main)/dashboard/requisitions/_components/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  // Filter data with Only Mine and Only Open filters
  const filteredData = useMemo(() => {
    let filtered = allRequisitions;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.requisition_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  const uniqueStatuses = Array.from(new Set(allRequisitions.map((item) => item.status)));
  const uniqueWarehouses = Array.from(new Set(allRequisitions.map((item) => item.warehouse)));

  // Button functions
  const handleNewRequisition = () => {
    router.push("/dashboard/requisitions/new");
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) {
      toast.error("Please select items to delete");
      return;
    }

    // In real app there would be an API call for deletion
    toast.success(`Successfully deleted ${selectedRows.length} items`);
    setSelectedRows([]);
  };

  const handleDuplicateSelected = () => {
    if (selectedRows.length === 0) {
      toast.error("Please select items to duplicate");
      return;
    }

    // In real app there would be an API call for duplication
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIndices = currentData.map((_, index) => startIndex + index);
      const newSelectedRows = [...new Set([...selectedRows, ...currentPageIndices])];
      setSelectedRows(newSelectedRows);
    } else {
      const currentPageIndices = currentData.map((_, index) => startIndex + index);
      setSelectedRows(selectedRows.filter((i) => !currentPageIndices.includes(i)));
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
              <svg className="h-12 w-12 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
                View Requisition Order
              </h1>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Pick Orders are orders that you create when inventory is requested by a customer and needs to be picked
                from your warehouse, store, storage facility, etc and shipped to the customer.
              </p>
            </div>
          </div>
        </div>

        {/* Top toolbar */}
        <div className="space-y-4">
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
                <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
                  <div className="relative flex-1 lg:flex-none">
                    <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                    <Input
                      placeholder="Search requisitions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 lg:w-[280px]"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Statuses">All Statuses</SelectItem>
                      {uniqueStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Warehouses">All Warehouses</SelectItem>
                      {uniqueWarehouses.map((warehouse) => (
                        <SelectItem key={warehouse} value={warehouse}>
                          {warehouse}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

              {/* Additional filters (collapsible) */}
              {showMoreFilters && (
                <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Switch id="only-mine-filters" checked={onlyMine} onCheckedChange={setOnlyMine} />
                    <Label htmlFor="only-mine-filters" className="text-sm font-medium">
                      Only Mine
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="only-open-filters" checked={onlyOpen} onCheckedChange={setOnlyOpen} />
                    <Label htmlFor="only-open-filters" className="text-sm font-medium">
                      Only Open
                    </Label>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("All Statuses");
                      setWarehouseFilter("All Warehouses");
                      setOnlyMine(false);
                      setOnlyOpen(false);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actual table - removed overflow-x-auto and min-w-full */}
          <div className="w-full">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 flex-shrink-0">
                    <div className="relative">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className={isIndeterminate ? "data-[state=unchecked]:bg-primary" : ""}
                      />
                      {isIndeterminate && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-0.5 w-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-1/4">
                    <div className="flex items-center gap-2">
                      <span className="truncate">Requisition Order Number</span>
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                    </div>
                  </TableHead>
                  <TableHead className="w-1/6">
                    <span className="truncate">Warehouse</span>
                  </TableHead>
                  <TableHead className="w-1/5">
                    <span className="truncate">Status</span>
                  </TableHead>
                  <TableHead className="w-1/8">
                    <span className="truncate">Order Date</span>
                  </TableHead>
                  <TableHead className="w-1/8">
                    <span className="truncate">Due Date</span>
                  </TableHead>
                  <TableHead className="w-1/6">
                    <span className="truncate">Reference Number</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((requisition, index) => {
                  const actualIndex = startIndex + index;
                  const isSelected = selectedRows.includes(actualIndex);

                  return (
                    <TableRow key={actualIndex} className={isSelected ? "bg-muted/50" : ""}>
                      <TableCell className="w-12">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="w-1/4 font-medium">
                        <div className="truncate pr-2" title={requisition.requisition_order_number}>
                          {requisition.requisition_order_number}
                        </div>
                      </TableCell>
                      <TableCell className="w-1/6">
                        <div className="truncate pr-2" title={requisition.warehouse}>
                          {requisition.warehouse}
                        </div>
                      </TableCell>
                      <TableCell className="w-1/5">
                        <Badge variant={getStatusBadgeVariant(requisition.status)} className="truncate">
                          {requisition.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-1/8">
                        <div className="truncate pr-2">{format(new Date(requisition.order_date), "MMM dd, yyyy")}</div>
                      </TableCell>
                      <TableCell className="w-1/8">
                        <div className="truncate pr-2">{format(new Date(requisition.due_date), "MMM dd, yyyy")}</div>
                      </TableCell>
                      <TableCell className="w-1/6">
                        <div className="truncate pr-2" title={requisition.reference_number}>
                          {requisition.reference_number}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
