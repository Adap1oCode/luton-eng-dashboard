"use client";

import React, { useState, useMemo } from "react";

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

// Mock data - في التطبيق الحقيقي ستأتي من API
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

// إضافة المزيد من البيانات الوهمية للوصول إلى 455 عنصر
const generateMockData = () => {
  const data = [...mockRequisitions];
  for (let i = 0; i < 448; i++) {
    const baseItem = mockRequisitions[i % mockRequisitions.length];
    data.push({
      ...baseItem,
      requisition_order_number: `${baseItem.requisition_order_number}-${i + 1}`,
      reference_number: `${baseItem.reference_number}-${i + 1}`,
    });
  }
  return data;
};

const allRequisitions = generateMockData();

const getStatusBadgeVariant = (status: string) => {
  if (status.includes("Complete")) return "default";
  if (status.includes("Progress")) return "secondary";
  if (status.includes("Open")) return "outline";
  return "default";
};

export default function AllRequisitionsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [onlyMine, setOnlyMine] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(true);

  // فلترة البيانات مع إضافة فلاتر Only Mine و Only Open
  const filteredData = useMemo(() => {
    return allRequisitions.filter((req) => {
      const matchesSearch =
        req.requisition_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.warehouse.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const matchesWarehouse = warehouseFilter === "all" || req.warehouse === warehouseFilter;

      // فلترة Only Open - إظهار الطلبات المفتوحة فقط
      const matchesOnlyOpen = !onlyOpen || req.status.includes("Open") || req.status.includes("Progress");

      // فلترة Only Mine - في التطبيق الحقيقي ستعتمد على المستخدم الحالي
      // هنا سنفترض أن "Mine" تعني الطلبات من مستودع معين
      const matchesOnlyMine = !onlyMine || req.warehouse.includes("AM");

      return matchesSearch && matchesStatus && matchesWarehouse && matchesOnlyOpen && matchesOnlyMine;
    });
  }, [searchTerm, statusFilter, warehouseFilter, onlyMine, onlyOpen]);

  // تقسيم الصفحات
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = filteredData.slice(startIndex, endIndex);

  // الحصول على القيم الفريدة للفلاتر
  const uniqueStatuses = [...new Set(allRequisitions.map((req) => req.status))];
  const uniqueWarehouses = [...new Set(allRequisitions.map((req) => req.warehouse))];

  // وظائف الأزرار
  const handleNewRequisition = () => {
    router.push("/dashboard/requisitions/new");
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) {
      toast.error("يرجى تحديد عناصر للحذف");
      return;
    }

    // في التطبيق الحقيقي ستكون هناك API call للحذف
    toast.success(`تم حذف ${selectedRows.length} عنصر بنجاح`);
    setSelectedRows([]);
  };

  const handleDuplicateSelected = () => {
    if (selectedRows.length === 0) {
      toast.error("يرجى تحديد عناصر للنسخ");
      return;
    }

    // في التطبيق الحقيقي ستكون هناك API call للنسخ
    toast.success(`تم نسخ ${selectedRows.length} عنصر بنجاح`);
    setSelectedRows([]);
  };

  const handlePrintReport = (type: string) => {
    if (selectedRows.length === 0) {
      toast.error("يرجى تحديد عناصر للطباعة");
      return;
    }

    toast.success(`جاري طباعة ${type} لـ ${selectedRows.length} عنصر`);
  };

  const handlePrintInvoice = (type: string) => {
    if (selectedRows.length === 0) {
      toast.error("يرجى تحديد عناصر لطباعة الفاتورة");
      return;
    }

    toast.success(`جاري طباعة ${type} لـ ${selectedRows.length} عنصر`);
  };

  const handlePrintPackingSlip = (type: string) => {
    if (selectedRows.length === 0) {
      toast.error("يرجى تحديد عناصر لطباعة وصل التغليف");
      return;
    }

    toast.success(`جاري طباعة ${type} لـ ${selectedRows.length} عنصر`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(currentData.map((req) => req.requisition_order_number));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (reqNumber: string, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, reqNumber]);
    } else {
      setSelectedRows(selectedRows.filter((id) => id !== reqNumber));
    }
  };

  const isAllSelected = currentData.length > 0 && selectedRows.length === currentData.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < currentData.length;

  return (
    <div className="@container/main flex flex-col gap-4 p-4 md:gap-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">View Requisition Order</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pick Orders are orders that you create when inventory is requested by a customer and needs to be picked from
            your warehouse, store, storage facility, etc and shipped to the customer.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4" />
        </Button>
      </div>

      {/* شريط الأدوات العلوي */}
      <div className="flex flex-col gap-4">
        {/* الصف الأول - الأزرار والمفاتيح */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleNewRequisition}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={selectedRows.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={handleDuplicateSelected} disabled={selectedRows.length === 0}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="only-mine" className="text-sm">
                Only Mine
              </Label>
              <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="only-open" className="text-sm">
                Only Open
              </Label>
              <Switch id="only-open" checked={onlyOpen} onCheckedChange={setOnlyOpen} />
            </div>
            {(onlyMine || onlyOpen) && (
              <Badge variant="destructive" className="text-xs">
                Filter/Sorting Applied
              </Badge>
            )}
          </div>
        </div>

        {/* الصف الثاني - أزرار الطباعة */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Print Report
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handlePrintReport("Print All")}>Print All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintReport("Print Selected")}>Print Selected</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintReport("Export PDF")}>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Print Invoice
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handlePrintInvoice("Invoice Summary")}>Invoice Summary</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintInvoice("Detailed Invoice")}>
                Detailed Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Package className="mr-2 h-4 w-4" />
                Print Packing Slip
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handlePrintPackingSlip("Standard Slip")}>Standard Slip</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintPackingSlip("Detailed Slip")}>Detailed Slip</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* باقي الكود يبقى كما هو... */}
      {/* الجدول */}
      <div className="bg-card rounded-lg border">
        {/* فلاتر الجدول */}
        <div className="bg-muted/50 border-b p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search requisitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {uniqueWarehouses.map((warehouse) => (
                  <SelectItem key={warehouse} value={warehouse}>
                    {warehouse}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </div>

        {/* الجدول الفعلي */}
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                  />
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <div className="flex items-center gap-2">
                    Requisition Order
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
                <TableHead className="min-w-[150px]">
                  <div className="flex items-center gap-2">
                    Warehouse
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <div className="flex items-center gap-2">
                    Status
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <div className="flex items-center gap-2">
                    Order Date
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <div className="flex items-center gap-2">
                    Due Date
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <div className="flex items-center gap-2">
                    Reference Number
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((req) => (
                <TableRow key={req.requisition_order_number} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(req.requisition_order_number)}
                      onCheckedChange={(checked) => handleSelectRow(req.requisition_order_number, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-blue-600 hover:underline">
                    {req.requisition_order_number}
                  </TableCell>
                  <TableCell>{req.warehouse}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(req.status)} className="text-xs">
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{req.order_date ? format(new Date(req.order_date), "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell>{req.due_date ? format(new Date(req.due_date), "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell className="font-medium">{req.reference_number}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* تذييل الجدول مع معلومات التقسيم */}
        <div className="bg-muted/30 flex items-center justify-between border-t p-4">
          <div className="flex items-center gap-4">
            <div className="text-muted-foreground text-sm">
              {selectedRows.length} of {currentData.length} row(s) selected
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="page-size" className="text-sm">
                Rows per page
              </Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20" id="page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              {startIndex + 1} - {Math.min(endIndex, filteredData.length)} of {filteredData.length} items
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                ««
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ›
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                »»
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
