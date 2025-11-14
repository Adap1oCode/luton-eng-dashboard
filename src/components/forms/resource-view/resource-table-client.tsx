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
import { getDomainId, type BaseViewConfig } from "@/components/data-table/view-defaults";
import { useOptimistic } from "@/components/forms/shell/optimistic-context";
import { fetchResourcePageClient } from "@/lib/api/client-fetch";
import { parseListParams, type SPRecord } from "@/lib/next/search-params";
import { useSelectionStore } from "@/components/forms/shell/selection/selection-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ViewsMenu } from "@/components/data-table/views-menu";

type FilterMode = "contains" | "startsWith" | "endsWith" | "equals" | "notEquals";

type ResourceTableClientProps<TRow extends Record<string, any>> = {
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
  initialColumnVisibility?: VisibilityState;
  initialSorting?: Array<{ id: string; desc: boolean }>;
  // SSR-parsed filters and extraQuery to eliminate duplicate parsing
  initialFilters?: Record<string, string>;
  initialExtraQuery?: Record<string, any>;
};

// move header and cell wrappers into shared data-table modules

export default function ResourceTableClient<TRow extends Record<string, any>>({
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
  initialColumnVisibility,
  initialSorting,
  initialFilters,
  initialExtraQuery,
}: ResourceTableClientProps<TRow>) {
  const { confirm, ConfirmComponent } = useConfirmDialog();
  const { markAsDeleted, clearOptimisticState, isOptimisticallyDeleted } = useOptimistic();
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const resolvedIdField = React.useMemo(() => (config.idField as string | undefined) ?? "id", [config.idField]);

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

  // Extract stable config properties to prevent unnecessary recalculations
  // These are memoized with stable dependencies (property values, not object references)
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

  // Parse quick filters from URL (always parse to handle navigation/user changes)
  // Use SSR-parsed filters as initial/default values, but always re-parse from URL for current state
  const { filters: parsedFilters } = parseListParams(searchParamsRecord, quickFilterMeta, {
    defaultPage: page,
    defaultPageSize: pageSize,
    max: 500,
  });
  // Merge SSR filters as defaults (for initial load optimization), but URL parsing takes precedence
  const currentFilters = React.useMemo(() => {
    return { ...(initialFilters ?? {}), ...parsedFilters };
  }, [initialFilters, parsedFilters]);

  // 🔑 Columns: prefer SSR-materialised `config.columns`, fallback to legacy `buildColumns(true)` (if ever provided)
  // Memoized with stable dependencies (configColumns, configBuildColumns) to prevent unnecessary recalculations
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
  // Compute default column visibility: all columns visible except routing id
  const defaultColumnVisibility = React.useMemo<VisibilityState>(() => {
    if (initialColumnVisibility) {
      return { ...initialColumnVisibility, [idField]: false }; // Always hide routing id
    }
    // Default: all columns visible except routing id
    const visibility: VisibilityState = {};
    baseColumns.forEach((col) => {
      const colId = String((col as any).id ?? (col as any).accessorKey ?? "");
      if (colId && colId !== idField) {
        visibility[colId] = true;
      }
    });
    visibility[idField] = false; // Always hide routing id
    return visibility;
  }, [initialColumnVisibility, baseColumns, idField]);

  const [sorting, setSorting] = React.useState<Array<{ id: string; desc: boolean }>>(
    initialSorting ?? []
  );
  const [rowSelection, setRowSelection] = React.useState({});
  // Expanded row state - controlled to persist across data updates
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const initialOrderRef = React.useRef<string[]>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(defaultColumnVisibility);

  // ✅ Filters state tied to DataTableFilters
  // Initialize filters from URL search params (filters[columnId][value] and filters[columnId][mode])
  const initialColumnFilters = React.useMemo<Record<string, ColumnFilterState>>(() => {
    const parsed: Record<string, ColumnFilterState> = {};
    search.forEach((value, key) => {
      // Parse structured filter format: filters[columnId][value] and filters[columnId][mode]
      const match = key.match(/^filters\[(.+?)\]\[(value|mode)\]$/);
      if (match) {
        const columnId = match[1];
        const kind = match[2] as "value" | "mode";
        if (!parsed[columnId]) {
          parsed[columnId] = { value: "", mode: "contains" as FilterMode };
        }
        if (kind === "value") {
          parsed[columnId].value = value;
        } else if (kind === "mode") {
          // Validate mode is a valid FilterMode, default to "contains" if not
          const validModes: FilterMode[] = ["contains", "startsWith", "endsWith", "equals", "notEquals"];
          parsed[columnId].mode = validModes.includes(value as FilterMode) ? (value as FilterMode) : "contains";
        }
      }
    });
    // Only return filters that have a value (empty filters are not useful)
    const filtered: Record<string, ColumnFilterState> = {};
    Object.entries(parsed).forEach(([columnId, filterState]) => {
      if (filterState.value && filterState.value.trim() !== "") {
        filtered[columnId] = filterState;
      }
    });
    return filtered;
  }, [search]);

  const [filters, setFilters] = React.useState<Record<string, ColumnFilterState>>(initialColumnFilters);
  
  // Ref to track if we're updating filters from URL (to prevent feedback loops)
  const isUpdatingFromUrlRef = React.useRef(false);
  // Ref to prevent pagination sync effects from fighting each other
  const isSyncingPaginationRef = React.useRef(false);
  const columnFilters = React.useMemo(() => {
    return Object.entries(filters).map(([id, v]) => ({ id, value: v }));
  }, [filters]);

  // Build extraQuery from filters (for React Query fetch)
  // Always rebuild from current filter state to ensure correctness
  // SSR-provided initialExtraQuery helps avoid server-side parsing, but client rebuilds ensure accuracy
  // Must be declared after filters state is initialized
  const buildExtraQueryFromFilters = React.useCallback(() => {
    const extraQuery: Record<string, any> = { raw: "true" };
    const quickFilters = (config.quickFilters ?? []) as Array<{ id: string; toQueryParam?: (value: string) => Record<string, any> }>;
    
    // Add quick filters (status, etc.) from current state
    quickFilters.forEach((filter) => {
      const value = currentFilters[filter.id];
      if (value && filter.toQueryParam) {
        Object.assign(extraQuery, filter.toQueryParam(value));
      }
    });
    
    // Add column filters (from "More Filters") - these must be sent to server for full dataset filtering
    Object.entries(filters).forEach(([columnId, filterState]) => {
      if (filterState?.value && filterState.value.trim() !== "") {
        // Use structured filter format: filters[columnId][value] and filters[columnId][mode]
        // Default mode is "contains" if not specified
        const mode = filterState.mode || "contains";
        extraQuery[`filters[${columnId}][value]`] = filterState.value;
        extraQuery[`filters[${columnId}][mode]`] = mode;
      }
    });
    
    return extraQuery;
  }, [currentFilters, config.quickFilters, filters]);

  // React Query hook (runs in parallel, but table still uses initialRows for now)
  const apiEndpoint = React.useMemo(() => getApiEndpoint(), [getApiEndpoint]);

  // ✅ Controlled pagination (0-based index)
  const [pagination, setPagination] = React.useState({
    pageIndex: Math.max(0, page - 1),
    pageSize,
  });

  const currentPage = React.useMemo(() => pagination.pageIndex + 1, [pagination.pageIndex]);
  const currentPageSize = pagination.pageSize;

  // Include column filters in queryKey so React Query refetches when they change
  const queryKey = React.useMemo(() => {
    const combinedFilters: Record<string, string> = { ...currentFilters };
    Object.entries(filters).forEach(([columnId, filterState]) => {
      if (filterState?.value) {
        combinedFilters[`col_${columnId}`] = `${filterState.value}:${filterState.mode || "contains"}`;
      }
    });
    return buildQueryKey(currentPage, currentPageSize, combinedFilters);
  }, [buildQueryKey, currentPage, currentPageSize, currentFilters, filters]);

  const {
    data: queryData,
    isLoading: isQueryLoading,
    isFetching: isQueryFetching,
    error: queryError,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const extraQuery = buildExtraQueryFromFilters();
      return await fetchResourcePageClient<TRow>({
        endpoint: apiEndpoint,
        page: currentPage,
        pageSize: currentPageSize,
        extraQuery,
      });
    },
    initialData: { rows: initialRows, total: initialTotal },
    initialDataUpdatedAt: Date.now(), // Mark SSR data as fresh
    staleTime: 5 * 60 * 1000, // 5 minutes (matches ResourceListClient)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // Don't refetch on mount when initialData is provided (SSR pattern)
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
    if (queryError || !queryData) {
      return initialRows;
    }
    if (Array.isArray(queryData.rows)) {
      return queryData.rows;
    }
    return initialRows;
  }, [queryData?.rows, queryData, queryError, initialRows]);

  // Get current total from React Query, fallback to initialTotal during loading
  const currentTotal = React.useMemo(() => {
    if (queryError || !queryData) {
      return initialTotal;
    }
    if (typeof queryData.total === "number") {
      return queryData.total;
    }
    return initialTotal;
  }, [queryData?.total, queryData, queryError, initialTotal]);

  // 🎯 Filter out optimistically deleted rows from current data
  const filteredRows = React.useMemo(() => {
    return currentRows.filter((row) => !isOptimisticallyDeleted((row as any)[idField]));
  }, [currentRows, isOptimisticallyDeleted, idField]);

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
      const specificQueryKey = buildQueryKey(currentPage, currentPageSize, currentFilters);
      
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
      const specificQueryKey = buildQueryKey(currentPage, currentPageSize, currentFilters);
      queryClient.invalidateQueries({ queryKey: specificQueryKey });
      
      alert(`Error updating ${editingCell.columnId}`);
    } finally {
      setEditingCell(null);
    }
  }, [editingCell, config, queryClient, filteredRows, idField, getApiEndpoint, buildQueryKey, currentPage, currentPageSize, currentFilters]);

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

  const sortingEnabled = config?.features?.sortable !== false;

  // ✅ FIX: Split header decoration from base columns to reduce recalculation
  // Memoized header decoration function (only depends on columnOrder changes)
  const createHeaderDecoration = React.useCallback(
    (label: string, columnId: string, columnCanSort: boolean) => {
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
          showSortButton={sortingEnabled && columnCanSort}
        />
      );
    },
    [columnOrder, sortingEnabled],
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
        const canSort = (col as { enableSorting?: boolean }).enableSorting !== false;
        // Use memoized header decoration function
        c.header = createHeaderDecoration(label, col.id ?? "", canSort);
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
      const showMultiBadge = (c.meta as any)?.showMultiBadge === true;

      if (inlineEditConfig) {
        // Use generic inline editing
        c.cell = (cellProps) => {
          const baseCell = (
              <InlineEditCellWrapper
              row={cellProps.row}
              columnId={c.id || (c as any).accessorKey}
              editingCell={editingCell}
              config={inlineEditConfig}
              onEditStart={handleInlineEditStart}
              onEditChange={handleInlineEditChange}
              onSave={handleInlineEditSave}
              onCancel={handleInlineEditCancel}
                idField={resolvedIdField}
            />
          );

          // Add MULTI badge if needed (only in display mode, not when editing)
            if (showMultiBadge) {
              const rowId = getDomainId(cellProps.row, resolvedIdField);
              const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === (c.id || (c as any).accessorKey);
              const multiLocation = (cellProps.row.original as any)?.multi_location;
            
            if (!isEditing && multiLocation) {
              return (
                <div className="flex items-center gap-2">
                  {baseCell}
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-100 dark:border-orange-800 px-1.5 py-0.5 text-xs font-medium shrink-0">
                    MULTI
                  </Badge>
                </div>
              );
            }
          }

          return baseCell;
        };
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
            idField={resolvedIdField}
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
    // ✅ Disable client-side filtering - all filtering happens server-side on full dataset
    // getFilteredRowModel: getFilteredRowModel(), // Removed - filters are applied server-side
    manualFiltering: true, // Explicitly mark filtering as manual (server-side)
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

  // Extract bottom toolbar button visibility from config (needed early for width effect)
  const bottomToolbarButtons = config.bottomToolbarButtons ?? {};
  const showViewsButton = bottomToolbarButtons.views !== false;

  // Apply current view to column widths on mount (if saved px widths exist)
  // Guarded: only runs when currentView and setWidths are available AND views are enabled
  React.useEffect(() => {
    // Don't apply saved view widths if views are disabled
    if (!showViewsButton) return;
    if (!currentView || !setWidths) return;

    // Use saved px widths if available
    if (currentView.columnWidthsPx && Object.keys(currentView.columnWidthsPx).length > 0) {
      setWidths(currentView.columnWidthsPx);
    }
  }, [currentView, setWidths, showViewsButton]);

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

  // 🔄 Sync pagination FROM URL/SSR defaults → client state
  React.useEffect(() => {
    const urlPageParam = search.get("page");
    const urlPageSizeParam = search.get("pageSize");
    const parsedPage = urlPageParam ? Number(urlPageParam) : NaN;
    const parsedPageSize = urlPageSizeParam ? Number(urlPageSizeParam) : NaN;

    const nextPageIndex = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage - 1 : Math.max(0, page - 1);
    const nextPageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? parsedPageSize : pageSize;

    setPagination((prev) => {
      if (prev.pageIndex === nextPageIndex && prev.pageSize === nextPageSize) {
        return prev;
      }
      isSyncingPaginationRef.current = true;
      setTimeout(() => {
        isSyncingPaginationRef.current = false;
      }, 0);
      return { pageIndex: nextPageIndex, pageSize: nextPageSize };
    });
  }, [search, page, pageSize]);

  // 🔄 Sync pagination FROM client state → URL (maintain navigation + SSR hydration)
  React.useEffect(() => {
    if (isSyncingPaginationRef.current) {
      return;
    }

    const nextPage = currentPage;
    const nextSize = currentPageSize;
    const sp = new URLSearchParams(search.toString());

    const existingPageParam = sp.get("page");
    const existingSizeParam = sp.get("pageSize");
    const existingPage = existingPageParam ? Number(existingPageParam) : NaN;
    const existingSize = existingSizeParam ? Number(existingSizeParam) : NaN;

    const needsPageUpdate = !Number.isFinite(existingPage) ? nextPage !== page : existingPage !== nextPage;
    const needsSizeUpdate = !Number.isFinite(existingSize) ? nextSize !== pageSize : existingSize !== nextSize;

    if (!needsPageUpdate && !needsSizeUpdate) {
      return;
    }

    sp.set("page", String(nextPage));
    sp.set("pageSize", String(nextSize));
    isSyncingPaginationRef.current = true;
    router.replace(`${pathname}?${sp.toString()}`);
    setTimeout(() => {
      isSyncingPaginationRef.current = false;
    }, 0);
  }, [currentPage, currentPageSize, pathname, router, search, page, pageSize]);

  // 🔄 Sync filters FROM URL when search params change (handles back/forward navigation)
  // This runs when URL changes externally (e.g., browser back/forward)
  React.useEffect(() => {
    // Skip if we're currently updating from URL (prevent feedback loop)
    if (isUpdatingFromUrlRef.current) {
      return;
    }

    const urlFilters: Record<string, ColumnFilterState> = {};
    search.forEach((value, key) => {
      const match = key.match(/^filters\[(.+?)\]\[(value|mode)\]$/);
      if (match) {
        const columnId = match[1];
        const kind = match[2] as "value" | "mode";
        if (!urlFilters[columnId]) {
          urlFilters[columnId] = { value: "", mode: "contains" as FilterMode };
        }
        if (kind === "value") {
          urlFilters[columnId].value = value;
        } else if (kind === "mode") {
          const validModes: FilterMode[] = ["contains", "startsWith", "endsWith", "equals", "notEquals"];
          urlFilters[columnId].mode = validModes.includes(value as FilterMode) ? (value as FilterMode) : "contains";
        }
      }
    });
    
    // Filter out empty filters
    const filtered: Record<string, ColumnFilterState> = {};
    Object.entries(urlFilters).forEach(([columnId, filterState]) => {
      if (filterState.value && filterState.value.trim() !== "") {
        filtered[columnId] = filterState;
      }
    });
    
    // Only update filters if URL filters differ from current filters (deep comparison)
    const urlFiltersKeys = Object.keys(filtered).sort();
    const currentFiltersKeys = Object.keys(filters).sort();
    
    if (urlFiltersKeys.length !== currentFiltersKeys.length) {
      isUpdatingFromUrlRef.current = true;
      setFilters(filtered);
      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromUrlRef.current = false;
      }, 0);
      return;
    }
    
    // Deep compare each filter
    let filtersChanged = false;
    for (const key of urlFiltersKeys) {
      const urlFilter = filtered[key];
      const currentFilter = filters[key];
      if (!currentFilter || 
          urlFilter.value !== currentFilter.value || 
          (urlFilter.mode || "contains") !== (currentFilter.mode || "contains")) {
        filtersChanged = true;
        break;
      }
    }
    
    // Also check if any current filters are missing in URL
    if (!filtersChanged) {
      for (const key of currentFiltersKeys) {
        if (!filtered[key]) {
          filtersChanged = true;
          break;
        }
      }
    }
    
    if (filtersChanged) {
      isUpdatingFromUrlRef.current = true;
      setFilters(filtered);
      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromUrlRef.current = false;
      }, 0);
    }
  }, [search, filters]); // Include filters for comparison, but use ref to prevent loops

  // 🔄 Sync filters TO URL whenever filters state changes (user input)
  React.useEffect(() => {
    // Skip if we're updating from URL (prevent feedback loop)
    if (isUpdatingFromUrlRef.current) {
      return;
    }

    const sp = new URLSearchParams(search.toString());
    
    // Remove all existing filter params first
    const keysToRemove: string[] = [];
    sp.forEach((_, key) => {
      if (key.match(/^filters\[.+\]\[(value|mode)\]$/)) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach((key) => sp.delete(key));
    
    // Add current filters to URL
    let hasActiveFilters = false;
    Object.entries(filters).forEach(([columnId, filterState]) => {
      if (filterState?.value && filterState.value.trim() !== "") {
        hasActiveFilters = true;
        sp.set(`filters[${columnId}][value]`, filterState.value);
        // Only add mode if it's not the default "contains"
        const mode = filterState.mode || "contains";
        if (mode !== "contains") {
          sp.set(`filters[${columnId}][mode]`, mode);
        }
      }
    });
    
    // Reset to page 1 when filters change (if there are active filters)
    if (hasActiveFilters) {
      sp.set("page", "1");
    }
    
    // Only update URL if something changed
    const newUrl = `${pathname}?${sp.toString()}`;
    const currentUrl = `${pathname}?${search.toString()}`;
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
      // Note: React Query will auto-refetch because queryKey includes filters via buildQueryKey
      // No need to explicitly invalidate - the queryKey change triggers refetch automatically
    }
  }, [filters, pathname, router, search]);

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
  // Note: bottomToolbarButtons and showViewsButton are already defined earlier (for width effect)
  // Note: Export CSV is handled by the top action toolbar, not here
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

  // Extract filter columns to match EXACTLY the header row structure
  // Use getHeaderGroups() to get the same columns in the same order as the header row
  const filterColumns: FilterColumn[] = React.useMemo(() => {
    // Get the first header group (there's typically only one)
    const headerGroup = table.getHeaderGroups()[0];
    if (!headerGroup) return [];

    // Map headers to filter columns in the exact same order
    return headerGroup.headers.map((header) => {
      const column = header.column;
      const colId = String(column.id);

      // Determine if this column should have a filter input
      const shouldDisableInput =
        // Exclude routing id, actions, and selection columns
        colId === idField ||
        colId === "id" ||
        colId === "actions" ||
        colId === "__select" ||
        colId === "select" ||
        // Exclude columns that can't be filtered
        !column.getCanFilter();

      return {
        id: colId,
        label:
          colId === "is_active"
            ? "Status"
            : colId === "__select" || colId === "select"
              ? ""
              : colId === "actions"
                ? ""
                : colId,
        disableInput: shouldDisableInput,
      };
    });
  }, [table, idField, columnVisibility]); // Include columnVisibility to recalculate when visibility changes

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

  // Quick Filters component - single dropdown with grouped options
  const QuickFiltersToolbar = React.useMemo(() => {
    const quickFilters = config.quickFilters ?? [];
    if (quickFilters.length === 0) return null;

    const handleFilterChange = (value: string) => {
      const sp = new URLSearchParams(search.toString());
      
      // Handle "Clear all" option
      if (value === "__clear_all__") {
        // Remove all filter query params
        quickFilters.forEach((filter) => {
          sp.delete(filter.id);
        });
      } else {
        // Parse the value: format is "filterId:optionValue"
        const colonIndex = value.indexOf(":");
        if (colonIndex <= 0) return; // Invalid format
        
        const filterId = value.substring(0, colonIndex);
        const optionValue = value.substring(colonIndex + 1);
        
        // Find the filter config to check defaultValue
        const filterConfig = quickFilters.find((f) => f.id === filterId);
        if (!filterConfig) return; // Filter not found
        
        const defaultValue = filterConfig.defaultValue ?? "ALL";
        
        // Update only this filter (keep other filters active)
        // Remove "ALL" or empty values from URL (uses default from filter config)
        if (!optionValue || optionValue === "ALL" || optionValue === defaultValue) {
          sp.delete(filterId);
        } else {
          sp.set(filterId, optionValue);
        }
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

    // Build display value showing current active filters
    const activeFilters = quickFilters
      .map((filter) => {
        const value = quickFilterValues[filter.id] ?? filter.defaultValue;
        if (!value || value === "ALL" || value === filter.defaultValue) return null;
        const option = filter.options?.find((opt: any) => opt.value === value);
        return option ? `${filter.label}: ${option.label}` : null;
      })
      .filter(Boolean);
    
    const displayValue = activeFilters.length > 0 
      ? activeFilters.join(", ")
      : "All filters";

    // Find current selected value for the dropdown
    // Only set if there's exactly one active filter (for better UX)
    let currentSelectedValue = "";
    const activeFilterCount = quickFilters.filter((filter) => {
      if (filter.type !== "enum" || !filter.options) return false;
      const currentValue = quickFilterValues[filter.id] ?? filter.defaultValue;
      return currentValue && currentValue !== "ALL" && currentValue !== filter.defaultValue;
    }).length;
    
    // Only show selected value if there's exactly one active filter
    // Otherwise show display value (which shows all active filters)
    if (activeFilterCount === 1) {
      for (const filter of quickFilters) {
        if (filter.type === "enum" && filter.options) {
          const currentValue = quickFilterValues[filter.id] ?? filter.defaultValue;
          if (currentValue && currentValue !== "ALL" && currentValue !== filter.defaultValue) {
            currentSelectedValue = `${filter.id}:${currentValue}`;
            break;
          }
        }
      }
    }

    return (
      <div className="flex items-center gap-2">
        <Label htmlFor="quick-filters-combined" className="text-sm font-medium">
          Filters:
        </Label>
        <Select
          value={currentSelectedValue}
          onValueChange={handleFilterChange}
        >
          <SelectTrigger id="quick-filters-combined" className="h-9 w-[220px]">
            <SelectValue placeholder="All filters">
              {displayValue}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* Clear all option */}
            <SelectItem value="__clear_all__" className="font-medium">
              Clear all filters
            </SelectItem>
            <SelectSeparator />
            {quickFilters.map((filter, filterIndex) => {
              if (filter.type !== "enum" || !filter.options) return null;
              
              return (
                <React.Fragment key={filter.id}>
                  {filterIndex > 0 && <SelectSeparator />}
                  <SelectGroup>
                    <SelectLabel>{filter.label}</SelectLabel>
                    {filter.options.map((option: { value: string; label: string }) => {
                      const combinedValue = `${filter.id}:${option.value}`;
                      return (
                        <SelectItem key={combinedValue} value={combinedValue}>
                          {option.label}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </React.Fragment>
              );
            })}
          </SelectContent>
        </Select>
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
              {QuickFiltersToolbar && <Separator orientation="vertical" className="h-6" />}
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
              {/* Filter status - shown on the right */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {activeFiltersCount > 0 ? (
                  <span>
                    {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active
                  </span>
                ) : (
                  <span>No filters applied</span>
                )}
              </div>
              {/* Clear all filters button - only show when filters are active */}
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
                // Ensure default mode is "contains" if not specified
                const filterState: ColumnFilterState = {
                  value: next.value || "",
                  mode: next.mode || "contains",
                };
                const newFilters = { ...prev, [id]: filterState };

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
