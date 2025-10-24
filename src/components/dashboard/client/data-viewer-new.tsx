"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Download, Printer, FileText, Calendar, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Import the standard DataTable components
import { DataTable as StandardDataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { withDndColumn } from "@/components/data-table/table-utils";

import type { ClientDashboardConfig } from "@/components/dashboard/types";
import type { Filter as FilterType } from "@/components/dashboard/client/data-filters";

// Define the column structure for the standard DataTable
const createColumns = (config: ClientDashboardConfig) => {
  const baseColumns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected() ?? (table.getIsSomePageRowsSelected() && "indeterminate")}
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            aria-label="Select all"
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
      ),
      cell: ({ row }: any) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
            aria-label="Select row"
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      label: "Select",
      sortOptions: [],
      type: "text" as const,
    },
  ];

  // Add columns from config
  const dataColumns = (config.tableColumns || []).map((column: any) => ({
    id: column.accessorKey ?? column.id ?? column.header,
    accessorKey: column.accessorKey ?? column.id ?? column.header,
    header: column.header,
    cell: ({ row }: any) => {
      const value = row.getValue(column.accessorKey ?? column.id ?? column.header);
      return (
        <div className="truncate">
          {column.header === "Status" && value ? (
            <Badge variant="outline">{String(value)}</Badge>
          ) : (
            String(value ?? "")
          )}
        </div>
      );
    },
    enableSorting: true,
    label: column.header,
    sortOptions: [],
    type: "text" as const,
  }));

  return [...baseColumns, ...dataColumns];
};

interface DataViewerProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  filteredData: any[];
  filters: FilterType[];
  config: ClientDashboardConfig;
}

export function DataViewer({
  drawerOpen,
  setDrawerOpen,
  filteredData,
  filters,
  config,
}: DataViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for the standard DataTable
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: "asc" | "desc" }>({
    column: null,
    direction: "asc",
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    (config.tableColumns || []).map((col: any) => col.accessorKey ?? col.id ?? col.header)
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    (config.tableColumns || []).map((col: any) => col.accessorKey ?? col.id ?? col.header)
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Create columns for the standard DataTable
  const columns = useMemo(() => createColumns(config), [config]);

  // Create the table instance
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row: any) => row[config.rowIdKey || "id"]?.toString() || Math.random().toString(),
  });

  // Handle sorting
  const handleSort = useCallback((columnId: string, direction: "asc" | "desc") => {
    setSortConfig({ column: columnId, direction });
  }, []);

  // Handle column filter changes
  const handleColumnFilterChange = useCallback((columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
  }, []);

  // Handle column order changes
  const handleColumnOrderChange = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
  }, []);

  // Handle column width changes
  const handleColumnWidthsChange = useCallback((widths: Record<string, number>) => {
    setColumnWidths(widths);
  }, []);

  // Handle row expansion
  const handleExpandRow = useCallback((index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Handle row selection
  const handleRowSelect = useCallback((selected: number[]) => {
    setSelectedRows(selected);
  }, []);

  // Render cell content
  const renderCell = useCallback((item: any, columnId: string) => {
    const value = item[columnId];
    return String(value ?? "");
  }, []);

  // Render expanded content
  const renderExpandedContent = useCallback((item: any) => {
    return (
      <div className="p-4 bg-gray-50">
        <pre className="text-sm">{JSON.stringify(item, null, 2)}</pre>
      </div>
    );
  }, []);

  // Handle print actions
  const handlePrintReport = (type: string) => {
    if (selectedRows.length === 0) {
      alert("Please select items to print");
      return;
    }
    alert(`Printing ${type} for ${selectedRows.length} items`);
  };

  const handlePrintInvoice = (type: string) => {
    if (selectedRows.length === 0) {
      alert("Please select items to print invoice");
      return;
    }
    alert(`Printing ${type} for ${selectedRows.length} items`);
  };

  const handlePrintPackingSlip = (type: string) => {
    if (selectedRows.length === 0) {
      alert("Please select items to print packing slip");
      return;
    }
    alert(`Printing ${type} for ${selectedRows.length} items`);
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        className="w-full max-w-none overflow-auto sm:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] 2xl:max-w-[95vw]"
      >
        <SheetHeader>
          <SheetTitle>Data Viewer ({filteredData.length} Records)</SheetTitle>
        </SheetHeader>
        
        <div className="bg-background min-h-screen">
          <div className="w-full space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
                    Data Viewer ({filteredData.length} Records)
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    View and manage your data with advanced filtering and pagination capabilities.
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            {filters.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Active Filters</h3>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {'column' in filter ? (
                        `${filter.column} ${filter.equals !== undefined ? `= ${filter.equals}` : "is not null"}`
                      ) : (
                        'and' in filter ? 'AND filter' : 'OR filter'
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintReport("Report")}
                    disabled={selectedRows.length === 0}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Print Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintInvoice("Invoice")}
                    disabled={selectedRows.length === 0}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Invoice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintPackingSlip("Packing Slip")}
                    disabled={selectedRows.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Print Packing Slip
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <DataTableViewOptions table={table} />
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
              <div className="p-6">
                <StandardDataTable
                  data={filteredData}
                  columns={columns}
                  sortConfig={sortConfig}
                  onSortFromDropdown={handleSort}
                  showMoreFilters={true}
                  globalSearch={globalSearch}
                  columnFilters={columnFilters}
                  onColumnFilterChange={handleColumnFilterChange}
                  visibleColumns={visibleColumns}
                  columnOrder={columnOrder}
                  onColumnOrderChange={handleColumnOrderChange}
                  columnWidths={columnWidths}
                  onColumnWidthsChange={handleColumnWidthsChange}
                  expandedRows={expandedRows}
                  onExpandRow={handleExpandRow}
                  renderCell={renderCell}
                  renderExpandedContent={renderExpandedContent}
                  onRowSelect={handleRowSelect}
                  selectedRows={selectedRows}
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


