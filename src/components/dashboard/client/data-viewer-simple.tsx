"use client";

import React, { useState, useMemo } from "react";
import { X, Download, Printer, FileText, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

import type { ClientDashboardConfig } from "@/components/dashboard/types";
import type { Filter as FilterType } from "@/components/dashboard/client/data-filters";

interface DataViewerProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  filteredData: any[];
  filters: FilterType[];
  config: ClientDashboardConfig;
  totalCount?: number; // Add total count for proper pagination
}

export function DataViewer({
  drawerOpen,
  setDrawerOpen,
  filteredData,
  filters,
  config,
  totalCount = 0,
}: DataViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // DEBUG: Log what data this component receives
  console.log("🔍 [DataViewer-Simple] Component received:", {
    drawerOpen,
    filteredDataLength: filteredData.length,
    totalCount,
    filters,
    configId: config.id,
    firstRow: filteredData[0],
    lastRow: filteredData[filteredData.length - 1]
  });

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const currentData = filteredData.slice(startIndex, endIndex);

  // Handle row selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set<number>();
      for (let i = startIndex; i < endIndex; i++) {
        newSelected.add(i);
      }
      setSelectedRows(newSelected);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const actualIndex = startIndex + index;
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(actualIndex);
    } else {
      newSelected.delete(actualIndex);
    }
    setSelectedRows(newSelected);
  };

  const isAllSelected = currentData.length > 0 && currentData.every((_, index) => selectedRows.has(startIndex + index));
  const isIndeterminate = selectedRows.size > 0 && !isAllSelected;

  // Handle print actions
  const handlePrintReport = (type: string) => {
    if (selectedRows.size === 0) {
      alert("Please select items to print");
      return;
    }
    alert(`Printing ${type} for ${selectedRows.size} items`);
  };

  const handlePrintInvoice = (type: string) => {
    if (selectedRows.size === 0) {
      alert("Please select items to print invoice");
      return;
    }
    alert(`Printing ${type} for ${selectedRows.size} items`);
  };

  const handlePrintPackingSlip = (type: string) => {
    if (selectedRows.size === 0) {
      alert("Please select items to print packing slip");
      return;
    }
    alert(`Printing ${type} for ${selectedRows.size} items`);
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        className="w-full max-w-none overflow-auto sm:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] 2xl:max-w-[95vw]"
      >
        <SheetHeader>
          <SheetTitle>Data Viewer ({totalCount} Records)</SheetTitle>
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
                    Data Viewer ({totalCount} Records)
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    View and manage your data with advanced filtering and pagination capabilities.
                  </p>
                </div>
              </div>
            </div>

            {/* DEBUG INFO - TEMPORARY */}
            <div className="rounded-lg bg-blue-100 border border-blue-400 text-blue-800 p-4 shadow-sm">
              <h3 className="font-bold text-lg">🔍 DATA VIEWER DEBUG INFO</h3>
              <div className="text-sm space-y-2">
                <p><strong>Component:</strong> data-viewer-simple.tsx</p>
                <p><strong>Drawer Open:</strong> {drawerOpen ? 'Yes' : 'No'}</p>
                <p><strong>Filtered Data Length:</strong> {filteredData.length}</p>
                <p><strong>Total Count:</strong> {totalCount}</p>
                <p><strong>Config ID:</strong> {config.id}</p>
                <p><strong>Filters Applied:</strong> {filters.length > 0 ? JSON.stringify(filters) : 'None'}</p>
                <p><strong>First Row Sample:</strong></p>
                <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(filteredData[0], null, 2)}
                </pre>
                <p><strong>Data Source:</strong> {filteredData.length === totalCount ? 'Full Dataset' : 'Filtered Dataset'}</p>
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
                    disabled={selectedRows.size === 0}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Print Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintInvoice("Invoice")}
                    disabled={selectedRows.size === 0}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Invoice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintPackingSlip("Packing Slip")}
                    disabled={selectedRows.size === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Print Packing Slip
                  </Button>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
              <div className="p-6">
                <div className="w-full">
                  <Table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-12" />
                      {config?.tableColumns?.map((_, index) => <col key={index} className="w-auto" />)}
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-2">
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
                        {config?.tableColumns?.map((column: any, index) => (
                          <TableHead key={index} className="px-2">
                            <div className="flex items-center gap-1">
                              <span className="truncate">{column.header}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.map((item, index) => {
                        const actualIndex = startIndex + index;
                        const isSelected = selectedRows.has(actualIndex);

                        return (
                          <TableRow key={actualIndex} className={isSelected ? "bg-muted/50" : ""}>
                            <TableCell className="px-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                              />
                            </TableCell>
                            {config?.tableColumns?.map((column: any, colIndex) => {
                              const key = column.accessorKey ?? column.id ?? column.header;
                              const value = item[key];

                              return (
                                <TableCell key={colIndex} className="px-2">
                                  <div className="truncate">
                                    {column.header === "Status" && value ? (
                                      <Badge variant="outline">{String(value)}</Badge>
                                    ) : (
                                      String(value ?? "")
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {startIndex + 1} to {endIndex} of {totalCount} results
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="px-2 text-sm text-gray-700 dark:text-gray-300">
                        Page {currentPage} of {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

