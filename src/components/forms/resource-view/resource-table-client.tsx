// -----------------------------------------------------------------------------
// FILE: src/components/forms/resource-view/ResourceTableClient.tsx
// TYPE: Client Component
// PURPOSE: Generic client island for "View All <Resource>" screens.
//          - Uses SSR-materialised columns (config.columns) as canonical.
//          - Adds UI parity with Tally Cards: selection checkbox column,
//            grip icon, and sort button in each header.
// NOTES:
//  • No fetching here; SSR passes initialRows & initialTotal.
//  • Keeps inline Status editing behavior.
// -----------------------------------------------------------------------------

"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

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
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnOrderState,
  type VisibilityState,
  type Row, // for getRowId typings
} from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { StatusCell } from "@/components/data-table/status-cell";
import { useColumnResize } from "@/components/data-table/use-column-resize";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import { useSelectionStore } from "@/components/forms/shell/selection/selection-store";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GripVertical, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type ResourceTableClientProps<TRow extends { id: string }> = {
  config: BaseViewConfig<TRow>;
  initialRows: TRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
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
  const pathname = usePathname();

  // Connect row selection with selection store to enable bulk delete from toolbar
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);

  // 🔑 Columns: prefer SSR-materialised `config.columns`, fallback to legacy `buildColumns(true)` (if ever provided)
  const baseColumns = React.useMemo<ColumnDef<TRow, any>[]>(() => {
    const injected = (config as any)?.columns;
    if (Array.isArray(injected)) return injected as ColumnDef<TRow, any>[];
    if (typeof (config as any)?.buildColumns === "function") {
      return (config as any).buildColumns(true) as ColumnDef<TRow, any>[];
    }
    return [];
  }, [config]);

  // Local TanStack table state
  const [sorting, setSorting] = React.useState<any>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    warehouse: false, // example: hide by default
  });

  // ✅ Controlled pagination (0-based index)
  const [pagination, setPagination] = React.useState({
    pageIndex: Math.max(0, page - 1),
    pageSize,
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
    if (editingStatus) setEditingStatus({ ...editingStatus, value });
  };
  const handleStatusSave = async () => {
    if (!editingStatus) return;
    try {
      const resourceKey = (config as any)?.resourceKeyForDelete ?? "tcm_tally_cards";
      const res = await fetch(`/api/${resourceKey}/${editingStatus.rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editingStatus.value }),
      });
      if (res.ok) router.refresh();
      else alert("Failed to update status");
    } catch {
      alert("Error updating status");
    } finally {
      setEditingStatus(null);
    }
  };
  const handleStatusCancel = () => setEditingStatus(null);

  // ✅ Client-only "select" column (header + per-row checkboxes)
  const selectionColumn: ColumnDef<TRow, any> = React.useMemo(
    () => ({
      id: "__select",
      header: ({ table }) => {
        const all = table.getIsAllPageRowsSelected();
        const indeterminate = table.getIsSomePageRowsSelected();
        return (
          <div className="px-1">
            <Checkbox
              checked={all || indeterminate}
              onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
              aria-label="Select all"
            />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="px-1">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
          />
        </div>
      ),
      size: 42,
      enableHiding: false,
      enableResizing: false,
      enableSorting: false,
    }),
    [],
  );

  // 🎛️ Header decorator: Grip + label + Sort button (client-side only)
  function decorateHeader(label: React.ReactNode) {
    return ({ column }: any) => {
      const sorted = column.getIsSorted() as false | "asc" | "desc";
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1">
              <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
              <span className="mr-2 truncate">{label}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => column.toggleSorting(sorted === "asc")}
                className="has-[>svg]:px-3"
              >
                {sorted === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : sorted === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    };
  }

  // 🧩 Enhance columns
  const enhancedColumns = React.useMemo<ColumnDef<TRow, any>[]>(() => {
    const mapped = baseColumns.map((col) => {
      const c: ColumnDef<TRow, any> = { ...col };

      // If header is a plain string or ReactNode, replace with client function that decorates it
      const header = (col as any).header;
      if (typeof header === "string" || React.isValidElement(header) || header == null) {
        const label = header ?? (col as any).id ?? "";
        c.header = decorateHeader(label);
      }
      // Inline Status editing (keep your previous behavior)
      if (c.id === "status") {
        c.cell = ({ row }: any) => {
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
        };
      }
      return c;
    });

    return [selectionColumn, ...mapped];
  }, [baseColumns, editingStatus, selectionColumn]);

  const table = useReactTable<TRow>({
    data: initialRows,
    columns: enhancedColumns,
    state: {
      sorting,
      rowSelection,
      columnOrder,
      columnVisibility,
      pagination, // controlled
    },
    // ⬇️ These belong at the top level (NOT inside `state`)
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(initialTotal / Math.max(1, pagination.pageSize))),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination, // critical for controlled pagination

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableColumnResizing: true,
    getRowId: (row: TRow, idx: number, parent?: Row<TRow>) =>
      (row as any).id ?? `${parent?.id ?? "row"}_${idx}`,
  });

  // Sync selected IDs with the store
  React.useEffect(() => {
    const ids = table.getSelectedRowModel().rows.map((r) => (r.original as TRow).id);
    setSelectedIds(ids as string[]);
  }, [rowSelection, table, setSelectedIds]);

  // Listen for action from actions column via event delegation (includes nested Radix elements)
  React.useEffect(() => {
    const resourceKey = (config as any)?.resourceKeyForDelete ?? "tcm_tally_cards";

    async function handleDelete(rowId: string) {
      const confirmed = window.confirm("Are you sure you want to delete this record?");
      if (!confirmed) return;
      const res = await fetch(`/api/${resourceKey}/${rowId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert("Failed to delete record");
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
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [config, router]);

  // 🔄 Keep URL in sync whenever the controlled pagination changes
  React.useEffect(() => {
    const nextPage = pagination.pageIndex + 1;
    const nextSize = pagination.pageSize;
    const curPage = Number(search.get("page") ?? String(page));
    const curSize = Number(search.get("pageSize") ?? String(pageSize));
    if (curPage === nextPage && curSize === nextSize) return;
    const sp = new URLSearchParams(search.toString());
    sp.set("page", String(nextPage));
    sp.set("pageSize", String(nextSize));
    router.replace(`${pathname}?${sp.toString()}`);
  }, [pagination, pathname, router, search, page, pageSize]);

  // 🔁 When SSR props change (after navigation), update local pagination state
  React.useEffect(() => {
    setPagination((prev) => {
      const next = { pageIndex: Math.max(0, page - 1), pageSize };
      return prev.pageIndex === next.pageIndex && prev.pageSize === next.pageSize ? prev : next;
    });
  }, [page, pageSize]);

  const selectedCount = table.getSelectedRowModel().rows.length;
  const footer = <DataTablePagination table={table} totalCount={initialTotal} />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
        <DataTable
          dndEnabled={true}
          table={table as any}
          dataIds={dataIds}
          handleDragEnd={handleDragEnd}
          sensors={sensors}
          sortableId="resource-table"
          renderExpanded={
            renderExpanded ? (row) => renderExpanded(row.original as TRow) : undefined
          }
        />
        {footer}
      </SortableContext>
    </DndContext>
  );
}
