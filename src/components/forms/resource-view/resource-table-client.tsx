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
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import { useContainerResize } from "@/components/data-table/use-container-resize";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import { useOptimistic } from "@/components/forms/shell/optimistic-context";
import { fetchResourcePageClient } from "@/lib/api/client-fetch";
import { parseListParams, type SPRecord } from "@/lib/next/search-params";
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
  const queryClient = useQueryClient();

  // 🔑 NEW: Support configurable ID field from view config (e.g., "id" or "entry_id")
  // Moved ABOVE any state initializers that reference it (fixes TS2448/TS2454)
  const idField = (config as unknown as { idField?: string })?.idField ?? "id";

  // Connect row selection with selection store to enable bulk delete from toolbar
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);

  // ✅ FIX: Extract stable config properties to prevent unnecessary memo recalculations
  // This ensures memos only update when the actual property values change, not when config object reference changes
  const configApiEndpoint = React.useMemo(() => {
    const configWithEndpoint = config as unknown as { apiEndpoint?: string };
    return configWithEndpoint.apiEndpoint;
  }, [(config as unknown as { apiEndpoint?: string })?.apiEndpoint]);

  const configResourceKeyForDelete = React.useMemo(() => {
    return (config as Record<string, unknown>)?.resourceKeyForDelete as string | undefined;
  }, [(config as Record<string, unknown>)?.resourceKeyForDelete]);

  const configQuickFilters = React.useMemo(() => {
    return config.quickFilters ?? [];
  }, [config.quickFilters]);

  const configColumns = React.useMemo(() => {
    return (config as Record<string, unknown>)?.columns;
  }, [(config as Record<string, unknown>)?.columns]);

  const configBuildColumns = React.useMemo(() => {
    return (config as Record<string, unknown>)?.buildColumns;
  }, [(config as Record<string, unknown>)?.buildColumns]);

  const configFormsRouteSegment = React.useMemo(() => {
    return (config as any)?.formsRouteSegment ?? "table";
  }, [(config as any)?.formsRouteSegment]);

  // ⚙️ STEP 1: React Query infrastructure helpers (non-breaking, not used yet)
  // Extract API endpoint from config - check for apiEndpoint prop first, fallback to resourceKeyForDelete
  const getApiEndpoint = React.useCallback((): string => {
    if (configApiEndpoint) {
      return configApiEndpoint;
    }
    // Fallback: construct from resourceKeyForDelete (e.g., "tcm_tally_cards" -> "/api/tcm_tally_cards")
    const resourceKey = configResourceKeyForDelete ?? "tcm_tally_cards";
    return `/api/${resourceKey}`;
  }, [configApiEndpoint, configResourceKeyForDelete]);

  // Build query key for React Query cache
  // Pattern: [endpoint, page, pageSize, serializedFilters]
  // Use apiEndpoint (view) instead of resourceKeyForDelete (table) to ensure we invalidate the correct queries
  // This is critical for SCD2 tables where the view filters duplicates but the table has them
  const buildQueryKey = React.useCallback((currentPage: number, currentPageSize: number, currentFilters?: Record<string, string>): (string | number)[] => {
    // Use apiEndpoint for queryKey to match what we actually fetch from (the view, not the table)
    const endpoint = getApiEndpoint();
    // Extract the resource name from the endpoint (e.g., "/api/v_tcm_user_tally_card_entries" -> "v_tcm_user_tally_card_entries")
    const endpointKey = endpoint.replace(/^\/api\//, "");
    const serializedFilters = currentFilters
      ? Object.keys(currentFilters)
          .sort()
          .map((k) => `${encodeURIComponent(k)}:${encodeURIComponent(currentFilters[k])}`)
          .join("|")
      : "no-filters";
    return [endpointKey, currentPage, currentPageSize, serializedFilters];
  }, [getApiEndpoint]);

  // ⚙️ STEP 2: Parse filters from URL and set up React Query (parallel to existing flow)
  // Parse pagination and filters from URL search params
  const searchParamsRecord = React.useMemo(() => {
    const record: SPRecord = {};
    search.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }, [search]);

  // Extract quickFilterMeta from config.quickFilters for parseListParams
  const quickFilterMeta = React.useMemo(() => {
    const quickFilters = configQuickFilters as Array<{ id: string; toQueryParam?: (value: string) => Record<string, any> }>;
    return quickFilters.map((f) => ({ id: f.id, toQueryParam: f.toQueryParam }));
  }, [configQuickFilters]);

  // Parse current filters from URL
  const { filters: currentFilters } = parseListParams(searchParamsRecord, quickFilterMeta, {
    defaultPage: page,
    defaultPageSize: pageSize,
    max: 500,
  });

  // Serialize filters for stable queryKey
  const serializedFilters = React.useMemo(() => {
    const keys = Object.keys(currentFilters).sort();
    return keys.length > 0
      ? keys.map((key) => `${encodeURIComponent(key)}:${encodeURIComponent(currentFilters[key])}`).join("|")
      : "no-filters";
  }, [currentFilters]);

  // Build extraQuery from filters (similar to ResourceListClient pattern)
  const buildExtraQueryFromFilters = React.useCallback(() => {
    const extraQuery: Record<string, any> = { raw: "true" };
    const quickFilters = (config.quickFilters ?? []) as Array<{ id: string; toQueryParam?: (value: string) => Record<string, any> }>;
    
    quickFilters.forEach((filter) => {
      const value = currentFilters[filter.id];
      if (value && filter.toQueryParam) {
        Object.assign(extraQuery, filter.toQueryParam(value));
      }
    });
    
    return extraQuery;
  }, [currentFilters, config.quickFilters]);

  // React Query hook (runs in parallel, but table still uses initialRows for now)
  const apiEndpoint = React.useMemo(() => getApiEndpoint(), [getApiEndpoint]);
  const queryKey = React.useMemo(() => buildQueryKey(page, pageSize, currentFilters), [buildQueryKey, page, pageSize, currentFilters]);
  
  const { data: queryData, isLoading: isQueryLoading, isFetching: isQueryFetching, error: queryError } = useQuery({
    queryKey,
    queryFn: async () => {
      const extraQuery = buildExtraQueryFromFilters();
      return await fetchResourcePageClient<TRow>({
        endpoint: apiEndpoint,
        page,
        pageSize,
        extraQuery,
      });
    },
    initialData: { rows: initialRows, total: initialTotal },
    initialDataUpdatedAt: Date.now(), // Mark SSR data as fresh
    staleTime: 5 * 60 * 1000, // 5 minutes (matches ResourceListClient)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof Error && error.message.includes("4")) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // ⚙️ STEP 3: Switch table data source to React Query (with fallback to initialRows)
  // Get current rows from React Query, fallback to initialRows during loading or when query fails
  const currentRows = React.useMemo(() => {
    // If query failed or returned undefined, use initialRows (SSR data)
    if (queryError || !queryData) {
      return initialRows;
    }
    // If queryData exists and has rows array, use it
    if (Array.isArray(queryData.rows)) {
      return queryData.rows;
    }
    // Fallback to initialRows if queryData structure is unexpected
    return initialRows;
  }, [queryData?.rows, queryData, queryError, initialRows]);

  // Get current total from React Query, fallback to initialTotal during loading
  const currentTotal = React.useMemo(() => {
    // If query failed or returned undefined, use initialTotal (SSR data)
    if (queryError || !queryData) {
      return initialTotal;
    }
    // If queryData exists and has total, use it
    if (typeof queryData.total === 'number') {
      return queryData.total;
    }
    // Fallback to initialTotal if queryData structure is unexpected
    return initialTotal;
  }, [queryData?.total, queryData, queryError, initialTotal]);

  // 🎯 Filter out optimistically deleted rows from current data
  const filteredRows = React.useMemo(() => {
    return currentRows.filter((row) => !isOptimisticallyDeleted((row as any)[idField]));
  }, [currentRows, isOptimisticallyDeleted, idField]);

  // 🔑 Columns: prefer SSR-materialised `config.columns`, fallback to legacy `buildColumns(true)` (if ever provided)
  const baseColumns = React.useMemo<ColumnDef<TRow, unknown>[]>(() => {
    const injected = configColumns;
    if (Array.isArray(injected)) return injected as ColumnDef<TRow, unknown>[];
    if (typeof configBuildColumns === "function") {
      return (configBuildColumns as (arg: boolean) => ColumnDef<TRow, unknown>[])(true);
    }
    return [];
  }, [configColumns, configBuildColumns]);

  // -- Saved Views: tableId and defaultColumnIds MUST be declared early to avoid TDZ -----------
  // These are used by useSavedViews hook and effects, so they must come before any effects that reference them
  const tableId = React.useMemo(() => {
    return `forms/${configFormsRouteSegment}`;
  }, [configFormsRouteSegment]);

  const defaultColumnIds = React.useMemo(() => {
    const all = baseColumns.map((c) => String((c as any).id ?? (c as any).accessorKey ?? ""));
    // keep __select first if present
    const selectId = all.find((id) => id === "__select");
    const others = all.filter((id) => id && id !== "__select");
    return selectId ? [selectId, ...others] : others;
  }, [baseColumns]);

  // Saved Views: hydrate & persist state - declared early to avoid TDZ
  const {
    views,
    currentView,
    currentViewId,
    setCurrentViewId,
    applyView,
    saveView,
    updateView,
    setDefault,
    hydrateFromRemote,
  } = useSavedViews(tableId, defaultColumnIds);

  // Local TanStack table state
  const [sorting, setSorting] = React.useState<Array<{ id: string; desc: boolean }>>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  // Expanded row state - controlled to persist across data updates
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
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
  
  // Store table reference in ref to avoid recreating event listeners when table object changes
  // Initialize with null since table is created later via useReactTable
  const tableRefForExport = React.useRef<any>(null);

  // Utility: Create stable signature from column definitions to detect schema changes
  // Minimal signature: only { id, size, minSize, maxSize } to avoid unnecessary recalculations
  const columnsSignature = React.useCallback((cols: ColumnDef<TRow, unknown>[]): string => {
    return JSON.stringify(
      cols.map((c) => ({
        id: c.id ?? (c as any).accessorKey,
        size: (c as any).size,
        minSize: (c as any).minSize ?? (c.meta as any)?.minPx,
        maxSize: (c as any).maxSize ?? (c.meta as any)?.maxPx,
      }))
    );
  }, []);

  // Memoize column signature to detect real schema changes
  const colsSig = React.useMemo(() => columnsSignature(baseColumns), [baseColumns, columnsSignature]);

  // ✅ Initialize column widths (priority: saved px → config px → auto-calc)
  // Store as pixels, not percentages
  const initialColumnWidths = React.useMemo<Record<string, number>>(() => {
    const widths: Record<string, number> = {};

    // First priority: Use config `size` values directly as pixels
    for (const col of baseColumns) {
      if (col.id && (col as any).size && typeof (col as any).size === "number") {
        const size = (col as any).size as number;
        if (size > 0) {
          widths[col.id] = size;
        }
      }
    }

    // Ensure __select column always has width (from selectionColumn definition)
    // This ensures the checkbox column gets proper initial width even if not in baseColumns
    const hasSelectColumn = baseColumns.some((col) => {
      const id = (col as { id?: string; accessorKey?: string }).id ?? (col as { accessorKey?: string }).accessorKey;
      return id === "__select" || id === "select";
    });
    if (!hasSelectColumn) {
      widths.__select = 40; // Match selectionColumn size definition
    }

    return widths;
  }, [colsSig]); // Only recalculate when column schema changes

  // ✅ FIX: Lazy-load container resize observer
  // Only enable when needed (responsive scaling or when user resizes)
  // Start disabled to avoid ResizeObserver setup on initial render
  const [enableContainerResize, setEnableContainerResize] = React.useState(false);
  
  // Enable resize observer when:
  // 1. Current view has baseline (needs responsive scaling)
  // 2. User starts resizing (onMouseDownResize will enable it)
  React.useEffect(() => {
    if (currentView?.baselineWidthPx != null) {
      setEnableContainerResize(true);
    }
  }, [currentView?.baselineWidthPx]);
  
  // Track container width for responsive scaling (only when enabled)
  const containerWidthPx = useContainerResize(tableRef, enableContainerResize);

  // Column widths state for resizing (initialize from config sizes, then user can override)
  const { widths: columnWidths, setWidths, isResizing, onMouseDownResize: onMouseDownResizeOriginal } = useColumnResize(
    initialColumnWidths,
    tableRef,
    {
      getColumnMeta: (columnId: string) => {
        const col = baseColumns.find((c) => c.id === columnId);
        if (!col) return null;
        return {
          minPx: (col.meta as any)?.minPx ?? (col as any).minSize,
          maxPx: (col.meta as any)?.maxPx ?? (col as any).maxSize,
        };
      },
    }
  );

  // ✅ FIX: Wrap resize handler to enable container resize observer on first use
  const onMouseDownResize = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      // Enable container resize observer on first resize interaction
      if (!enableContainerResize) {
        setEnableContainerResize(true);
      }
      onMouseDownResizeOriginal(e, columnId);
    },
    [enableContainerResize, onMouseDownResizeOriginal]
  );

  // Track currently dragged column id to render an overlay ghost
  const [activeColumnId, setActiveColumnId] = React.useState<string | null>(null);

  // Status editing state
  const [editingStatus, setEditingStatus] = React.useState<{ rowId: string; value: string } | null>(null);

  // DnD setup for column reordering
  // Configure PointerSensor to ignore resize handles and require movement before activation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before activating drag (prevents accidental drags)
      },
      // Ignore pointer events that originate from resize handles
    }),
    useSensor(KeyboardSensor)
  );

  // Extract stable row IDs to avoid depending on entire initialRows array reference
  // Use idField from config to extract IDs, creating stable array only when IDs actually change
  const dataIds = React.useMemo<UniqueIdentifier[]>(() => {
    return initialRows.map((row, idx) => {
      const id = (row as any)[idField];
      return id ? String(id) : ((row as any).id ? String((row as any).id) : `row_${idx}`);
    });
  }, [initialRows, idField]);

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
    if (isResizing) {
      return; // ignore DnD while resizing
    }
    
    // Check if the drag started from a resize handle
    const target = event.active.data.current?.originalEvent?.target as HTMLElement | null;
    if (target?.closest('[data-resize-handle="true"]')) {
      return; // Ignore drags that originate from resize handles
    }
    
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
        // ⚙️ STEP 4: Invalidate React Query to trigger subtle refetch (no full page refresh)
        // Use the same endpoint key that buildQueryKey uses (view endpoint, not table resourceKey)
        const endpoint = getApiEndpoint();
        const endpointKey = endpoint.replace(/^\/api\//, "");
        queryClient.invalidateQueries({ queryKey: [endpointKey] });
      } else {
        alert("Failed to update status");
      }
    } catch {
      alert("Error updating status");
    } finally {
      setEditingStatus(null);
    }
  }, [editingStatus, config, queryClient, getApiEndpoint]);

  const handleStatusCancel = React.useCallback(() => setEditingStatus(null), []);

  // Generic inline editing handlers
  // For side-by-side pattern: input starts empty (old value displayed separately)
  const handleInlineEditStart = React.useCallback((rowId: string, columnId: string, _currentValue: any) => {
    // Note: currentValue is unused - we always start with empty string for side-by-side pattern
    setEditingCell({ rowId, columnId, value: "" });
  }, []);

  const handleInlineEditChange = React.useCallback((value: any) => {
    setEditingCell((prev) => (prev ? { ...prev, value } : null));
  }, []);

  const handleInlineEditSave = React.useCallback(async () => {
    if (!editingCell) return;
    try {
      const resourceKey = (config as Record<string, unknown>)?.resourceKeyForDelete ?? "tcm_tally_cards";
      const routeSegment = (config as Record<string, unknown>)?.formsRouteSegment ?? "stock-adjustments";
      
      // Map column IDs to SCD2 API payload field names
      // Only qty, location, and note are supported by the SCD2 RPC
      const supportedColumns = ["qty", "location", "note"];
      
      if (!supportedColumns.includes(editingCell.columnId)) {
        alert(`Column ${editingCell.columnId} is not supported for inline editing`);
        return;
      }

      // Get current row data to preserve values for fields we're NOT changing
      // This is critical: SCD2 RPC will SET null values, so we must include current values
      const currentRow = filteredRows.find((row: any) => (row as any)[idField] === editingCell.rowId);
      if (!currentRow) {
        alert("Row not found");
        return;
      }

      // Build payload for SCD2 endpoint: include current values for fields we're NOT changing
      // The API expects qty/location/note (route handler maps to p_qty/p_location/p_note for RPC)
      const payload: Record<string, any> = {
        qty: editingCell.columnId === "qty" ? editingCell.value : (currentRow as any).qty ?? null,
        location: editingCell.columnId === "location" ? editingCell.value : (currentRow as any).location ?? null,
        note: editingCell.columnId === "note" ? editingCell.value : (currentRow as any).note ?? null,
      };

      // Build optimistic update payload - only the field being edited
      const optimisticPayload: Partial<TRow> = {
        [editingCell.columnId]: editingCell.value,
      } as Partial<TRow>;

      // Get specific query key for optimistic update and invalidation
      const specificQueryKey = buildQueryKey(page, pageSize, currentFilters);
      
      // Optimistically update the cache before API call
      queryClient.setQueryData(specificQueryKey, (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r: any) => {
            const rowId = (r as any)[idField];
            return rowId === editingCell.rowId
              ? { ...r, ...optimisticPayload }
              : r;
          }),
        };
      });

      // Use SCD2 endpoint (same as edit page): /api/stock-adjustments/[id]/actions/patch-scd2
      const res = await fetch(`/api/${routeSegment}/${editingCell.rowId}/actions/patch-scd2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Optimistic update already applied, optionally do silent refetch to confirm
        queryClient.invalidateQueries({ queryKey: specificQueryKey });
      } else {
        // Rollback optimistic update on API failure
        queryClient.invalidateQueries({ queryKey: specificQueryKey });
        
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to update ${editingCell.columnId}: ${errorData.error?.message || res.statusText}`);
      }
    } catch (error) {
      console.error("Inline edit error:", error);
      
      // Rollback optimistic update on error
      const specificQueryKey = buildQueryKey(page, pageSize, currentFilters);
      queryClient.invalidateQueries({ queryKey: specificQueryKey });
      
      alert(`Error updating ${editingCell.columnId}`);
    } finally {
      setEditingCell(null);
    }
  }, [editingCell, config, queryClient, filteredRows, idField, getApiEndpoint, buildQueryKey, page, pageSize, currentFilters]);

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
      size: 40,
      meta: { minPx: 40, maxPx: 48 },
      enableHiding: false,
      enableResizing: false,
      enableSorting: false,
    }),
    [],
  );

  // ✅ FIX: Split header decoration from base columns to reduce recalculation
  // Memoized header decoration function (only depends on columnOrder changes)
  const createHeaderDecoration = React.useCallback(
    (label: string, columnId: string) => {
      return (props: any) => (
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
    },
    [columnOrder],
  );

  // 🎛️ Memoized columns that include decorated headers
  // Now only recalculates when baseColumns change (header decoration is stable function)
  const columnsWithHeaders = React.useMemo(() => {
    return baseColumns.map((col) => {
      const c: ColumnDef<TRow, unknown> = { ...col };

      const header = (col as { header?: string | React.ReactElement | null }).header;
      if (typeof header === "string" || React.isValidElement(header) || header == null) {
        // Extract string label: if header is string use it, otherwise fall back to column id
        const label = typeof header === "string" ? header : (col as { id?: string }).id ?? "";
        // Use memoized header decoration function
        c.header = createHeaderDecoration(label, col.id ?? "");
      }

      return c;
    });
  }, [baseColumns, createHeaderDecoration]);

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
      expanded,
    },
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(currentTotal / Math.max(1, pagination.pageSize))),
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
    onExpandedChange: (updater) => {
      setExpanded((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        // TanStack Table ExpandedState can be boolean or Record<string, boolean>
        // We normalize to Record<string, boolean>
        if (typeof next === 'boolean') {
          return next ? {} : {};
        }
        return next || {};
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onEnd", // Only update on resize end, not during drag
    enableRowSelection: true,
    enableColumnResizing: enableColumnResizing,
    // ✅ use the same idField consistently for stable keys
    getRowId: (row: TRow) => String((row as any)[idField]),
  });

  // Update table ref immediately after table is created
  React.useEffect(() => {
    tableRefForExport.current = table;
  }, [table]);

  // Extract visible column IDs separately to avoid depending on entire table in renderColumnWidthsPx
  // Must be defined after table is created but before renderColumnWidthsPx
  const visibleColumnIds = React.useMemo(() => {
    return new Set(
      table.getAllLeafColumns().filter((c) => c.getIsVisible()).map((c) => String(c.id))
    );
  }, [table]);

  // Hydrate from remote on mount (fire-and-forget, keep local fallback if unauth)
  React.useEffect(() => {
    // TODO: Implement remote hydration if needed
    // hydrateFromRemote(remoteViews);
  }, [tableId, hydrateFromRemote, defaultColumnIds]);

  // Apply current view to column widths on mount (if saved px widths exist)
  // Guarded: only runs when currentView and setWidths are available
  React.useEffect(() => {
    if (!currentView || !setWidths) return;

    // Use saved px widths if available
    if (currentView.columnWidthsPx && Object.keys(currentView.columnWidthsPx).length > 0) {
      setWidths(currentView.columnWidthsPx);
    }
  }, [currentView, setWidths]);

  // Calculate responsive scaling for render widths
  const renderColumnWidthsPx = React.useMemo(() => {
    const widths: Record<string, number> = {};
    const baselineWidth = currentView?.baselineWidthPx ?? containerWidthPx ?? null;

    // If we have baseline and container widths, apply responsive scaling
    if (baselineWidth && containerWidthPx && Object.keys(columnWidths).length > 0) {
      const scale = Math.max(0.7, Math.min(1.4, containerWidthPx / baselineWidth));
      for (const [columnId, savedWidthPx] of Object.entries(columnWidths)) {
        // Skip invisible columns
        if (!visibleColumnIds.has(columnId)) {
          continue;
        }
        const col = baseColumns.find((c) => c.id === columnId);
        const minPx = (col?.meta as any)?.minPx ?? (col as any)?.minSize ?? 80;
        const maxPx = (col?.meta as any)?.maxPx ?? (col as any)?.maxSize;
        const scaledWidth = Math.round(savedWidthPx * scale);
        widths[columnId] = maxPx ? Math.min(maxPx, Math.max(minPx, scaledWidth)) : Math.max(minPx, scaledWidth);
      }
      return widths;
    }

    // Otherwise use saved widths directly (or initial widths), but only for visible columns
    const filtered: Record<string, number> = {};
    for (const [columnId, width] of Object.entries(columnWidths)) {
      if (visibleColumnIds.has(columnId)) {
        filtered[columnId] = width;
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : columnWidths;
  }, [columnWidths, currentView?.baselineWidthPx, containerWidthPx, baseColumns, visibleColumnIds]);

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
              // Clear optimistic state and invalidate React Query cache for subtle refetch
              clearOptimisticState();
              // Use the same endpoint key that buildQueryKey uses (view endpoint, not table resourceKey)
              const endpoint = getApiEndpoint();
              const endpointKey = endpoint.replace(/^\/api\//, "");
              queryClient.invalidateQueries({ queryKey: [endpointKey] });
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
  }, [config, router, confirm, markAsDeleted, clearOptimisticState, queryClient, getApiEndpoint]);

  // 🔄 Keep URL in sync whenever the controlled pagination changes
  // Also ensure URL uses the server's default pageSize (50) if URL has old value (10) or is missing
  React.useEffect(() => {
    const nextPage = pagination.pageIndex + 1;
    const nextSize = pagination.pageSize;
    const curPage = Number(search.get("page") ?? String(page));
    const curSize = Number(search.get("pageSize") ?? String(pageSize));
    
    // If URL has old default (10) or is missing, use server's default (50)
    // This ensures the URL is updated to reflect the new default
    const urlSize = search.get("pageSize");
    const urlSizeNum = urlSize ? Number(urlSize) : null;
    const shouldUpdateSize = urlSizeNum === null || urlSizeNum === 10;
    
    // Use server's default (50) if URL has old value or is missing, otherwise use current pagination
    const finalSize = shouldUpdateSize ? pageSize : nextSize;
    
    // Only update if page changed, size changed, or we need to update from old default
    if (curPage === nextPage && curSize === finalSize && !shouldUpdateSize) return;
    
    const sp = new URLSearchParams(search.toString());
    sp.set("page", String(nextPage));
    sp.set("pageSize", String(finalSize));
    router.replace(`${pathname}?${sp.toString()}`);
  }, [pagination.pageIndex, pagination.pageSize, pathname, router, search, page, pageSize]);

  // 🔁 When SSR props change (after navigation), update local pagination state
  React.useEffect(() => {
    setPagination((prev) => {
      const next = { pageIndex: Math.max(0, page - 1), pageSize };
      return prev.pageIndex === next.pageIndex && prev.pageSize === next.pageSize ? prev : next;
    });
  }, [page, pageSize]);

  // ✅ FIX 3: Move dragIdRef outside the useMemo to avoid hook-in-callback issue
  const dragIdRef = React.useRef<string | null>(null);

  // Persist width changes when columnWidths change (triggered by custom resize hook)
  // This bridges our custom resize hook with saved views persistence
  // Guarded against TDZ: effect only runs when prerequisites exist
  React.useEffect(() => {
    // Early return if prerequisites missing (guard against TDZ)
    if (!currentViewId || !updateView || containerWidthPx === null || containerWidthPx === undefined) {
      return;
    }
    if (Object.keys(columnWidths).length === 0) {
      return;
    }
    // Debounce persistence to avoid excessive updates (only on resize end, not during drag)
    const timeoutId = setTimeout(() => {
      // Ensure baselineWidthPx is initialized if not set (first persistence)
      const baseline = currentView?.baselineWidthPx ?? containerWidthPx;
      updateView(currentViewId, {
        columnWidthsPx: columnWidths,
        baselineWidthPx: baseline,
      });
    }, 500); // Wait 500ms after last resize before persisting
    return () => clearTimeout(timeoutId);
  }, [columnWidths, currentViewId, containerWidthPx, updateView, currentView?.baselineWidthPx]);

  // ✅ REMOVED: Auto-fit columns functionality (was using percentage computation)
  // If needed in future, can reimplement with pixel-based logic
  const autoFitColumns = React.useCallback(() => {
    // Reapply initial column widths from config as "auto-fit"
    setWidths(initialColumnWidths);
  }, [initialColumnWidths, setWidths]);

  // Remote view persistence actions
  const handleSaveViewRemote = React.useCallback(
    async (name: string, description: string, isDefault: boolean) => {
      try {
        const state = {
          columnOrder,
          columnVisibility,
          columnWidthsPx: columnWidths, // Use px instead of pct
          baselineWidthPx: containerWidthPx ?? undefined,
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
        // saveView(newView as any); // Disabled temporarily
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
          columnWidthsPx: columnWidths, // Use px instead of pct
          baselineWidthPx: containerWidthPx ?? undefined,
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
        // setDefault(viewId); // Disabled temporarily
        toast("Default view updated!");
      } catch (err: any) {
        toast.error(`Failed to set default: ${err?.message ?? ""}`);
      }
    },
    [setDefault]
  );

  // ✅ Toolbar مربوط بحالة TanStack Table باستخدام ColumnsMenu و SortMenu
  // Extract bottom toolbar button visibility from config (defaults to true for backward compatibility)
  // Note: Export CSV is handled by the top action toolbar, not here
  const bottomToolbarButtons = config.bottomToolbarButtons ?? {};
  const showViewsButton = bottomToolbarButtons.views !== false;
  const showColumnsButton = bottomToolbarButtons.columns !== false;
  const showSortButton = bottomToolbarButtons.sort !== false;
  const showMoreFiltersButton = bottomToolbarButtons.moreFilters !== false;
  const showSaveViewButton = bottomToolbarButtons.saveView !== false;

  // Extract sorting state separately to avoid depending on entire table object
  const currentSorting = React.useMemo(() => {
    const sortingState = sorting ?? [];
    return sortingState[0] ?? { id: null, desc: false };
  }, [sorting]);

  // Extract column metadata separately to reduce table dependency
  const leafColumnsMetadata = React.useMemo(() => {
    return table.getAllLeafColumns()
      .filter((c) => c.getCanHide() && c.id !== "actions" && c.id !== "__select" && c.id !== "select" && c.id !== idField)
      .map((c) => ({
        id: String(c.id),
        isVisible: c.getIsVisible(),
        canHide: c.getCanHide(),
        column: c, // Keep reference to column object for toggleVisibility
      }));
  }, [table, idField, columnVisibility]); // columnVisibility ensures we recalculate when visibility changes

  const ColumnsAndSortToolbar = React.useMemo(() => {
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

    const current = currentSorting;

    const showAll = () => {
      leafColumnsMetadata.forEach((meta) => meta.column.toggleVisibility(true));
    };
    const hideAll = () => {
      leafColumnsMetadata.forEach((meta) => meta.column.toggleVisibility(false));
    };
    const setSort = (columnId: string, dir: "asc" | "desc") => {
      table.setSorting([{ id: columnId, desc: dir === "desc" }]);
    };
    const clearSorting = () => {
      table.setSorting([]);
      if (onClearSorting) {
        onClearSorting();
      }
    };

    const menuColumns = leafColumnsMetadata.map((meta) => ({
      id: meta.id,
      label: labelFor(meta.id),
      required: !meta.canHide,
    }));
    const visibleColumns: Record<string, boolean> = Object.fromEntries(
      leafColumnsMetadata.map((meta) => [meta.id, meta.isVisible]),
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
      const meta = leafColumnsMetadata.find((m) => m.id === columnId);
      if (meta) {
        meta.column.toggleVisibility(visible);
      }
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
        {/* Views dropdown - controlled by config */}
        {showViewsButton && (
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
                currentViewId="default"
                onApplyView={(v) => {
                  applyView(v.id);
                  setColumnOrder(v.columnOrder);
                  setColumnVisibility(v.visibleColumns as any);
                  // Use pixel widths from saved view (legacy pct views should be migrated on load)
                  const w = (v as any).columnWidthsPx;
                  if (w && Object.keys(w).length > 0) setWidths(w);
                }}
                onDeleteView={(id) => {
                  handleDeleteViewRemote(id);
                  // optimistically remove from local state
                  const updatedViews = views.filter((v) => v.id !== id);
                  if (updatedViews.length) {
                    const nextDefault = updatedViews.find((v) => v.isDefault) ?? updatedViews[0];
                    // applyView(nextDefault.id); // Disabled temporarily
                  }
                }}
                formatDate={(d) => d.toLocaleDateString()}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Columns dropdown - controlled by config */}
        {showColumnsButton && (
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
                onResetWidths={() => {
                  // Clear saved widths and re-apply config defaults
                  setWidths(initialColumnWidths);
                  if (currentViewId && updateView && containerWidthPx) {
                    // Reset to config defaults and set fresh baseline for future scaling
                    updateView(currentViewId, {
                      columnWidthsPx: undefined,
                      baselineWidthPx: containerWidthPx, // Set fresh baseline for reset state
                    });
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
        )}

        {/* Sort dropdown - controlled by config */}
        {showSortButton && (
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
        )}
      </div>
    );
  }, [currentSorting, leafColumnsMetadata, table, isResizing, setColumnOrder, dragIdRef, idField, views, currentView, applyView, handleDeleteViewRemote, setWidths, onClearSorting, showViewsButton, showColumnsButton, showSortButton, initialOrderRef, initialColumnWidths, containerWidthPx, currentViewId, updateView, autoFitColumns]);

  // ✅ FIX: Lazy-load More Filters Section - only compute when showMoreFilters is true
  // Memoize active filter count separately to avoid recalculating when filters change
  const activeFiltersCount = React.useMemo(() => {
    return Object.values(filters).filter((filter) => filter.value.trim() !== "").length;
  }, [filters]);

  // Memoize clear all filters handler
  const clearAllFilters = React.useCallback(() => {
    setFilters({});
    if (onClearFilters) {
      onClearFilters();
    }
  }, [onClearFilters]);

  // Extract column IDs to avoid depending on entire table object
  const allLeafColumnIds = React.useMemo(() => {
    return table.getAllLeafColumns().map((c) => ({
      id: String(c.id),
      canFilter: c.getCanFilter(),
    }));
  }, [table]);

  // إعداد أعمدة صف الفلاتر مع الحفاظ على ترتيب الهيدر (بما فيهم الأعمدة الخاصة فارغة)
  const filterColumns: FilterColumn[] = React.useMemo(() => {
    // ✅ exclude idField from filter row to avoid "Column with id 'id' does not exist."
    return allLeafColumnIds
      .filter((col) => col.id !== idField && col.id !== "id")
      .map((col) => ({
        id: col.id,
        label:
          col.id === "is_active"
            ? "Status"
            : col.id === "__select" || col.id === "select"
              ? ""
              : col.id === "actions"
                ? ""
                : col.id,
        disableInput: col.id === "actions" || col.id === "__select" || col.id === "select",
      }));
  }, [allLeafColumnIds, idField]);

  // استمع لأي ضغطة على زر التولبار العلوي الذي يحمل data-onclick-id="exportCsv"
  // Use ref to avoid recreating listener when table object changes
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
      // Use ref to get current table instance
      exportCSV(tableRefForExport.current as never, "tally_cards");
    };
    document.addEventListener("click", onToolbarClick, true);
    return () => document.removeEventListener("click", onToolbarClick, true);
  }, []); // Empty deps - listener never needs to be recreated, uses ref for current table

  const footer = <DataTablePagination table={table} totalCount={currentTotal} />;

  // Extract stable filter values from search params (avoid depending on search object reference)
  const quickFilterValues = React.useMemo(() => {
    const quickFilters = config.quickFilters ?? [];
    const values: Record<string, string> = {};
    quickFilters.forEach((filter) => {
      const value = search.get(filter.id);
      if (value) {
        values[filter.id] = value;
      } else if (filter.defaultValue) {
        values[filter.id] = filter.defaultValue;
      }
    });
    return values;
  }, [config.quickFilters, search]);

  // Quick Filters component - reads from config and syncs with URL
  const QuickFiltersToolbar = React.useMemo(() => {
    const quickFilters = config.quickFilters ?? [];
    if (quickFilters.length === 0) return null;

    const handleFilterChange = (filterId: string, value: string) => {
      const sp = new URLSearchParams(search.toString());
      
      // Find the filter config to check defaultValue
      const filterConfig = quickFilters.find((f) => f.id === filterId);
      const defaultValue = filterConfig?.defaultValue ?? "ALL";
      
      // Remove "ALL" or empty values from URL (uses default from filter config)
      if (!value || value === "ALL" || value === defaultValue) {
        sp.delete(filterId);
      } else {
        sp.set(filterId, value);
      }
      
      // Reset to page 1 when filter changes
      sp.set("page", "1");
      
      // Update URL and invalidate React Query cache for subtle refetch
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      // Invalidate queries to trigger refetch with new filter params (no full page refresh)
      const endpoint = getApiEndpoint();
      const endpointKey = endpoint.replace(/^\/api\//, "");
      queryClient.invalidateQueries({ queryKey: [endpointKey] });
    };

    return (
      <div className="flex items-center gap-2">
        {quickFilters.map((filter) => {
          if (filter.type === "enum" && filter.options) {
            return (
              <div key={filter.id} className="flex items-center gap-2">
                <label htmlFor={`quick-filter-${filter.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {filter.label}:
                </label>
                <select
                  id={`quick-filter-${filter.id}`}
                  value={quickFilterValues[filter.id] ?? filter.defaultValue ?? ""}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  {filter.options.map((option: { value: string; label: string }) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }, [config.quickFilters, quickFilterValues, pathname, router, getApiEndpoint, queryClient, search]);

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
              {/* Quick Filters - first item in bottom toolbar */}
              {QuickFiltersToolbar}
              {QuickFiltersToolbar && <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />}
              {ColumnsAndSortToolbar}
              {/* More Filters button - controlled by config */}
              {showMoreFiltersButton && (
                <Button
                  variant="outline"
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showMoreFilters ? "Hide Filters" : "More Filters"}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Save View button - controlled by config */}
              {showSaveViewButton && (
                <Button
                  variant="outline"
                  onClick={() => setSaveViewDialogOpen(true)}
                  className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                >
                  <Save className="h-4 w-4" />
                  Save View
                </Button>
              )}
              {/* Export CSV is handled by the top action toolbar, not here */}
            </div>
          </div>
        </div>

        {/* ✅ FIX: Lazy-load More Filters Section - only render when showMoreFilters is true */}
        {showMoreFilters && (
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
        )}

        <DataTable
          dndEnabled={enableColumnReordering}
          table={table as never}
          dataIds={dataIds}
          handleDragEnd={handleDragEnd}
          sensors={sensors}
          sortableId="resource-table"
          renderExpanded={renderExpanded ? (row) => renderExpanded(row.original as TRow) : undefined}
          // ✅ Use responsive pixel widths (with scaling if baseline exists)
          columnWidthsPx={renderColumnWidthsPx}
          tableContainerRef={tableRef}
          onMouseDownResize={onMouseDownResize}
          filtersConfig={{
            columns: filterColumns,
            // Use responsive pixel widths for filter row
            columnWidthsPx: renderColumnWidthsPx,

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
