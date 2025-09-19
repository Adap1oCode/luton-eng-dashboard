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
  const checkboxRef = useRef<HTMLButtonElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [warehouseFilter, setWarehouseFilter] = useState("All Warehouses");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      setSelectedRows(currentData.map((_, index) => startIndex + index));
    } else {
      setSelectedRows([]);
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

  const isAllSelected = currentData.length > 0 && selectedRows.length === currentData.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < currentData.length;

  // Update checkbox indeterminate state
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">View Requisition Order</h1>
          <p className="text-muted-foreground">
            Pick Orders are orders that you create when inventory is requested by a customer and needs to be picked from
            your warehouse, store, storage facility, etc and shipped to the customer.
          </p>
        </div>
        <Button onClick={() => window.open("/dashboard/requisitions/all", "_blank")} variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          View Full Table
        </Button>
      </div>

      {/* Top toolbar */}
      <div className="space-y-4">
        {/* First row - buttons and switches */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={handleNewRequisition} className="bg-orange-500 hover:bg-orange-600">
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

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} />
              <Label htmlFor="only-mine">Only Mine</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="only-open" checked={onlyOpen} onCheckedChange={setOnlyOpen} />
              <Label htmlFor="only-open">Only Open</Label>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Filter/Sorting Applied
            </Badge>
          </div>
        </div>

        {/* Second row - print buttons */}
        <div className="flex items-center gap-2">
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
      <div className="rounded-md border">
        {/* Table filters */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
              <Input
                placeholder="Search requisitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px] pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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

          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
          </Button>
        </div>

        {/* Actual table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox ref={checkboxRef} checked={isAllSelected} onCheckedChange={handleSelectAll} />
              </TableHead>
              <TableHead className="min-w-[200px]">
                <div className="flex items-center gap-2">
                  Requisition Order Number
                  <Calendar className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Reference Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((requisition, index) => {
              const actualIndex = startIndex + index;
              const isSelected = selectedRows.includes(actualIndex);

              return (
                <TableRow key={actualIndex} className={isSelected ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{requisition.requisition_order_number}</TableCell>
                  <TableCell>{requisition.warehouse}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(requisition.status)}>{requisition.status}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(requisition.order_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{format(new Date(requisition.due_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{requisition.reference_number}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Table footer with pagination info */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <span>
              {selectedRows.length} of {filteredData.length} row(s) selected
            </span>
          </div>

          <div className="flex items-center gap-4">
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
  );
}
