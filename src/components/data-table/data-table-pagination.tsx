import type { Table as TanStackTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps {
  // Replace the manual props with a TanStack table
  table: TanStackTable<Record<string, unknown>>;
}

export function DataTablePagination({ table }: DataTablePaginationProps) {
  const pagination = table.getState().pagination;
  const itemsPerPage = pagination.pageSize;
  const currentPage = pagination.pageIndex + 1;
  const totalItems = table.getFilteredRowModel().rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const onPageChange = (page: number) => {
    const clamped = Math.min(Math.max(page, 1), totalPages);
    table.setPageIndex(clamped - 1);
  };

  const onItemsPerPageChange = (size: number) => {
    table.setPageSize(size);
    const newTotalPages = Math.max(1, Math.ceil(totalItems / size));
    if (currentPage > newTotalPages) {
      table.setPageIndex(newTotalPages - 1);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {selectedCount} of {totalItems} row(s) selected.
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-sm font-medium">Rows per page</span>
          <Select
            value={`${itemsPerPage}`}
            onValueChange={(value: string) => {
              onItemsPerPageChange(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
