// -----------------------------------------------------------------------------
// FILE: src/components/forms/resource-view/resource-table-client.tsx
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
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnOrderState,
  type VisibilityState,
  type Row,
} from "@tanstack/react-table";
import {
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings,
  ChevronDown,
  SortAsc,
  SortDesc,
  Filter,
} from "lucide-react";

import { ColumnsMenu } from "@/components/data-table/columns-menu";
import { exportCSV } from "@/components/data-table/csv-export";
import { DataTable } from "@/components/data-table/data-table";
import { type FilterColumn, type ColumnFilterState } from "@/components/data-table/data-table-filters";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { SortMenu } from "@/components/data-table/sort-menu";
import { StatusCell } from "@/components/data-table/status-cell";
import { stringPredicate } from "@/components/data-table/table-utils";
import { useColumnResize } from "@/components/data-table/use-column-resize";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import { useSelectionStore } from "@/components/forms/shell/selection/selection-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type FilterMode = "contains" | "equals" | "startsWith" | "endsWith";

type ResourceTableClientProps<TRow extends { id: string }> = {
  config: BaseViewConfig<TRow>;
  initialRows: TRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
  renderExpanded?: (row: TRow) => React.ReactNode;
  enableColumnResizing?: boolean;
  enableColumnReordering?: boolean;
};

// ✅ FIX 1 & 2: Move DraggableHeaderCell outside component (fixes nested component + hook in callback)
interface DraggableHeaderCellProps {
  columnId: string;
  label: React.ReactNode;
  sorted: false | "asc" | "desc";
  isReorderable: boolean;
  onToggleSort: () => void;
  onMouseDownResize: (e: React.MouseEvent<HTMLDivElement>, columnId: string) => void;
}

