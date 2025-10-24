"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { Filter as FilterIcon, ChevronLeft, ChevronRight, ChevronDown, Search, Calendar, X, Download, Printer, FileText } from "lucide-react";
import { toast } from "sonner";

import { applyDataFilters, Filter } from "@/components/dashboard/client/data-filters";
import type { ClientDashboardConfig, DashboardWidget, DashboardTile } from "@/components/dashboard/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    console.log("🚨 ===== TILE CLICK DEBUG START =====");
    console.log("🚨 Widget/Tile clicked:", widget);
    
    setLoading(true);
    
    try {
      const rpcName = (widget as any).rpcName;
      
      if (rpcName) {
        console.log("🔧 ===== RPC FUNCTION CALL DEBUG =====");
        console.log("🔧 RPC Name:", rpcName);
        
        // Build RPC parameters
        const rpcParams: any = {
          _distinct: false,
          _range_from: 0,
          _range_to: 999, // Large range for now
        };
        
        // Add filter if present - convert to RPC format
        const filter = (widget as any).filter;
        if (filter) {
          console.log("🔧 Original filter:", filter);
          
          if (filter.equals !== undefined) {
            // Convert equals filter to RPC format
            rpcParams._filter = {
              column: filter.column,
              op: "=",
              value: filter.equals
            };
          } else if (filter.isNotNull) {
            // Convert isNotNull filter to RPC format
            rpcParams._filter = {
              column: filter.column,
              op: "IS NOT NULL"
            };
          } else {
            // Pass through other filter formats
            rpcParams._filter = filter;
          }
        }
        
        console.log("🔧 Final RPC parameters:", JSON.stringify(rpcParams, null, 2));
        
        // Call the RPC function via Supabase
        const { data, error } = await supabase.rpc(rpcName, rpcParams);
        
        if (error) {
          console.error("❌ RPC call failed:", error);
          throw error;
        }
        
        console.log("✅ RPC call successful!");
        console.log("✅ RPC returned", data?.length ?? 0, "rows");
        
        setRpcData(data || []);
        setDrawerOpen(true);
      } else {
        // No RPC, use client-side filtering
        const filter = (widget as any).filter;
        if (filter) {
          setFilters([filter]);
          setDrawerOpen(true);
        }
      }
    } catch (e) {
      console.error("❌ RPC call failed:", e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      console.log("🔧 ===== RPC FUNCTION CALL DEBUG END =====");
    }
  };

  const handleFilter = (filterType: string) => (filters: Filter[]) => {
    setFilters(filters);
    setDrawerOpen(true);
  };

  const clearFilters = () => {
    setFilters([]);
    setRpcData(null);
    setDrawerOpen(false);
  };

  // Calculate total count for pagination
  const dataViewerTotalCount = rpcData ? rpcData.length : (totalCount || filteredData.length);

  return {
    filters,
    setFilters,
    drawerOpen,
    setDrawerOpen,
    filteredData,
    handleClickWidget,
    handleFilter,
    clearFilters,
    loading,
    totalCount: dataViewerTotalCount,
  };
}

interface DataViewerProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  filteredData: any[];
  filters: Filter[];
  config: ClientDashboardConfig;
  totalCount?: number;
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

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Handle row selection
  const isAllSelected = selectedRows.size === paginatedData.length && paginatedData.length > 0;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < paginatedData.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(paginatedData.map((_, index) => startIndex + index));
      setSelectedRows(allIndices);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(startIndex + index);
    } else {
      newSelected.delete(startIndex + index);
    }
    setSelectedRows(newSelected);
  };

  // Reset selection when data changes
  useEffect(() => {
    setSelectedRows(new Set());
    setCurrentPage(1);
  }, [filteredData, filters]);

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent className="w-full max-w-6xl overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Data Viewer</span>
            <div className="flex items-center gap-2">
              {filters.length > 0 && (
                <Badge variant="secondary">
                  {filters.length} filter{filters.length > 1 ? 's' : ''} applied
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Filters Display */}
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter, index) => (
                <Badge key={index} variant="outline">
                  {'column' in filter ? filter.column : 'filter'} {'equals' in filter && filter.equals !== undefined ? `= ${filter.equals}` : 'isNotNull' in filter && filter.isNotNull ? 'is not null' : 'filtered'}
                </Badge>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              
              {selectedRows.size > 0 && (
                <Badge variant="secondary">
                  {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {config.tableColumns?.map((column, index) => (
                    <TableHead key={index} className="px-2">
                      <div className="flex items-center gap-1">
                        <span>{column.header}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-2">
                      <Checkbox
                        checked={selectedRows.has(startIndex + index)}
                        onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                      />
                    </TableCell>
                    {config.tableColumns?.map((column, colIndex) => (
                      <TableCell key={colIndex} className="px-2">
                        {row[(column as any).key] !== undefined ? String(row[(column as any).key]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
              {totalCount > filteredData.length && ` (${totalCount} total)`}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}