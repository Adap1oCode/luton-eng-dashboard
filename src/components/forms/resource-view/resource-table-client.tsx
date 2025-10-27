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
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
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
import { ArrowUpDown, Settings, ChevronDown, SortAsc, SortDesc, Filter, Layout, Save } from "lucide-react";
import { toast } from "sonner";

import { computeAutoColumnPercents } from "@/components/data-table/auto-column-widths";
import { ColumnsMenu } from "@/components/data-table/columns-menu";
import { exportCSV } from "@/components/data-table/csv-export";
import { DataTable } from "@/components/data-table/data-table";
import { type FilterColumn, type ColumnFilterState } from "@/components/data-table/data-table-filters";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { InlineEditCell, type InlineEditConfig } from "@/components/data-table/inline-edit-cell";
import { InlineEditCellWrapper } from "@/components/data-table/inline-edit-cell-wrapper";
import { DecoratedHeader } from "@/components/data-table/resizable-draggable-header";
import { SortMenu } from "@/components/data-table/sort-menu";
import { StatusCellWrapper } from "@/components/data-table/status-cell-wrapper";
import { stringPredicate } from "@/components/data-table/table-utils";
import { useColumnResize } from "@/components/data-table/use-column-resize";
import { useSavedViews } from "@/components/data-table/use-saved-views";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import { useOptimistic } from "@/components/forms/shell/optimistic-context";
import { useSelectionStore } from "@/components/forms/shell/selection/selection-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViewsMenu } from "@/components/data-table/views-menu";

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
  showInlineExportButton?: boolean;
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void;
  onFiltersChange?: (filters: Record<string, ColumnFilterState>) => void;
  onClearSorting?: () => void;
  onClearFilters?: () => void;
};

// move header and cell wrappers into shared data-table modules

