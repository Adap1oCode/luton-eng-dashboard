// src/components/data-table/data-table-pagination.tsx
import type { Table as TanStackTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps<T = Record<string, unknown>> {
  /**
   * TanStack table instance (manual/server pagination mode).
   */
  table: TanStackTable<T>;
  /**
   * Optional total row count for "n of total" display.
   * Pass the real total from SSR (initialTotal). If omitted,
   * we'll approximate with pageCount * pageSize.
   */
  totalCount?: number;
}

export function DataTablePagination<T = Record<string, unknown>>({
  table,
  totalCount,
}: DataTablePaginationProps<T>) {
  const pagination = table.getState().pagination;
  const itemsPerPage = pagination.pageSize;
  const currentPage = pagination.pageIndex + 1;

  // In manual/server pagination, rely on the table's pageCount, not the current slice.
  const pageCount = Math.max(1, table.getPageCount());

  // Total items for display:
  // - Prefer explicit totalCount from SSR (accurate)
  // - Fallback to pageCount * pageSize (approx if last page is partial)
  const totalItems =
    typeof totalCount === "number" && Number.isFinite(totalCount)
      ? totalCount
      : pageCount * itemsPerPage;

  // Selected rows (within the current filtered model)
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const onPageChange = (page: number) => {
    const clamped = Math.min(Math.max(page, 1), pageCount);
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
            onValueChange={(value: string) => onItemsPerPageChange(Number(value))}
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
          Page {currentPage} of {pageCount}
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
            disabled={currentPage === pageCount}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>

          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => onPageChange(pageCount)}
            disabled={currentPage === pageCount}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
