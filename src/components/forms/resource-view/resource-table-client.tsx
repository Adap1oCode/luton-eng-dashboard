// -----------------------------------------------------------------------------
// FILE: src/components/forms/resource-view/ResourceTableClient.tsx
// TYPE: Client Component
// PURPOSE: Generic client island for "View All <Resource>" screens.
//          - Builds a TanStack table from config
//          - Renders your shared DataTable
//          - Provides a standard footer with DataTablePagination
// NOTES:
//  • No data fetching here. SSR page passes initialRows & total.
//  • Uses your existing data-table primitives unchanged.
// -----------------------------------------------------------------------------

"use client";

import * as React from "react";

import { useRouter, useSearchParams } from "next/navigation";

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnOrderState,
  type VisibilityState,
} from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { StatusCell } from "@/components/data-table/status-cell";
import { useColumnResize } from "@/components/data-table/use-column-resize";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import { useSelectionStore } from "@/components/forms/shell/selection/selection-store";

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

  // Connect row selection with selection store to enable bulk delete from toolbar
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);

  // Columns from config, includeActions = true to keep parity with your view-defaults
  const columns = React.useMemo<ColumnDef<TRow, any>[]>(() => config.buildColumns?.(true) ?? [], [config]);

  // Local TanStack table state
  const [sorting, setSorting] = React.useState<any>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    warehouse: false, // Hide warehouse column by default
  });

  // Column widths state for resizing
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const tableRef = React.useRef<HTMLTableElement>(null);
  const { isResizing, onMouseDownResize } = useColumnResize(columnWidths, tableRef);

  // Status editing state
  const [editingStatus, setEditingStatus] = React.useState<{ rowId: string; value: string } | null>(null);

  // DnD setup for column reordering
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => initialRows.map((row) => row.id), [initialRows]);

  // Handle column reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Status editing handlers
  const handleStatusEditStart = (rowId: string, currentStatus: string) => {
    setEditingStatus({ rowId, value: currentStatus });
  };

  const handleStatusEditChange = (value: string) => {
    if (editingStatus) {
      setEditingStatus({ ...editingStatus, value });
    }
  };

  const handleStatusSave = async () => {
    if (!editingStatus) return;

    try {
      // Update status via API
      const resourceKey = (config as any)?.resourceKeyForDelete ?? "tcm_tally_cards";
      const res = await fetch(`/api/${resourceKey}/${editingStatus.rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editingStatus.value }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      alert("Error updating status");
    } finally {
      setEditingStatus(null);
    }
  };

  const handleStatusCancel = () => {
    setEditingStatus(null);
  };

  // Enhanced columns with inline editing for status
  const enhancedColumns = React.useMemo(() => {
    return columns.map((col) => {
      // Add inline editing to status column
      if (col.id === "status") {
        return {
          ...col,
          cell: ({ row }: any) => {
            const status = row.getValue("status") as string;
            const isEditing = editingStatus?.rowId === row.original.id;

            return (
              <StatusCell
                status={status}
                isEditing={isEditing}
                editingStatus={editingStatus?.value || status}
                statusOptions={["Active", "Inactive", "Pending", "Completed"]}
                onEditStart={() => handleStatusEditStart(row.original.id, status)}
                onEditChange={handleStatusEditChange}
                onSave={handleStatusSave}
                onCancel={handleStatusCancel}
              />
            );
          },
        };
      }
      return col;
    });
  }, [columns, editingStatus]);

  const table = useReactTable<TRow>({
    data: initialRows,
    columns: enhancedColumns,
    state: {
      sorting,
      rowSelection,
      columnOrder,
      columnVisibility,
      pagination: { pageIndex: Math.max(0, page - 1), pageSize },
    },
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(initialTotal / Math.max(1, pageSize))),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableColumnResizing: true,
    getRowId: (row, idx, parent) => (row as any).id ?? `${parent?.id ?? "row"}_${idx}`,
  });

  // Sync selected IDs with the store
  React.useEffect(() => {
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    setSelectedIds(ids);
  }, [rowSelection, table, setSelectedIds]);

  // Listen for action from actions column via event delegation (includes nested Radix elements)
  React.useEffect(() => {
    const resourceKey = (config as any)?.resourceKeyForDelete ?? "tcm_tally_cards";

    async function handleDelete(rowId: string) {
      // Simple confirmation before deletion
      const confirmed = window.confirm("Are you sure you want to delete this record?");
      if (!confirmed) return;

      const res = await fetch(`/api/${resourceKey}/${rowId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        // Error display can be improved later
        alert("Failed to delete record");
      }
    }

    const onClick = (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      if (!target) return;
      const actionEl = target.closest("[data-action-id]");
      if (!actionEl) return;

      const actionId = actionEl.getAttribute("data-action-id") || "";
      const rowId = actionEl.getAttribute("data-row-id") || "";

      if (!rowId) return;

      if (actionId === "delete") {
        ev.preventDefault();
        ev.stopPropagation();
        handleDelete(rowId);
      }
      // Initially focusing on delete only as requested
      // Can later support edit/copy here if desired
    };

    // use capture=true to ensure event capture even from nested Radix elements
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [config, router]);

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

  const footer = <DataTablePagination table={table} />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
        <DataTable
          dndEnabled={true} // Enable column reordering
          table={table as any}
          dataIds={dataIds}
          handleDragEnd={handleDragEnd}
          sensors={sensors}
          sortableId="resource-table"
          renderExpanded={
            renderExpanded
              ? (row) => {
                  return renderExpanded(row.original as TRow);
                }
              : undefined
          }
        />
        {footer}
      </SortableContext>
    </DndContext>
  );
}
