"use client";

import { useEffect, useState, useMemo, useRef } from "react";

import { format } from "date-fns";
import { Filter as FilterIcon, ChevronLeft, ChevronRight, ChevronDown, Search, Calendar } from "lucide-react";
import { toast } from "sonner";

import * as dataAPI from "@/app/(main)/dashboard/inventory/_components/data";
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

export function useDataViewer({ config, records }: { config: ClientDashboardConfig; records: unknown[] }) {
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
    // ── keep your original logs ──
    console.log("🖱️ Widget clicked:", widget.key);
    console.log("🔎 Raw widget.filter tree:", (widget as any).filter);
    console.log("[TRACE] Widget clicked. key=", widget.key, "rpcName=", (widget as any).rpcName);

    const filterTree = (widget as any).filter;
    const rpcName = (widget as any).rpcName;
    const distinct = (widget as any).distinct ?? false;

    if (rpcName) {
      // 1) Try a JS‐side fetcher first
      const fetcher = (dataAPI as any)[rpcName];
      if (typeof fetcher === "function") {
        console.log("[TRACE] Using view fetcher:", rpcName, "for warehouse=", widget.key);
        setFilters([]);
        setRpcData(null);
        setLoading(true);
        try {
          const limit = config.tableLimit ?? 50;
          const rows = await fetcher(widget.key, limit);
          console.log("[TRACE] view fetcher returned", rows.length, "rows");
          setRpcData(rows);
          setDrawerOpen(true);
        } catch (e) {
          console.error("[ERROR] view fetcher", rpcName, "failed:", e);
        } finally {
          setLoading(false);
        }
        return;
      }

      // 2) Fallback to your old Supabase RPC
      console.log("[TRACE] Falling back to supabase.rpc:", rpcName);

      // build the same rpcFilter you had before
      const rpcFilter: Record<string, any> = {};
      if (filterTree?.and && Array.isArray(filterTree.and)) {
        const [warehouseClause, costClause] = filterTree.and;
        rpcFilter.column = warehouseClause.column;
        rpcFilter.op = "=";
        rpcFilter.value = warehouseClause.equals;
        if (costClause.or && Array.isArray(costClause.or)) {
          const parts = costClause.or.map((c: any) => {
            if (c.isNull) return `${c.column} IS NULL`;
            if (c.equals !== undefined) return `${c.column} = ${c.equals}`;
            return "";
          });
          rpcFilter.sql = `(${parts.join(" OR ")})`;
        }
      } else if (filterTree) {
        // fallback simple filter
        if ("op" in filterTree && "value" in filterTree) {
          Object.assign(rpcFilter, filterTree);
        }
      }

      setFilters([]);
      setRpcData(null);
      setLoading(true);

      try {
        const { data, error } = await supabase.rpc(rpcName, rpcFilter);
        if (error) throw error;
        console.log("[TRACE] supabase.rpc returned", data?.length ?? 0, "rows");
        setRpcData(data ?? []);
        setDrawerOpen(true);
      } catch (e) {
        console.error("[ERROR] supabase.rpc", rpcName, "failed:", e);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 3) No RPC, use client-side filtering
    if (filterTree) {
      console.log("[TRACE] Using client-side filtering");
      setRpcData(null);
      // Use filterTree directly - it's already a valid Filter
      setFilters([filterTree]);
      setDrawerOpen(true);
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

  return {
    filters,
    setFilters,
    drawerOpen,
    setDrawerOpen,
    filteredData,
    loading,
    handleClickWidget,
    handleFilter,
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
