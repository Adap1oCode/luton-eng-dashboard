"use client";

import { useEffect, useState, useMemo, useRef } from "react";

import { format } from "date-fns";
import { Filter as FilterIcon, ChevronLeft, ChevronRight, ChevronDown, Search, Calendar } from "lucide-react";
import { toast } from "sonner";

// Removed dataAPI import to prevent server-side code from being bundled in client
import { applyDataFilters, Filter } from "@/components/dashboard/client/data-filters";
import type { ClientDashboardConfig, DashboardWidget, DashboardTile } from "@/components/dashboard/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

export function useDataViewer({ config, records, totalCount }: { config: ClientDashboardConfig; records: unknown[]; totalCount?: number }) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [rpcData, setRpcData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const clientFiltered = filters.length === 0 ? records : applyDataFilters(records, filters, config);

  const filteredData = rpcData ?? clientFiltered;

  useEffect(() => {
    if (filters.length === 0 && rpcData === null) {
      setDrawerOpen(false);
    }
  }, [filters, rpcData]);

  useEffect(() => {
    if (filters.length > 0 || rpcData !== null) {
      console.group("[🧪 FILTER/RPC DATA]");
      console.log("Filters:", filters);
      console.log("Using RPC data?", rpcData !== null);
      console.log("Result count:", filteredData.length);
      console.groupEnd();
    }
  }, [filters, rpcData, filteredData]);

  const handleClickWidget = async (widget: DashboardWidget | DashboardTile) => {
    // ── COMPREHENSIVE DEBUG LOGGING ──
    console.log("🚨 ===== TILE CLICK DEBUG START =====");
    console.log("🖱️ Widget clicked:", widget.key);
    console.log("🔎 Raw widget object:", JSON.stringify(widget, null, 2));
    console.log("🔎 Raw widget.filter tree:", (widget as any).filter);
    console.log("🔎 Raw widget.rpcName:", (widget as any).rpcName);
    console.log("🔎 Raw widget.distinct:", (widget as any).distinct);
    console.log("🚨 CLICK HANDLER CALLED - This should show in browser console!");

    const filterTree = (widget as any).filter;
    const rpcName = (widget as any).rpcName;
    const distinct = (widget as any).distinct ?? false;
    
    console.log("🔍 Parsed values:");
    console.log("  - filterTree:", filterTree);
    console.log("  - rpcName:", rpcName);
    console.log("  - distinct:", distinct);

        if (rpcName) {
          // Use RPC function for filtering
          console.log("🔧 ===== RPC FUNCTION CALL DEBUG =====");
          console.log("🔧 RPC Name:", rpcName);
          console.log("🔧 Original filterTree:", filterTree);
          console.log("🔧 Distinct:", distinct);
          
          setFilters([]);
          setRpcData(null);
          setLoading(true);

          try {
            // Build RPC parameters
            const rpcParams: any = {
              _distinct: distinct || false,
              _range_from: 0,
              _range_to: 999 // Get more records for now until we implement proper pagination
            };

            // Add filter if present - convert to RPC format
            if (filterTree) {
              console.log("🔧 Processing filterTree:", filterTree);
              
              if (filterTree.column && filterTree.equals !== undefined) {
                // Convert equals filter to RPC format
                rpcParams._filter = {
                  column: filterTree.column,
                  op: "=",
                  value: filterTree.equals.toString()
                };
                console.log("🔧 Converted to equals filter:", rpcParams._filter);
                
                // Special handling for warehouse clicks - add missing cost filter
                if (filterTree.column === "warehouse") {
                  console.log("🔧 Warehouse filter detected - adding missing cost filter");
                  // For warehouse clicks on missing cost chart, we need to add both filters:
                  // 1. warehouse = selected warehouse
                  // 2. item_cost = 0 OR item_cost IS NULL
                  
                  // We'll use a custom filter that combines both conditions
                  // The RPC function will need to handle this special case
                  rpcParams._filter = {
                    column: "warehouse_and_missing_cost",
                    op: "=",
                    value: filterTree.equals.toString()
                  };
                  
                  console.log("🔧 Using combined warehouse + missing cost filter:", rpcParams._filter);
                }
              } else if (filterTree.column && filterTree.isNotNull) {
                // Convert isNotNull filter to RPC format
                rpcParams._filter = {
                  column: filterTree.column,
                  op: "IS NOT NULL"
                };
                console.log("🔧 Converted to isNotNull filter:", rpcParams._filter);
              } else {
                console.log("🔧 No filter conversion applied - filterTree doesn't match expected format");
                console.log("🔧 FilterTree structure:", JSON.stringify(filterTree, null, 2));
              }
            } else {
              console.log("🔧 No filterTree provided");
            }

            console.log("🔧 Final RPC parameters:", JSON.stringify(rpcParams, null, 2));

            // Call the RPC function via Supabase
            console.log("🔧 Calling supabase.rpc with:", rpcName, rpcParams);
            const { data, error } = await supabase.rpc(rpcName, rpcParams);
            
            if (error) {
              console.error("❌ RPC call failed:", error);
              throw error;
            }
            
            console.log("✅ RPC call successful!");
            console.log("✅ RPC returned", data?.length ?? 0, "rows");
            console.log("✅ Sample data:", data?.slice(0, 3));
            
            // For now, use the data length as the total count
            // TODO: Implement proper total count fetching
            const dataWithCount = data || [];
            if (dataWithCount.length > 0) {
              dataWithCount[0]._totalCount = dataWithCount.length;
            }
            
            setRpcData(dataWithCount);
            setDrawerOpen(true);
          } catch (e) {
            console.error("❌ RPC call failed:", e);
          } finally {
            setLoading(false);
          }
          console.log("🔧 ===== RPC FUNCTION CALL DEBUG END =====");
          return;
        }

    // 3) No RPC, fetch filtered data from API
    if (filterTree) {
      console.log("[TRACE] Fetching filtered data from API");
      setFilters([]);
      setRpcData(null);
      setLoading(true);

      try {
        // Build API query parameters from filter
        const params = new URLSearchParams({
          page: '1',
          pageSize: '1000', // Get more records for tile clicks
        });

        // Add distinct parameter if needed
        if (distinct) {
          params.set('distinct', 'true');
        }

        // Determine the API endpoint based on the config
        const apiEndpoint = config.id === 'inventory' ? '/api/inventory-details' : `/api/${config.id}`;
        const url = `${apiEndpoint}?${params.toString()}`;
        
        console.log("[TRACE] Calling API:", url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        
        const data = await response.json();
        console.log("[TRACE] API returned", data.rows?.length ?? 0, "rows, total:", data.total);
        setRpcData(data.rows ?? []);
        setDrawerOpen(true);
      } catch (e) {
        console.error("[ERROR] API call failed:", e);
      } finally {
        setLoading(false);
      }
    } else {
      console.warn("[WARN] Widget has no filter or rpcName:", widget);
    }
  };

  const handleFilter = (filterType: string) => {
    return (filters: Filter[]) => {
      console.log(`[handleFilter] filterType=${filterType}, filters=`, filters);
      setFilters(filters);
      setDrawerOpen(true);
    };
  };

  // Use the total count from the API response, or fall back to filtered data length
  // When RPC data is present, use the filtered data length instead of the original totalCount
  const finalTotalCount = rpcData !== null ? filteredData.length : (totalCount ?? filteredData.length);

  return {
    filters,
    setFilters,
    drawerOpen,
    setDrawerOpen,
    filteredData,
    loading,
    handleClickWidget,
    handleFilter,
    totalCount: finalTotalCount,
  };
}

export function DataViewer({
  drawerOpen,
  setDrawerOpen,
  filteredData,
  filters,
  config,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  filteredData: any[];
  filters: Filter[];
  config: ClientDashboardConfig;
}) {
  console.log(
    "[DEBUG DataViewer] drawerOpen=%s  filters=%o\n→ filteredData.length=%d firstRow=%o",
    drawerOpen,
    filters,
    filteredData.length,
    filteredData[0],
  );

  // DEBUG: Add temporary debug info to the DataViewer
  const debugInfo = {
    drawerOpen,
    filteredDataLength: filteredData.length,
    firstRow: filteredData[0],
    filters,
    configId: config.id
  };

  // map filteredData to ensure each row has a numeric `id` field
  const mappedData = useMemo(() => {
    const idKey = config && config.rowIdKey ? config.rowIdKey : "id";
    return (filteredData ?? []).map((row, idx) => {
      const rawId = row[idKey] ?? row.id ?? idx;
      const idNum = typeof rawId === "number" ? rawId : (Number(rawId) ?? idx);
      return { id: idNum, ...row };
    });
  }, [filteredData, config?.rowIdKey]);

  // State for filters and pagination - similar to requisitions page
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Default to 50 as requested
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Get column keys for dynamic filtering
  const columnKeys = useMemo(() => {
    return (config?.tableColumns ?? []).map((col: any) => col.accessorKey ?? col.id ?? col.header).filter(Boolean);
  }, [config?.tableColumns]);

  // Get unique values for each column for filter dropdowns
  const uniqueColumnValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    columnKeys.forEach((key) => {
      const values = Array.from(
        new Set(
          mappedData
            .map((item) => item[key])
            .filter((val) => val != null && val !== "")
            .map((val) => String(val)),
        ),
      ).sort();
      result[key] = values;
    });
    return result;
  }, [mappedData, columnKeys]);

  // Filter data based on search term and column filters
  const filteredTableData = useMemo(() => {
    let filtered = mappedData;

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        columnKeys.some((key) =>
          String(item[key] || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
        ),
      );
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, value]) => {
      if (value && value !== `All ${column}`) {
        filtered = filtered.filter((item) => String(item[column] || "") === value);
      }
    });

    return filtered;
  }, [mappedData, searchTerm, columnFilters, columnKeys]);

  // Pagination
  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredTableData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, columnFilters]);

  // Selection handlers
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

  // Action handlers
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

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        aria-labelledby="drawer-title"
        className="w-full max-w-none overflow-auto sm:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] 2xl:max-w-[95vw]"
      >
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
                  <h2 className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
                    Data Viewer ({filteredTableData.length} Records)
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    View and manage your data with advanced filtering and pagination capabilities.
                  </p>
                </div>
              </div>
            </div>

            {/* DEBUG INFO - TEMPORARY */}
            <div className="rounded-lg bg-red-100 border border-red-400 text-red-800 p-4 shadow-sm">
              <h3 className="font-bold text-lg">🔍 DATA VIEWER DEBUG INFO</h3>
              <div className="text-sm space-y-2">
                <p><strong>Drawer Open:</strong> {debugInfo.drawerOpen ? 'Yes' : 'No'}</p>
                <p><strong>Filtered Data Length:</strong> {debugInfo.filteredDataLength}</p>
                <p><strong>Config ID:</strong> {debugInfo.configId}</p>
                <p><strong>Filters:</strong> {JSON.stringify(debugInfo.filters)}</p>
                <p><strong>First Row Sample:</strong></p>
                <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(debugInfo.firstRow, null, 2)}
                </pre>
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
                          placeholder="Search all columns..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 lg:w-[280px]"
                        />
                      </div>

                      {/* Dynamic column filters */}
                      {columnKeys.slice(0, 3).map((columnKey) => {
                        const columnConfig = config?.tableColumns?.find(
                          (col: any) => (col.accessorKey ?? col.id ?? col.header) === columnKey,
                        );
                        const displayName = columnConfig?.header ?? columnKey;
                        const uniqueValues = uniqueColumnValues[columnKey] ?? [];

                        return (
                          <Select
                            key={columnKey}
                            value={columnFilters[columnKey] ?? `All ${displayName}`}
                            onValueChange={(value) =>
                              setColumnFilters((prev) => ({
                                ...prev,
                                [columnKey]: value === `All ${displayName}` ? "" : value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full sm:w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={`All ${displayName}`}>All {displayName}</SelectItem>
                              {uniqueValues.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setShowMoreFilters(!showMoreFilters)}
                      className="flex items-center gap-2"
                    >
                      <FilterIcon className="h-4 w-4" />
                      More Filters
                      <ChevronDown className={`h-4 w-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
                    </Button>
                  </div>

                  {/* Additional filters (collapsible) */}
                  {showMoreFilters && (
                    <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2 dark:border-gray-700">
                      {/* Show remaining column filters */}
                      {columnKeys.slice(3).map((columnKey) => {
                        const columnConfig = config?.tableColumns?.find(
                          (col: any) => (col.accessorKey ?? col.id ?? col.header) === columnKey,
                        );
                        const displayName = columnConfig?.header ?? columnKey;
                        const uniqueValues = uniqueColumnValues[columnKey] ?? [];

                        return (
                          <Select
                            key={columnKey}
                            value={columnFilters[columnKey] ?? `All ${displayName}`}
                            onValueChange={(value) =>
                              setColumnFilters((prev) => ({
                                ...prev,
                                [columnKey]: value === `All ${displayName}` ? "" : value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full sm:w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={`All ${displayName}`}>All {displayName}</SelectItem>
                              {uniqueValues.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setColumnFilters({});
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actual table */}
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
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.map((item, index) => {
                      const actualIndex = startIndex + index;
                      const isSelected = selectedRows.includes(actualIndex);

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
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTableData.length)} of{" "}
                    {filteredTableData.length} results
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
      </SheetContent>
    </Sheet>
  );
}