export default function ResourceTableClient<TRow extends { id: string }>({
  config,
  initialRows,
  initialTotal,
  page,
  pageSize,
  renderExpanded,
  enableColumnResizing = true,
  enableColumnReordering = true,
  showInlineExportButton = true,
  onSortingChange,
  onFiltersChange,
  onClearSorting,
  onClearFilters,
}: ResourceTableClientProps<TRow>) {
  const { confirm, ConfirmComponent } = useConfirmDialog();
  const { markAsDeleted, clearOptimisticState, isOptimisticallyDeleted } = useOptimistic();
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();

  // 🔑 NEW: Support configurable ID field from view config (e.g., "id" or "entry_id")
  // Moved ABOVE any state initializers that reference it (fixes TS2448/TS2454)
  const idField = (config as unknown as { idField?: string })?.idField ?? "id";

  // Connect row selection with selection store to enable bulk delete from toolbar
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);

  // 🎯 NEW: Filter out optimistically deleted rows
  const filteredRows = React.useMemo(() => {
    return initialRows.filter((row) => !isOptimisticallyDeleted((row as any)[idField]));
  }, [initialRows, isOptimisticallyDeleted, idField]);

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
    // make sure routing id is hidden from the start
    [idField]: false,
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

  // Save View dialog state
  const [saveViewDialogOpen, setSaveViewDialogOpen] = React.useState(false);
  const [viewName, setViewName] = React.useState("");
  const [viewDescription, setViewDescription] = React.useState("");

  // 🔗 Table element ref (needed by the resize hook and passed to DataTable)
  const tableRef = React.useRef<HTMLElement | null>(null);

  // Column widths state for resizing (initialize from active view once hydrated)
  const { widths: columnWidths, setWidths, isResizing, onMouseDownResize } = useColumnResize({}, tableRef);

  // Track currently dragged column id to render an overlay ghost
  const [activeColumnId, setActiveColumnId] = React.useState<string | null>(null);

  // Status editing state
  const [editingStatus, setEditingStatus] = React.useState<{ rowId: string; value: string } | null>(null);

  // DnD setup for column reordering
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => initialRows.map((row) => ((row as any)[idField] as string) ?? (row as any).id),
    [initialRows, idField],
  );

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
    setActiveColumnId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (isResizing) return; // ignore DnD while resizing
    const id = String(event.active.id ?? "");
    // Only set overlay for column drags (ignore row drags)
    if (columnOrder.includes(id)) setActiveColumnId(id);
  };

  // Generic inline editing handlers
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; columnId: string; value: any } | null>(null);

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
      if (res.ok) {
        // Avoid route refresh to preserve column state; soft-refresh via revalidation hint
        // Consumers should invalidate React Query where relevant.
      }
      else alert("Failed to update status");
    } catch {
      alert("Error updating status");
    } finally {
      setEditingStatus(null);
    }
  }, [editingStatus, config, router]);

  const handleStatusCancel = React.useCallback(() => setEditingStatus(null), []);

  // Generic inline editing handlers
  const handleInlineEditStart = React.useCallback((rowId: string, columnId: string, currentValue: any) => {
    setEditingCell({ rowId, columnId, value: currentValue });
  }, []);

  const handleInlineEditChange = React.useCallback((value: any) => {
    setEditingCell((prev) => (prev ? { ...prev, value } : null));
  }, []);

  const handleInlineEditSave = React.useCallback(async () => {
    if (!editingCell) return;
    try {
      const resourceKey = (config as Record<string, unknown>)?.resourceKeyForDelete ?? "tcm_tally_cards";
      const updateData = { [editingCell.columnId]: editingCell.value };

      const res = await fetch(`/api/${resourceKey}/${editingCell.rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        alert(`Failed to update ${editingCell.columnId}`);
      }
    } catch {
      alert(`Error updating ${editingCell.columnId}`);
    } finally {
      setEditingCell(null);
    }
  }, [editingCell, config, router]);

  const handleInlineEditCancel = React.useCallback(() => setEditingCell(null), []);

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
      meta: { widthPct: 3, minPct: 2, maxPct: 5, minPx: 44 },
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

      // Check if this column has inline editing configuration
      const inlineEditConfig = (c.meta as any)?.inlineEdit as InlineEditConfig | undefined;

      if (inlineEditConfig) {
        // Use generic inline editing
        c.cell = (cellProps) => (
          <InlineEditCellWrapper
            row={cellProps.row}
            columnId={c.id || (c as any).accessorKey}
            editingCell={editingCell}
            config={inlineEditConfig}
            onEditStart={handleInlineEditStart}
            onEditChange={handleInlineEditChange}
            onSave={handleInlineEditSave}
            onCancel={handleInlineEditCancel}
          />
        );
      } else if (c.id === "status") {
        // Legacy status editing for backward compatibility
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
    editingCell,
    selectionColumn,
    handleStatusEditChange,
    handleStatusSave,
    handleStatusCancel,
    handleStatusEditStart,
    handleInlineEditStart,
    handleInlineEditChange,
    handleInlineEditSave,
    handleInlineEditCancel,
    baseColumns,
  ]);

  const table = useReactTable<TRow>({
    data: filteredRows,
    columns: enhancedColumns,
    meta: { viewConfig: config }, // ✅ expose view config (formsRouteSegment, idField) to cells

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
    onSortingChange: (updater) => {
      setSorting(updater);
      // Notify parent component about sorting changes
      if (onSortingChange) {
        const newSorting = typeof updater === "function" ? updater(sorting) : updater;
        onSortingChange(newSorting);
      }
    },
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableColumnResizing: enableColumnResizing,
    // ✅ use the same idField consistently for stable keys
    getRowId: (row: TRow, idx: number, parent?: Row<TRow>) => {
      const domId = (row as any)[idField] as string | undefined;
      return domId ?? (row as { id?: string }).id ?? `${parent?.id ?? "row"}_${idx}`;
    },
  });

  // ✅ Seed initial column order once the table is ready
  React.useEffect(() => {
    // Collect leaf column ids as strings, put __select first, then other columns, actions last
    const allIds = table.getAllLeafColumns().map((c) => String(c.id));
    const selectId = allIds.find((id) => id === "__select");
    const actionsId = allIds.find((id) => id === "actions");
    const otherIds = allIds.filter((id) => id !== "actions" && id !== "__select" && id !== "select");

    // Build order: __select first, then other columns, actions excluded from order (stays at end)
    const ids = selectId ? [selectId, ...otherIds] : otherIds;

    if (ids.length && initialOrderRef.current.length === 0) {
      initialOrderRef.current = ids;
      setColumnOrder(ids);
    }
  }, [table]);

  // ✅ SANITIZE: drop any filter keys that don't match actual columns (e.g., stale "id")
  React.useEffect(() => {
    const validIds = new Set(table.getAllLeafColumns().map((c) => String(c.id)));
    setFilters((prev) => {
      let changed = false;
      const next: Record<string, ColumnFilterState> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (validIds.has(k)) next[k] = v;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [table, idField]);

  // Sync selected IDs with the store
  React.useEffect(() => {
    const ids = table.getSelectedRowModel().rows.map((r) => {
      const anyRow = r.original as any;
      return anyRow?.[idField] ?? anyRow?.id;
    });
    setSelectedIds(ids);
  }, [rowSelection, table, setSelectedIds, idField]);

  // Listen for action from actions column via event delegation (includes nested Radix elements)
  React.useEffect(() => {
    const resourceKey = (config as Record<string, unknown>)?.resourceKeyForDelete ?? "tcm_tally_cards";
    const routeSegment =
      (config as Record<string, unknown>)?.formsRouteSegment ?? String(resourceKey).replace(/_/g, "-");

    async function handleDelete(rowId: string) {
      confirm({
        title: "Delete Item",
        description: "Are you sure you want to delete this item? This action cannot be undone.",
        confirmText: "Delete",
        variant: "destructive",
        onConfirm: async () => {
          try {
            // Optimistically mark as deleted
            markAsDeleted([rowId]);

            const res = await fetch(`/api/${resourceKey}/${rowId}`, { method: "DELETE" });
            if (res.ok) {
              toast("Item deleted successfully!");
              // Clear optimistic state and refresh
              clearOptimisticState();
              router.refresh();
            } else {
              // Revert optimistic state on error
              clearOptimisticState();
              const errorData = await res.json();
              toast.error(`Failed to delete item: ${errorData.error?.message || "Unknown error"}`);
            }
          } catch (error) {
            // Revert optimistic state on error
            clearOptimisticState();
            toast.error("Failed to delete item. Please try again.");
          }
        },
      });
    }

    async function handleEdit(rowId: string) {
      // Navigate to /forms/<segment>/<id>/edit to match the filesystem route
      router.push(`/forms/${routeSegment}/${rowId}/edit`);
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
  }, [config, router, confirm, markAsDeleted, clearOptimisticState]);

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

  // -- Saved Views: hydrate & persist state ---------------------------------
  const tableId = React.useMemo(() => {
    const routeSegment = (config as any)?.formsRouteSegment ?? "table";
    return `forms/${routeSegment}`;
  }, [config]);

  const defaultColumnIds = React.useMemo(() => {
    const all = baseColumns.map((c) => String((c as any).id ?? (c as any).accessorKey ?? ""));
    // keep __select first if present
    const selectId = all.find((id) => id === "__select");
    const others = all.filter((id) => id && id !== "__select");
    return selectId ? [selectId, ...others] : others;
  }, [baseColumns]);

  // Temporarily disable saved views to prevent flickering
  const views: any[] = [];
  const currentView = null;
  const setCurrentViewId = () => {};
  const applyView = () => {};
  const saveView = () => {};
  const updateView = () => {};
  const setDefault = () => {};
  const hydrateFromRemote = () => {};

  // Hydrate from remote on mount (fire-and-forget, keep local fallback if unauth)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/saved-views?tableId=${encodeURIComponent(tableId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled && Array.isArray(body.views)) {
          hydrateFromRemote(
            body.views.map((v: any) => ({
              id: v.id,
              name: v.name,
              description: v.description ?? "",
              isDefault: !!v.isDefault,
              columnOrder: v.state?.columnOrder ?? defaultColumnIds,
              visibleColumns: v.state?.visibleColumns ?? Object.fromEntries(defaultColumnIds.map((id: string) => [id, true])),
              sortConfig: v.state?.sortConfig ?? { column: null, direction: "none" as const, type: "alphabetical" as const },
              createdAt: v.createdAt ?? new Date().toISOString(),
            }))
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId, hydrateFromRemote, defaultColumnIds]);

  // Apply current view to column order/visibility/widths once when table is ready
  React.useEffect(() => {
    if (!currentView) return;
    const ids = currentView.columnOrder?.length ? currentView.columnOrder : defaultColumnIds;
    initialOrderRef.current = ids;
    setColumnOrder(ids);

    // visibility
    const vmap = currentView.visibleColumns ?? Object.fromEntries(ids.map((id) => [id, true]));
    setColumnVisibility(vmap as any);

    // widths
    const w = (currentView as any).columnWidthsPct as Record<string, number> | undefined;
    if (w && Object.keys(w).length) setWidths(w);
  }, [currentView, defaultColumnIds, setWidths]);

  // Persist state changes into current view snapshot
  React.useEffect(() => {
    if (!currentView) return;
    const snapshot: any = {
      ...currentView,
      columnOrder,
      visibleColumns: columnVisibility,
      columnWidthsPct: columnWidths,
      sortConfig: (table.getState().sorting?.[0]
        ? {
            column: table.getState().sorting[0].id,
            direction: table.getState().sorting[0].desc ? "desc" : "asc",
            type: "alphabetical",
          }
        : { column: null, direction: "none", type: "alphabetical" }),
    };
    updateView(currentView.id, snapshot);
  }, [columnOrder, columnVisibility, columnWidths, table, updateView, currentView]);

  // ✅ Auto-assign smart percentage widths from data (on-demand only)
  const autoColumnWidthsPct = React.useMemo(() => {
    const defaultOverrides = { __select: 3, actions: 8 };
    const cfg = (config ?? {}) as any; // ← guard `config`
    const overrides = { ...defaultOverrides, ...(cfg.columnWidthsPct ?? {}) };

    return computeAutoColumnPercents(baseColumns as any[], filteredRows as any[], {
      sampleRows: 50,
      // do NOT ignore __select so it participates in layout
      ignoreIds: ["id", "__expander", "__actions"],
      overrides,
      floorPct: 8,
      capPct: 28,
    });
  }, [baseColumns, filteredRows, config]);

  // Provide an explicit Auto-fit action (optional: wire to Columns menu)
  const autoFitColumns = React.useCallback(() => {
    const next = autoColumnWidthsPct;
    if (next && Object.keys(next).length) setWidths(next);
  }, [autoColumnWidthsPct, setWidths]);

  // Remote view persistence actions
  const handleSaveViewRemote = React.useCallback(
    async (name: string, description: string, isDefault: boolean) => {
      try {
        const state = {
          columnOrder,
          columnVisibility,
          columnWidthsPct: columnWidths,
          sortConfig:
            table.getState().sorting?.[0]
              ? {
                  column: table.getState().sorting[0].id,
                  direction: table.getState().sorting[0].desc ? "desc" : "asc",
                  type: "alphabetical",
                }
              : { column: null, direction: "none", type: "alphabetical" },
          filters,
        };

        const res = await fetch("/api/saved-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId, name, description, isDefault, state }),
        });
        if (!res.ok) throw new Error("Failed to save view");
        const body = await res.json();
        const newView = {
          id: body.id,
          name,
          description: description ?? "",
          isDefault: !!isDefault,
          columnOrder,
          visibleColumns: columnVisibility as Record<string, boolean>,
          sortConfig: state.sortConfig,
          createdAt: new Date().toISOString(),
        };
        saveView(newView as any);
        toast("View saved successfully!");
      } catch (err: any) {
        toast.error(`Failed to save view: ${err?.message ?? ""}`);
      }
    },
    [tableId, columnOrder, columnVisibility, columnWidths, table, filters, saveView]
  );

  const handleUpdateViewRemote = React.useCallback(
    async (viewId: string) => {
      try {
        const state = {
          columnOrder,
          columnVisibility,
          columnWidthsPct: columnWidths,
          sortConfig:
            table.getState().sorting?.[0]
              ? {
                  column: table.getState().sorting[0].id,
                  direction: table.getState().sorting[0].desc ? "desc" : "asc",
                  type: "alphabetical",
                }
              : { column: null, direction: "none", type: "alphabetical" },
          filters,
        };

        const res = await fetch(`/api/saved-views/${viewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        });
        if (!res.ok) throw new Error("Failed to update view");
        toast("View updated successfully!");
      } catch (err: any) {
        toast.error(`Failed to update view: ${err?.message ?? ""}`);
      }
    },
    [columnOrder, columnVisibility, columnWidths, table, filters]
  );

  const handleDeleteViewRemote = React.useCallback(
    async (viewId: string) => {
      try {
        const res = await fetch(`/api/saved-views/${viewId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete view");
        toast("View deleted successfully!");
      } catch (err: any) {
        toast.error(`Failed to delete view: ${err?.message ?? ""}`);
      }
    },
    []
  );

  const handleSetDefaultRemote = React.useCallback(
    async (viewId: string) => {
      try {
        const res = await fetch(`/api/saved-views/${viewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefault: true }),
        });
        if (!res.ok) throw new Error("Failed to set default view");
        setDefault(viewId);
        toast("Default view updated!");
      } catch (err: any) {
        toast.error(`Failed to set default: ${err?.message ?? ""}`);
      }
    },
    [setDefault]
  );

  // ✅ Toolbar مربوط بحالة TanStack Table باستخدام ColumnsMenu و SortMenu + Export
  const ColumnsAndSortToolbar = React.useMemo(() => {
    const leafColumns = table.getAllLeafColumns().filter(
      (c) => c.getCanHide() && c.id !== "actions" && c.id !== "__select" && c.id !== "select" && c.id !== idField, // ✅ exclude idField
    );
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
    const clearSorting = () => {
      table.setSorting([]);
      if (onClearSorting) {
        onClearSorting();
      }
    };

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
    const onClearAll = () => {
      clearSorting();
      if (onClearSorting) {
        onClearSorting();
      }
    };

    return (
      <div className="flex items-center gap-2">
        {/* Views dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Views
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">Saved Views</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ViewsMenu
              views={views.map((v) => ({ 
                ...v, 
                description: v.description ?? "", 
                isDefault: !!v.isDefault,
                createdAt: new Date(v.createdAt) 
              }))}
              currentViewId={currentView?.id ?? "default"}
              onApplyView={(v) => {
                applyView(v.id);
                setColumnOrder(v.columnOrder);
                setColumnVisibility(v.visibleColumns as any);
                const w = (v as any).columnWidthsPct;
                if (w) setWidths(w);
              }}
              onDeleteView={(id) => {
                handleDeleteViewRemote(id);
                // optimistically remove from local state
                const updatedViews = views.filter((v) => v.id !== id);
                if (updatedViews.length) {
                  const nextDefault = updatedViews.find((v) => v.isDefault) ?? updatedViews[0];
                  applyView(nextDefault.id);
                }
              }}
              formatDate={(d) => d.toLocaleDateString()}
            />
          </DropdownMenuContent>
        </DropdownMenu>

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
            {/* Optional: Auto-fit action */}
            <div className="border-t border-gray-200 p-2 dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={autoFitColumns}>Auto-fit columns</Button>
            </div>
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
  }, [table, isResizing, setColumnOrder, dragIdRef, idField, views, currentView, applyView, handleDeleteViewRemote, setWidths, onClearSorting]);

  // ✅ NEW: More Filters Section and client->parent filter mapping
  const MoreFiltersSection = React.useMemo(() => {
    if (!showMoreFilters) return null;

    // حساب عدد الفلاتر النشطة
    const activeFiltersCount = Object.values(filters).filter((filter) => filter.value.trim() !== "").length;

    // دالة مسح جميع الفلاتر
    const clearAllFilters = () => {
      setFilters({});
      if (onClearFilters) {
        onClearFilters();
      }
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
    // ✅ exclude idField from filter row to avoid "Column with id 'id' does not exist."
    return table
      .getAllLeafColumns()
      .filter((c) => c.id !== idField && c.id !== "id")
      .map((c) => ({
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
  }, [table, idField]);

  // استمع لأي ضغطة على زر التولبار العلوي الذي يحمل data-onclick-id="exportCsv"
  React.useEffect(() => {
    const onToolbarClick = (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      if (!target) return;
      const btn = target.closest("[data-onclick-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-onclick-id") || "";
      if (id !== "exportCsv") return;

      ev.preventDefault();
      ev.stopPropagation();

      // نفّذ نفس منطق التصدير المستعمل في زر الجدول السفلي
      exportCSV(table as never, "tally_cards");
    };
    document.addEventListener("click", onToolbarClick, true);
    return () => document.removeEventListener("click", onToolbarClick, true);
  }, [table]);

  const footer = <DataTablePagination table={table} totalCount={initialTotal} />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
        {/* ✅ Toolbar مع More Filters */}
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
            <div className="flex items-center gap-2">
              {/* زر Save View */}
              <Button
                variant="outline"
                onClick={() => setSaveViewDialogOpen(true)}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                <Save className="h-4 w-4" />
                Save View
              </Button>
              {/* زر Export في أقصى اليمين */}
              {showInlineExportButton && (
                <Button variant="outline" onClick={() => exportCSV(table as never, "tally_cards")}>
                  Export CSV
                </Button>
              )}
            </div>
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
          // ✅ Use resized column widths if available, otherwise fall back to auto-calculated
          columnWidthsPct={Object.keys(columnWidths).length > 0 ? columnWidths : autoColumnWidthsPct}
          tableContainerRef={tableRef}
          filtersConfig={{
            columns: filterColumns,
            // Use resized column widths if available, otherwise fall back to auto-calculated
            columnWidthsPct: Object.keys(columnWidths).length > 0 ? columnWidths : autoColumnWidthsPct,

            show: showMoreFilters,
            filters,
            onChange: (id, next) => {
              setFilters((prev) => {
                const newFilters = { ...prev, [id]: next };

                if (onFiltersChange) onFiltersChange(newFilters);

                return newFilters; // keep functional setState contract
              });
            },
          }}
        />
        {footer}
      </SortableContext>

      {/* Floating header ghost while dragging a column */}
      <DragOverlay>
        {activeColumnId ? (
          <div className="pointer-events-none rounded-md border bg-white px-3 py-2 text-sm shadow-lg select-none dark:border-gray-700 dark:bg-gray-800">
            {activeColumnId}
          </div>
        ) : null}
      </DragOverlay>
      {ConfirmComponent}

      {/* Save View Dialog */}
      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Save your current column layout, sorting, and visibility settings as a named view for quick access later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="view-name">View Name *</Label>
              <Input
                id="view-name"
                placeholder="e.g., My Custom View, Status Overview, etc."
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="view-description">Description</Label>
              <Input
                id="view-description"
                placeholder="Brief description of this view..."
                value={viewDescription}
                onChange={(e) => setViewDescription(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <div className="font-medium">Current Settings:</div>
              <div className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div>• {Object.values(columnVisibility).filter(Boolean).length} columns visible</div>
                <div>
                  • {table.getState().sorting?.[0] 
                      ? `Sorted by: ${table.getState().sorting[0].id} (${table.getState().sorting[0].desc ? "desc" : "asc"})`
                      : "No sorting applied"}
                </div>
                <div>• Column order: {columnOrder.length} columns</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveViewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (viewName.trim()) {
                  handleSaveViewRemote(viewName, viewDescription, false);
                  setSaveViewDialogOpen(false);
                  setViewName("");
                  setViewDescription("");
                }
              }}
              disabled={!viewName.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