const DraggableHeaderCell: React.FC<DraggableHeaderCellProps> = ({
  columnId,
  label,
  sorted,
  isReorderable,
  onToggleSort,
  onMouseDownResize,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: columnId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={isReorderable ? setNodeRef : undefined}
      style={isReorderable ? style : undefined}
      className="relative space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1">
          <GripVertical
            className="h-4 w-4 cursor-move text-gray-400"
            {...(isReorderable ? attributes : {})}
            {...(isReorderable ? listeners : {})}
          />
          <span className="mr-2 truncate">{label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={onToggleSort} className="has-[>svg]:px-3">
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
      {/* Resize handle on the right edge */}
      <div
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize select-none"
        onMouseDown={(e) => onMouseDownResize(e as React.MouseEvent<HTMLDivElement>, columnId)}
      />
    </div>
  );
};

// ✅ Move header decorator component outside to avoid nested component error
interface DecoratedHeaderProps {
  column: {
    id: string;
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
  label: React.ReactNode;
  columnOrder: string[];
  onMouseDownResize: (e: React.MouseEvent<HTMLDivElement>, columnId: string) => void;
}

const DecoratedHeader: React.FC<DecoratedHeaderProps> = ({ column, label, columnOrder, onMouseDownResize }) => {
  const sorted = column.getIsSorted();
  const reorderable = columnOrder.includes(column.id) && column.id !== "actions" && column.id !== "__select";

  return (
    <DraggableHeaderCell
      columnId={column.id}
      label={label}
      sorted={sorted}
      isReorderable={reorderable}
      onToggleSort={() => column.toggleSorting(sorted === "asc")}
      onMouseDownResize={onMouseDownResize}
    />
  );
};

// ✅ StatusCellWrapper component outside to avoid nested component error
interface StatusCellWrapperProps<TRow> {
  row: Row<TRow>;
  editingStatus: { rowId: string; value: string } | null;
  onEditStart: (rowId: string, status: string) => void;
  onEditChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const StatusCellWrapper = <TRow extends { id: string }>({
  row,
  editingStatus,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
}: StatusCellWrapperProps<TRow>) => {
  const rawStatus = row.getValue("status");

  // Safer coercion:
  // - Preserve strings as-is
  // - Map null/undefined to ""
  // - String() for everything else
  const statusString = typeof rawStatus === "string" ? rawStatus : rawStatus == null ? "" : String(rawStatus);

  const isEditing = editingStatus?.rowId === (row.original as { id: string }).id;

  return (
    <StatusCell
      status={statusString}
      isEditing={isEditing}
      // Use ?? to preserve intentional empty strings
      editingStatus={editingStatus?.value ?? statusString}
      statusOptions={["Active", "Inactive", "Pending", "Completed"]}
      onEditStart={() => onEditStart((row.original as { id: string }).id, statusString)}
      onEditChange={onEditChange}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};

export default function ResourceTableClient<TRow extends { id: string }>({
  config,
  initialRows,
  initialTotal,
  page,
  pageSize,
  renderExpanded,
  enableColumnResizing = true,
  enableColumnReordering = true,
}: ResourceTableClientProps<TRow>) {
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();

  // Connect row selection with selection store to enable bulk delete from toolbar
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);

  // 🔑 Columns: prefer SSR-materialised `config.columns`, fallback to legacy `buildColumns(true)` (if ever provided)
  const baseColumns = React.useMemo<ColumnDef<TRow, unknown>[]>(() => {
    const injected = (config as Record<string, unknown>)?.columns;
    if (Array.isArray(injected)) return injected as ColumnDef<TRow, unknown>[];
    if (typeof (config as Record<string, unknown>)?.buildColumns === "function") {
      return (config as { buildColumns: (arg: boolean) => ColumnDef<TRow, unknown>[] }).buildColumns(true);
    }
    return [];
  }, [config]);

  // Local TanStack table state
  const [sorting, setSorting] = React.useState<Array<{ id: string; desc: boolean }>>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const initialOrderRef = React.useRef<string[]>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    tally_card_number: true,
    item_number: true,
    is_active: true,
    warehouse: true,
  });

  // ✅ Filters state tied to DataTableFilters
  const [filters, setFilters] = React.useState<Record<string, ColumnFilterState>>({});
  const columnFilters = React.useMemo(() => {
    return Object.entries(filters).map(([id, v]) => ({ id, value: v }));
  }, [filters]);

  // ✅ Controlled pagination (0-based index)
  const [pagination, setPagination] = React.useState({
    pageIndex: Math.max(0, page - 1),
    pageSize,
  });

  // ✅ NEW: State لإظهار/إخفاء قسم More Filters
  const [showMoreFilters, setShowMoreFilters] = React.useState(false);

  // Column widths state for resizing
  const [columnWidths] = React.useState<Record<string, number>>({});
  const tableRef = React.useRef<HTMLDivElement>(null);
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
  const handleStatusEditStart = React.useCallback((rowId: string, currentStatus: string) => {
    setEditingStatus({ rowId, value: currentStatus });
  }, []);

  const handleStatusEditChange = React.useCallback((value: string) => {
    setEditingStatus((prev) => (prev ? { ...prev, value } : null));
  }, []);

  const handleStatusSave = React.useCallback(async () => {
    if (!editingStatus) return;
    try {
      const resourceKey = (config as Record<string, unknown>)?.resourceKeyForDelete ?? "tcm_tally_cards";
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
  }, [editingStatus, config, router]);

  const handleStatusCancel = React.useCallback(() => setEditingStatus(null), []);

  // ✅ Client-only "select" column (header + per-row checkboxes)
  const selectionColumn: ColumnDef<TRow, unknown> = React.useMemo(
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

  // 🎛️ Memoized columns that include decorated headers
  const columnsWithHeaders = React.useMemo(() => {
    return baseColumns.map((col) => {
      const c: ColumnDef<TRow, unknown> = { ...col };

      const header = (col as { header?: string | React.ReactElement | null }).header;
      if (typeof header === "string" || React.isValidElement(header) || header == null) {
        const label = header ?? (col as { id?: string }).id ?? "";
        // Assign header as a render function directly
        c.header = (props) => (
          <DecoratedHeader
            column={
              props.column as {
                id: string;
                getIsSorted: () => false | "asc" | "desc";
                toggleSorting: (desc?: boolean) => void;
              }
            }
            label={label}
            columnOrder={columnOrder}
            onMouseDownResize={onMouseDownResize}
          />
        );
      }

      return c;
    });
  }, [baseColumns, columnOrder, onMouseDownResize]);

  // 🧩 Enhance columns: add filter function + inline status editing
  const enhancedColumns = React.useMemo<ColumnDef<TRow, unknown>[]>(() => {
    const mapped = columnsWithHeaders.map((col) => {
      const c: ColumnDef<TRow, unknown> = { ...col };

      // ✅ جعل عمود الـ actions ثابتًا بدون فلترة
      if (c.id === "actions") {
        c.enableColumnFilter = false;
        c.enableSorting = false;
        c.enableHiding = false;
        c.enableResizing = false;
        return c;
      }

      // Assign a flexible filter function supporting modes
      (c as { filterFn?: (row: Row<TRow>, id: string, filter: ColumnFilterState) => boolean }).filterFn = (
        row: Row<TRow>,
        id: string,
        filter: ColumnFilterState,
      ) => {
        const raw = row.getValue(id);
        const strVal = id === "is_active" ? (raw ? "Active" : "Inactive") : String(raw ?? "");
        const mode: FilterMode = (filter?.mode as FilterMode) ?? "contains";
        return stringPredicate(strVal, filter?.value ?? "", mode);
      };

      // Inline Status editing where id === "status" if present
      if (c.id === "status") {
        c.cell = (cellProps) => (
          <StatusCellWrapper
            row={cellProps.row}
            editingStatus={editingStatus}
            onEditStart={handleStatusEditStart}
            onEditChange={handleStatusEditChange}
            onSave={handleStatusSave}
            onCancel={handleStatusCancel}
          />
        );
      }
      return c;
    });

    const hasSelectionColumn = baseColumns.some((col) => {
      const id = (col as { id?: string; accessorKey?: string }).id ?? (col as { accessorKey?: string }).accessorKey;
      return id === "select" || id === "__select";
    });

    return hasSelectionColumn ? mapped : [selectionColumn, ...mapped];
  }, [
    columnsWithHeaders,
    editingStatus,
    selectionColumn,
    handleStatusEditChange,
    handleStatusSave,
    handleStatusCancel,
    handleStatusEditStart,
  ]);

  const table = useReactTable<TRow>({
    data: initialRows,
    columns: enhancedColumns,
    state: {
      sorting,
      rowSelection,
      columnOrder,
      columnVisibility,
      pagination,
      columnFilters,
    },
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(initialTotal / Math.max(1, pagination.pageSize))),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // ✅ FIX 4: Use ES6 import instead of require
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableColumnResizing: enableColumnResizing,
    getRowId: (row: TRow, idx: number, parent?: Row<TRow>) =>
      (row as { id?: string }).id ?? `${parent?.id ?? "row"}_${idx}`,
  });

  // Sync selected IDs with the store
  React.useEffect(() => {
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    setSelectedIds(ids);
  }, [rowSelection, table, setSelectedIds]);

  // Listen for action from actions column via event delegation (includes nested Radix elements)
  React.useEffect(() => {
    const resourceKey = (config as Record<string, unknown>)?.resourceKeyForDelete ?? "tcm_tally_cards";
    const routeSegment =
      (config as Record<string, unknown>)?.formsRouteSegment ?? String(resourceKey).replace(/_/g, "-");

    async function handleDelete(rowId: string) {
      const confirmed = window.confirm("Are you sure you want to delete this item? This action cannot be undone.");
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/${resourceKey}/${rowId}`, { method: "DELETE" });
        if (res.ok) {
          alert("Item deleted successfully!");
          router.refresh();
        } else {
          const errorData = await res.json();
          alert(`Failed to delete item: ${errorData.error?.message || "Unknown error"}`);
        }
      } catch (error) {
        alert("Failed to delete item. Please try again.");
      }
    }

    async function handleEdit(rowId: string) {
      // Navigate to the correct forms route segment
      router.push(`/forms/${routeSegment}/edit/${rowId}`);
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
        void handleDelete(rowId);
      } else if (actionId === "edit") {
        ev.preventDefault();
        ev.stopPropagation();
        void handleEdit(rowId);
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

  // ✅ FIX 3: Move dragIdRef outside the useMemo to avoid hook-in-callback issue
  const dragIdRef = React.useRef<string | null>(null);

  // ✅ Toolbar مربوط بحالة TanStack Table باستخدام ColumnsMenu و SortMenu + Export
  const ColumnsAndSortToolbar = React.useMemo(() => {
    const leafColumns = table
      .getAllLeafColumns()
      .filter((c) => c.getCanHide() && c.id !== "actions" && c.id !== "__select" && c.id !== "select");

    const labelFor = (id: string) => {
      switch (id) {
        case "tally_card_number":
          return "Tally Card Number";
        case "item_number":
          return "Item Number";
        case "is_active":
          return "Status";
        case "warehouse":
          return "Warehouse";
        default:
          return id;
      }
    };

    const sortingState = table.getState().sorting ?? [];
    const current = sortingState[0] ?? { id: null, desc: false };

    const showAll = () => leafColumns.forEach((c) => c.toggleVisibility(true));
    const hideAll = () => leafColumns.forEach((c) => c.toggleVisibility(false));
    const setSort = (columnId: string, dir: "asc" | "desc") => {
      table.setSorting([{ id: columnId, desc: dir === "desc" }]);
    };
    const clearSorting = () => table.setSorting([]);

    const menuColumns = leafColumns.map((c) => ({
      id: String(c.id),
      label: labelFor(String(c.id)),
      required: !c.getCanHide(),
    }));
    const visibleColumns: Record<string, boolean> = Object.fromEntries(
      leafColumns.map((c) => [String(c.id), c.getIsVisible()]),
    );
    const displayColumnsCount = Object.values(visibleColumns).filter(Boolean).length;

    // HTML5 drag داخل قائمة الأعمدة
    const onDragStart = (e: React.DragEvent, columnId: string) => {
      dragIdRef.current = columnId;
      e.dataTransfer.setData("text/plain", columnId);
    };
    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };
    const onDrop = (e: React.DragEvent, dropId: string) => {
      e.preventDefault();
      const dragId = e.dataTransfer.getData("text/plain") || dragIdRef.current;
      if (!dragId || dragId === dropId) return;
      setColumnOrder((prev) => {
        const withoutDrag = prev.filter((id) => id !== dragId);
        const dropIdx = withoutDrag.indexOf(dropId);
        const next = [
          ...withoutDrag.slice(0, Math.max(0, dropIdx)),
          dragId,
          ...withoutDrag.slice(Math.max(0, dropIdx)),
        ];
        return next;
      });
    };

    const onColumnToggle = (columnId: string, visible: boolean) => {
      table.getColumn(columnId)?.toggleVisibility(visible);
    };

    // أنواع محلية متوافقة مع SortMenu
    type SortDirectionLocal = "asc" | "desc" | "none";
    type SortOptionLocal = {
      label: string;
      value: SortDirectionLocal;
      icon: React.ComponentType<{ className?: string }>;
    };
    type SortColumnLocal = { id: string; label: string; sortOptions: SortOptionLocal[] };

    const sortColumns: SortColumnLocal[] = menuColumns.map((c) => ({
      id: c.id,
      label: c.label,
      sortOptions: [
        { label: "A to Z", value: "asc", icon: SortAsc },
        { label: "Z to A", value: "desc", icon: SortDesc },
        { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
      ],
    }));
    const sortConfig: { column: string | null; direction: SortDirectionLocal } = {
      column: current?.id ?? null,
      direction: current?.id ? (current.desc ? "desc" : "asc") : "none",
    };
    const onSort = (columnId: string, direction: SortDirectionLocal) => {
      if (direction === "none") {
        clearSorting();
        return;
      }
      setSort(columnId, direction);
    };
    const onClearAll = clearSorting;

    return (
      <div className="flex items-center gap-2">
        {/* Columns dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Columns
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[320px]">
            <ColumnsMenu
              columns={menuColumns}
              visibleColumns={visibleColumns}
              displayColumnsCount={displayColumnsCount}
              isResizing={isResizing}
              onColumnToggle={onColumnToggle}
              onShowAll={showAll}
              onHideAll={hideAll}
              onResetOrder={() => {
                if (initialOrderRef.current.length) {
                  setColumnOrder(initialOrderRef.current);
                }
              }}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[260px]">
            <SortMenu
              columns={sortColumns}
              sortConfig={sortConfig as { column: string | null; direction: "asc" | "desc" | "none" }}
              onSort={onSort}
              onClearAll={onClearAll}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }, [table, isResizing, setColumnOrder, dragIdRef]);

  // ✅ NEW: More Filters Section
  const MoreFiltersSection = React.useMemo(() => {
    if (!showMoreFilters) return null;

    // حساب عدد الفلاتر النشطة
    const activeFiltersCount = Object.values(filters).filter((filter) => filter.value.trim() !== "").length;

    // دالة مسح جميع الفلاتر
    const clearAllFilters = () => {
      setFilters({});
    };

    return (
      <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowMoreFilters(false)} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Hide Filters
            </Button>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {activeFiltersCount > 0 ? (
                <span>
                  {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active
                </span>
              ) : (
                <span>No filters applied</span>
              )}
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Clear all filters
            </Button>
          )}
        </div>
      </div>
    );
  }, [showMoreFilters, filters]);

  // إعداد أعمدة صف الفلاتر مع الحفاظ على ترتيب الهيدر (بما فيهم الأعمدة الخاصة فارغة)
  const filterColumns: FilterColumn[] = React.useMemo(() => {
    return table.getAllLeafColumns().map((c) => ({
      id: String(c.id),
      label:
        c.id === "is_active"
          ? "Status"
          : c.id === "__select" || c.id === "select"
            ? ""
            : c.id === "actions"
              ? ""
              : String(c.id),
      disableInput: c.id === "actions" || c.id === "__select" || c.id === "select",
    }));
  }, [table]);

  const footer = <DataTablePagination table={table} totalCount={initialTotal} />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
        {/* ✅ NEW: Toolbar مع زر More Filters وزر Export */}
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ColumnsAndSortToolbar}
              {/* زر More Filters */}
              <Button
                variant="outline"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showMoreFilters ? "Hide Filters" : "More Filters"}
              </Button>
            </div>
            {/* زر Export في أقصى اليمين */}
            <Button variant="outline" onClick={() => exportCSV(table as never, "tally_cards")}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* ✅ NEW: قسم More Filters */}
        {MoreFiltersSection}

        <DataTable
          dndEnabled={enableColumnReordering}
          table={table as never}
          dataIds={dataIds}
          handleDragEnd={handleDragEnd}
          sensors={sensors}
          sortableId="resource-table"
          renderExpanded={renderExpanded ? (row) => renderExpanded(row.original as TRow) : undefined}
          columnWidthsPct={columnWidths}
          tableContainerRef={tableRef}
          filtersConfig={{
            columns: filterColumns,
            columnWidthsPct: columnWidths,
            show: showMoreFilters, // ربط إظهار الفلاتر بحالة showMoreFilters
            filters,
            onChange: (id, next) => setFilters((prev) => ({ ...prev, [id]: next })),
          }}
        />
        {footer}
      </SortableContext>
    </DndContext>
  );
}
