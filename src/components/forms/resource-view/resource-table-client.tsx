// -----------------------------------------------------------------------------
// FILE: src/components/forms/resource-view/ResourceTableClient.tsx
// TYPE: Client Component
// PURPOSE: Generic client island for “View All <Resource>” screens.
//          - Builds a TanStack table from config
//          - Renders your shared DataTable
//          - Provides a standard footer with DataTablePagination
// NOTES:
//  • No data fetching here. SSR page passes initialRows & total.
//  • Uses your existing data-table primitives unchanged.
// -----------------------------------------------------------------------------

"use client";

import * as React from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";

type ResourceTableClientProps<TRow extends { id: string }> = {
  config: BaseViewConfig<TRow>;
  initialRows: TRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
  // Optional slot to render an expanded row
  renderExpanded?: (row: TRow) => React.ReactNode;
};

export default function ResourceTableClient<TRow extends { id: string }>({
  config,
  initialRows,
  initialTotal,
  page,
  pageSize,
  renderExpanded,
}: ResourceTableClientProps<TRow>) {
  const router = useRouter();
  const search = useSearchParams();

  // Columns from config, includeActions = true to keep parity with your view-defaults
  const columns = React.useMemo<ColumnDef<TRow, any>[]>(() => config.buildColumns?.(true) ?? [], [config]);

  // Local TanStack table state (sorting only for now; filters saved per-view can be added later)
  const [sorting, setSorting] = React.useState<any>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable<TRow>({
    data: initialRows,
    columns,
    state: {
      sorting,
      rowSelection,
      // TanStack pagination is configured but we drive page via SSR (URL)
      pagination: { pageIndex: Math.max(0, page - 1), pageSize },
    },
    manualPagination: true, // SSR controls pages
    pageCount: Math.max(1, Math.ceil(initialTotal / Math.max(1, pageSize))),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    enableRowSelection: true,
    // defensive: derive id when needed
    getRowId: (row, idx, parent) => (row as any).id ?? `${parent?.id ?? "row"}_${idx}`,
  });

  const totalPages = Math.max(1, Math.ceil(initialTotal / Math.max(1, pageSize)));
  const selectedCount = table.getSelectedRowModel().rows.length;

  // URL navigation helpers (SSR refetch via router)
  const onPageChange = (nextPage: number) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    const params = new URLSearchParams(search.toString());
    params.set("page", String(clamped));
    params.set("pageSize", String(pageSize));
    router.push(`?${params.toString()}`);
  };

  const onItemsPerPageChange = (size: number) => {
    const params = new URLSearchParams(search.toString());
    params.set("page", "1");
    params.set("pageSize", String(size));
    router.push(`?${params.toString()}`);
  };

  const footer = (
    <DataTablePagination
      currentPage={page}
      totalPages={totalPages}
      itemsPerPage={pageSize}
      onPageChange={onPageChange}
      onItemsPerPageChange={onItemsPerPageChange}
      totalItems={initialTotal}
      selectedCount={selectedCount}
    />
  );

  return (
    <>
      <DataTable
        table={table}
        // If you provide an expanded-row renderer, pipe it through
        renderExpanded={
          renderExpanded
            ? (row) => {
                // row.original is the TRow
                return renderExpanded(row.original as TRow);
              }
            : undefined
        }
      />
      {footer}
    </>
  );
}
