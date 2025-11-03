# Stock Adjustments Load Profile Report

**Date**: 2025-01-29  
**Route**: `/forms/stock-adjustments`  
**Scope**: Complete SSR → Client Hydration → First Paint Analysis  
**Objective**: Identify load bottlenecks and optimization opportunities

---

## Executive Summary

This report maps the complete import chain and execution timeline for the Stock Adjustments screen from server-side rendering through client hydration. The analysis identifies:

- **SSR Path**: Page component → API fetch → data transformation → HTML generation
- **Client Hydration**: React hydration → table initialization → React Query setup
- **Interaction-Only Code**: Deferrable components (column resize, saved views, inline editors)

**Key Findings**:
- Multiple large libraries loaded on initial paint (TanStack Table, DnD Kit, React Query)
- Column generation runs on every render (unstable memoization)
- Several interaction-only features loaded eagerly
- Bundle size analysis needed to quantify impact

---

## 1. Import Chain Mapping

### 1.1 SSR Path (Server Component)

**Entry Point**: `src/app/(main)/forms/stock-adjustments/page.tsx`

#### Direct Imports (SSR-only)
```typescript
// Next.js metadata (SSR-only)
import type { Metadata } from "next";

// Server components
import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";

// Local config (server-safe)
import { config, stockAdjustmentsFilterMeta, statusToQuery } from "./stock-adjustments.config";
import { toRow } from "./to-row";
import { StockAdjustmentsTableClient } from "./stock-adjustments-table-client";
```

#### Transitive Imports (SSR execution)

**PageShell →** `src/components/forms/shell/page-shell.tsx`
- Server Component (no client hooks)
- Imports: React (SSR-safe), lucide-react icons (SSR-safe), UI components (Badge, Button)
- Wraps children with OptimisticProvider (context provider, SSR-safe)

**fetchResourcePage →** `src/lib/data/resource-fetch.ts`
- Server-only function
- Imports: `getServerBaseUrl`, `getForwardedCookieHeader` from `@/lib/ssr/http`
- Uses native `fetch` with Next.js cache options

**stock-adjustments.config.tsx**
- Mixed: some client-only functions (`buildColumns`, `makeActionsColumn`)
- Exports: `config`, `stockAdjustmentsFilterMeta`, `statusToQuery` (server-safe)
- Note: Config file contains JSX but functions are not executed during SSR import

**to-row.ts**
- Server-safe transformation function
- Pure data mapping (no client dependencies)

**StockAdjustmentsTableClient →** `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx`
- **CLIENT COMPONENT** ("use client")
- Marked as client boundary; code not executed during SSR, only serialized for hydration

#### SSR Execution Timeline

```
1. page.tsx (async component)
   ├─ resolveSearchParams()        ~1-2ms
   ├─ parseListParams()             ~1-2ms
   ├─ statusToQuery() transform     ~0.1ms
   ├─ fetchResourcePage()
   │   ├─ getServerBaseUrl()       ~1ms
   │   ├─ getForwardedCookieHeader() ~1ms
   │   ├─ HTTP fetch to /api/...    ~50-200ms (database query)
   │   └─ JSON parse                ~2-5ms
   ├─ toRow() mapping (per row)    ~1-5ms (depends on row count)
   └─ JSX render
       ├─ PageShell                 ~5-10ms
       └─ StockAdjustmentsTableClient (serialized only) ~0ms (client boundary)
```

**Estimated SSR Time**: 60-230ms (excluding database query which varies by data size)

**API Route Chain**: `GET /api/v_tcm_user_tally_card_entries`
- Handler: `src/app/api/[resource]/route.ts`
- Implementation: `src/lib/api/handle-list.ts`
- Database: Supabase query with pagination/filtering

---

### 1.2 Client Hydration Path

**Entry Point**: `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx`

#### Client Component Imports

```typescript
// React core (client)
import { useMemo } from "react";

// Generic table client (heavy)
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";

// Types only
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import type { StockAdjustmentRow } from "./stock-adjustments.config";
import { stockAdjustmentsViewConfig } from "./stock-adjustments.config";
```

#### ResourceTableClient Imports (Heavy Component)

**React & Routing**:
- `react`, `react-dom` (core)
- `next/navigation` (useRouter, useSearchParams, usePathname)

**Data Fetching & State**:
- `@tanstack/react-query` (useQuery, useQueryClient) - **~50KB gzipped**
- `zustand` (via selection-store) - **~3KB gzipped**

**Table Library**:
- `@tanstack/react-table` - **~80KB gzipped**
  - getCoreRowModel, getSortedRowModel, getExpandedRowModel
  - getPaginationRowModel, getFilteredRowModel, useReactTable
  - ColumnDef, ColumnOrderState, VisibilityState, Row types

**Drag & Drop**:
- `@dnd-kit/core` - **~25KB gzipped**
  - DndContext, DragStartEvent, KeyboardSensor, PointerSensor
  - useSensor, useSensors, DragEndEvent, UniqueIdentifier, DragOverlay
- `@dnd-kit/sortable` - **~15KB gzipped**
  - arrayMove, SortableContext, horizontalListSortingStrategy

**Icons**:
- `lucide-react` (7 icons) - **~5KB per icon tree-shaken**

**UI Components** (Radix UI + shadcn):
- `@/components/ui/button`
- `@/components/ui/checkbox`
- `@/components/ui/confirm-dialog`
- `@/components/ui/dialog` (DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle)
- `@/components/ui/dropdown-menu` (multiple exports)
- `@/components/ui/input`
- `@/components/ui/label`
- `sonner` (toast) - **~10KB gzipped**

**Data Table Primitives** (30+ imports):
- `@/components/data-table/auto-column-widths` (computeAutoColumnPercents)
- `@/components/data-table/columns-menu`
- `@/components/data-table/csv-export` (exportCSV)
- `@/components/data-table/data-table`
- `@/components/data-table/data-table-filters`
- `@/components/data-table/data-table-pagination`
- `@/components/data-table/inline-edit-cell`
- `@/components/data-table/inline-edit-cell-wrapper`
- `@/components/data-table/resizable-draggable-header`
- `@/components/data-table/sort-menu`
- `@/components/data-table/status-cell-wrapper`
- `@/components/data-table/table-utils` (stringPredicate)
- `@/components/data-table/use-column-resize`
- `@/components/data-table/use-saved-views`
- `@/components/data-table/use-container-resize`
- `@/components/data-table/view-defaults` (BaseViewConfig type)
- `@/components/data-table/views-menu`

**Form Shell Components**:
- `@/components/forms/shell/optimistic-context` (useOptimistic)
- `@/components/forms/shell/selection/selection-store` (useSelectionStore)

**API Helpers**:
- `@/lib/api/client-fetch` (fetchResourcePageClient)
- `@/lib/next/search-params` (parseListParams, SPRecord)

#### Client Execution Timeline

```
1. StockAdjustmentsTableClient hydration
   ├─ useMemo(() => stockAdjustmentsViewConfig.buildColumns())
   │   └─ buildColumns() execution
   │       ├─ Creates 8 column definitions
   │       ├─ Calls makeActionsColumn() (client-only)
   │       └─ Returns ColumnDef[] array
   │   ~5-10ms (first render, includes JSX creation)
   └─ Render ResourceTableClient with config

2. ResourceTableClient hydration
   ├─ React hooks initialization
   │   ├─ useRouter, useSearchParams, usePathname
   │   ├─ useQueryClient (React Query)
   │   ├─ useOptimistic (context)
   │   ├─ useSelectionStore (Zustand)
   │   └─ useConfirmDialog
   │   ~2-5ms
   ├─ URL parsing (duplicate of SSR)
   │   ├─ parseListParams() re-executes
   │   └─ buildExtraQueryFromFilters()
   │   ~1-2ms
   ├─ React Query setup
   │   ├─ useQuery() with initialData from SSR
   │   └─ Query key computation
   │   ~1-2ms
   ├─ Column processing (RECOMPUTED PER RENDER)
   │   ├─ baseColumns = useMemo(() => config.columns)
   │   ├─ columnsWithHeaders = useMemo(() => map decorated headers)
   │   ├─ enhancedColumns = useMemo() (adds filters, inline edits)
   │   └─ selectionColumn = useMemo()
   │   ~10-20ms (if deps change)
   ├─ Table initialization
   │   ├─ useReactTable() hook
   │   ├─ Column resize hooks (useColumnResize, useContainerResize)
   │   ├─ Saved views hook (useSavedViews)
   │   └─ DnD sensors setup
   │   ~15-25ms
   ├─ Toolbar components (memoized but computed)
   │   ├─ ColumnsAndSortToolbar
   │   ├─ MoreFiltersSection
   │   └─ QuickFiltersToolbar
   │   ~5-10ms
   └─ DataTable render
       └─ TanStack Table render ~20-50ms (depends on row count)
```

**Estimated Client Hydration Time**: 60-120ms (excluding network time for any background fetches)

**Total First Load Time (SSR + Hydration)**: ~120-350ms + network time

---

## 2. Package Classification

### 2.1 SSR-Only Packages

These packages are only used during server-side rendering and are NOT sent to the client:

- `next` (server runtime)
- `server-only` (if used)
- `@supabase/ssr` (server-side Supabase client)
- Native Node.js APIs (fs, path, etc.)

### 2.2 Immediately Hydrated Packages

These packages are loaded and executed during initial client hydration (first paint):

**Core Libraries**:
- `react`, `react-dom` - **~45KB gzipped**
- `next/navigation` - **~15KB gzipped**
- `@tanstack/react-table` - **~80KB gzipped**
- `@tanstack/react-query` - **~50KB gzipped**
- `@dnd-kit/core` - **~25KB gzipped**
- `@dnd-kit/sortable` - **~15KB gzipped**

**UI Libraries**:
- `lucide-react` (icons) - **~35KB gzipped** (tree-shaken)
- `sonner` (toasts) - **~10KB gzipped**
- `zustand` - **~3KB gzipped**
- Radix UI primitives (multiple, ~200KB total, tree-shaken)
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-checkbox`
  - And others...

**Estimated Initial Bundle Size**: ~500-600KB gzipped (includes shared chunks)

### 2.3 Interaction-Only Packages (Can Be Deferred)

These packages/functions are only needed after user interaction:

**Column Resizing**:
- `use-column-resize.ts` hook
- `use-container-resize.ts` hook
- Resize handlers in `resizable-draggable-header.tsx`

**Saved Views**:
- `use-saved-views.ts` hook
- `ViewsMenu` component
- `save-view-dialog.tsx` component
- LocalStorage API calls

**Advanced Filtering**:
- `DataTableFilters` component (More Filters section)
- `filter-bar.tsx`
- Filter state management

**Inline Editing**:
- `inline-edit-cell.tsx`
- `inline-edit-cell-wrapper.tsx`
- `StatusCellWrapper` (if status editing is used)

**CSV Export**:
- `csv-export.ts` (exportCSV function)
- Only needed when Export button is clicked

**Bulk Selection Store**:
- `selection-store.ts` (Zustand)
- Only needed when user selects rows

**Column Reordering**:
- DnD sensors initialization (can be lazy)
- Column order state (can be deferred)

---

## 3. Performance Instrumentation Proposals

### 3.1 SSR Instrumentation

Add performance marks in `src/app/(main)/forms/stock-adjustments/page.tsx`:

```typescript
export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  if (typeof performance !== 'undefined') {
    performance.mark('stock-adjustments-ssr-start');
  }

  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize, filters } = parseListParams(sp, stockAdjustmentsFilterMeta, { defaultPage: 1, defaultPageSize: 10, max: 500 });

  if (typeof performance !== 'undefined') {
    performance.mark('stock-adjustments-ssr-params-parsed');
  }

  const extraQuery: Record<string, any> = { raw: "true" };
  const statusFilter = filters.status;
  if (statusFilter && statusFilter !== "ALL") {
    Object.assign(extraQuery, statusToQuery(statusFilter));
  }

  if (typeof performance !== 'undefined') {
    performance.mark('stock-adjustments-ssr-fetch-start');
  }

  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: config.apiEndpoint,
    page,
    pageSize,
    extraQuery,
  });

  if (typeof performance !== 'undefined') {
    performance.mark('stock-adjustments-ssr-fetch-end');
    performance.measure('stock-adjustments-ssr-fetch', 'stock-adjustments-ssr-fetch-start', 'stock-adjustments-ssr-fetch-end');
  }

  const rows = (domainRows ?? []).map(toRow);

  if (typeof performance !== 'undefined') {
    performance.mark('stock-adjustments-ssr-transform-end');
    performance.mark('stock-adjustments-ssr-end');
    performance.measure('stock-adjustments-ssr-total', 'stock-adjustments-ssr-start', 'stock-adjustments-ssr-end');
    performance.measure('stock-adjustments-ssr-params', 'stock-adjustments-ssr-start', 'stock-adjustments-ssr-params-parsed');
    performance.measure('stock-adjustments-ssr-transform', 'stock-adjustments-ssr-fetch-end', 'stock-adjustments-ssr-transform-end');
  }

  return (
    <PageShell>
      <StockAdjustmentsTableClient />
    </PageShell>
  );
}
```

**Logs to Capture**:
- `stock-adjustments-ssr-total`: Total SSR time
- `stock-adjustments-ssr-fetch`: API fetch duration
- `stock-adjustments-ssr-transform`: Data transformation time
- Row count, page size, filter status for context

### 3.2 Client Hydration Instrumentation

Add performance marks in `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx`:

```typescript
export function StockAdjustmentsTableClient({ initialRows, initialTotal, page, pageSize }: StockAdjustmentsTableClientProps) {
  React.useEffect(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('stock-adjustments-client-hydration-start');
    }
  }, []);

  const viewConfigWithColumns = useMemo<BaseViewConfig<StockAdjustmentRow> & { columns?: any[] }>(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('stock-adjustments-client-columns-build-start');
    }

    const config = {
      ...stockAdjustmentsViewConfig,
      columns: stockAdjustmentsViewConfig.buildColumns(),
    };
    delete (config as any).buildColumns;

    if (typeof performance !== 'undefined') {
      performance.mark('stock-adjustments-client-columns-build-end');
      performance.measure('stock-adjustments-client-columns-build', 'stock-adjustments-client-columns-build-start', 'stock-adjustments-client-columns-build-end');
    }

    return config;
  }, []);

  React.useEffect(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('stock-adjustments-client-hydration-end');
      performance.measure('stock-adjustments-client-hydration', 'stock-adjustments-client-hydration-start', 'stock-adjustments-client-hydration-end');
    }
  }, []);

  return <ResourceTableClient config={viewConfigWithColumns} ... />;
}
```

Add performance marks in `src/components/forms/resource-view/resource-table-client.tsx`:

```typescript
export default function ResourceTableClient<TRow extends { id: string }>({ config, initialRows, ... }: ResourceTableClientProps<TRow>) {
  React.useEffect(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('resource-table-client-init-start');
    }
  }, []);

  // ... existing code ...

  const baseColumns = React.useMemo<ColumnDef<TRow, unknown>[]>(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('resource-table-columns-process-start');
    }
    // ... column processing ...
    if (typeof performance !== 'undefined') {
      performance.mark('resource-table-columns-process-end');
      performance.measure('resource-table-columns-process', 'resource-table-columns-process-start', 'resource-table-columns-process-end');
    }
    return columns;
  }, [config]);

  const table = useReactTable<TRow>({ ... });

  React.useEffect(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('resource-table-client-init-end');
      performance.measure('resource-table-client-init', 'resource-table-client-init-start', 'resource-table-client-init-end');
    }
  }, []);

  // ... rest of component ...
}
```

**Logs to Capture**:
- `stock-adjustments-client-hydration`: Total client hydration time
- `stock-adjustments-client-columns-build`: Column definition generation
- `resource-table-client-init`: Table initialization time
- `resource-table-columns-process`: Column processing time
- Initial row count, column count for context

### 3.3 Measurement Collection

**Server-Side**: Log performance marks via Next.js logging or custom logger:

```typescript
// In page.tsx or middleware
if (typeof performance !== 'undefined') {
  const measures = performance.getEntriesByType('measure');
  console.log('[SSR Performance]', JSON.stringify(measures, null, 2));
}
```

**Client-Side**: Send to analytics or log to console:

```typescript
// In client component useEffect
React.useEffect(() => {
  if (typeof performance !== 'undefined') {
    const measures = performance.getEntriesByType('measure');
    console.log('[Client Performance]', JSON.stringify(measures, null, 2));
    
    // Optionally send to analytics
    // analytics.track('page_load_performance', { measures });
  }
}, []);
```

---

## 4. Bundle and Chunk Audit

### 4.1 Bundle Analysis Commands

**Next.js Bundle Analyzer**:

```bash
# Install analyzer
pnpm add -D @next/bundle-analyzer

# Add to next.config.mjs (temporarily)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

# Run analysis
ANALYZE=true pnpm build

# Output locations:
# - .next/analyze/client.html (browser bundle)
# - .next/analyze/server.html (server bundle)
```

**Webpack Bundle Analyzer** (alternative):

```bash
# Install
pnpm add -D webpack-bundle-analyzer

# Run Next.js build with analyzer
ANALYZE=true pnpm build

# Or use standalone analyzer
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

**Source Map Analysis**:

```bash
# Build with source maps
pnpm build

# Analyze chunk sizes
npx @next/bundle-analyzer .next

# Or use source-map-explorer
pnpm add -D source-map-explorer
source-map-explorer '.next/static/chunks/*.js' --html report.html
```

### 4.2 Expected Output Locations

After running `pnpm build` with analyzer:

1. **Client Bundle Report**: `.next/analyze/client.html`
   - Shows all client-side chunks
   - Identifies large dependencies
   - Tree-shaking effectiveness

2. **Server Bundle Report**: `.next/analyze/server.html`
   - Shows SSR-only code
   - Identifies unnecessary server imports

3. **Chunk Files**: `.next/static/chunks/`
   - Individual chunk files with sizes
   - Can identify code-splitting opportunities

### 4.3 Likely Heavy Chunks (By File Path)

**Expected Large Chunks**:

1. **TanStack Table** (`@tanstack/react-table`)
   - Location: `.next/static/chunks/node_modules_@tanstack_react-table_*.js`
   - Estimated: ~80KB gzipped
   - **Optimization**: Already code-split, but loaded on first paint

2. **DnD Kit** (`@dnd-kit/core` + `@dnd-kit/sortable`)
   - Location: `.next/static/chunks/node_modules_@dnd-kit_*.js`
   - Estimated: ~40KB gzipped combined
   - **Optimization**: Can be lazy-loaded (only needed for drag operations)

3. **React Query** (`@tanstack/react-query`)
   - Location: `.next/static/chunks/node_modules_@tanstack_react-query_*.js`
   - Estimated: ~50KB gzipped
   - **Optimization**: Already loaded on first paint (required for data fetching)

4. **Radix UI Primitives** (multiple packages)
   - Location: `.next/static/chunks/node_modules_@radix-ui_*.js`
   - Estimated: ~200KB total (tree-shaken)
   - **Optimization**: Already tree-shaken, but could lazy-load dialog components

5. **Data Table Components** (local code)
   - Location: `.next/static/chunks/src_components_data-table_*.js`
   - Estimated: ~50-100KB (depends on usage)
   - **Optimization**: Code-split interaction-only components

6. **Lucide Icons**
   - Location: `.next/static/chunks/node_modules_lucide-react_*.js`
   - Estimated: ~35KB (tree-shaken)
   - **Optimization**: Already tree-shaken, consider icon sprites for further reduction

---

## 5. Optimization Opportunities

### 5.1 Early Wins (Low Risk, High Impact)

| File Path | Change Description | Risk Level | Expected Gain |
|-----------|-------------------|------------|---------------|
| `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx` | **Stabilize column memoization**: Ensure `viewConfigWithColumns` has stable deps. Currently uses empty array `[]` which is correct, but verify `buildColumns()` is pure. | Low | 5-10ms per render |
| `src/components/forms/resource-view/resource-table-client.tsx` (line 245-252) | **Memoize `baseColumns` properly**: Currently checks `config.columns` but `config` object reference may change. Use deep comparison or extract `columns` to separate prop. | Medium | 10-20ms per render |
| `src/components/forms/resource-view/resource-table-client.tsx` (line 512-537) | **Memoize `columnsWithHeaders` with stable deps**: Currently depends on `columnOrder` which changes. Split into base columns memo (stable) and header decoration memo (depends on order). | Medium | 10-15ms per render |
| `src/components/forms/resource-view/resource-table-client.tsx` (line 540-619) | **Split `enhancedColumns` memoization**: Separate filter function assignment from inline edit wrapper assignment. Filter functions can be stable, inline edit wrappers depend on editing state. | Low | 5-10ms per render |
| `src/components/forms/resource-view/resource-table-client.tsx` (line 824-834) | **Lazy-load saved views hook**: `useSavedViews` loads localStorage and makes API calls. Defer until user opens Views menu. | Low | 5-10ms initial load, ~20KB bundle |
| `src/components/forms/resource-view/resource-table-client.tsx` (line 328-341) | **Lazy-load column resize hooks**: `useColumnResize` and `useContainerResize` only needed when user resizes. Load on first resize interaction. | Low | 3-5ms initial load, ~10KB bundle |
| `src/components/forms/resource-view/resource-table-client.tsx` (line 281) | **Lazy-load More Filters section**: `MoreFiltersSection` is memoized but computed on every render. Lazy-load component until `showMoreFilters` is true. | Low | 2-5ms per render |
| `src/components/data-table/csv-export.ts` | **Lazy-load CSV export**: `exportCSV` function only needed when Export button clicked. Use dynamic import in click handler. | Low | ~5KB bundle, 1-2ms initial load |

### 5.2 Medium-Term Optimizations (Require Testing)

| File Path | Change Description | Risk Level | Expected Gain |
|-----------|-------------------|------------|---------------|
| `src/components/forms/resource-view/resource-table-client.tsx` | **Code-split DnD Kit**: Lazy-load `@dnd-kit/core` and `@dnd-kit/sortable` until user attempts to drag a column. Use React.lazy() or dynamic import. | Medium | ~40KB bundle, 5-10ms initial load |
| `src/components/forms/resource-view/resource-table-client.tsx` (line 54-55) | **Lazy-load inline edit components**: `InlineEditCellWrapper` and `StatusCellWrapper` only needed when editing. Load on first edit interaction. | Medium | ~15KB bundle, 3-5ms initial load |
| `src/components/ui/dialog` | **Lazy-load Dialog components**: Save View dialog only needed when Save View button clicked. Use React.lazy() for DialogContent, DialogHeader, etc. | Low | ~20KB bundle, 2-3ms initial load |
| `src/components/forms/resource-view/resource-table-client.tsx` (line 202-226) | **Optimize React Query setup**: `useQuery` runs immediately but uses `initialData`. Consider using `enabled: false` until user interacts, or reduce `staleTime` for better caching. | Low | Network request savings, faster perceived load |

### 5.3 Re-computation Pattern Fixes

**Issue**: Column generation runs on every render due to unstable memoization.

**Current Code** (line 31-39 in `stock-adjustments-table-client.tsx`):
```typescript
const viewConfigWithColumns = useMemo<BaseViewConfig<StockAdjustmentRow> & { columns?: any[] }>(() => {
  const config = {
    ...stockAdjustmentsViewConfig,
    columns: stockAdjustmentsViewConfig.buildColumns(),
  };
  delete (config as any).buildColumns;
  return config;
}, []); // Empty deps - good, but buildColumns() may not be pure
```

**Fix**: Ensure `buildColumns()` is pure (no side effects, same input = same output):
- Move `buildColumns` outside component if it uses closures
- Use `React.useMemo` inside `buildColumns` for any dynamic values
- Consider pre-computing columns in config file (if no dynamic dependencies)

**Issue**: `columnsWithHeaders` recomputes when `columnOrder` changes, but header decoration is independent of order.

**Fix**: Split memoization:
```typescript
// Base columns (stable)
const baseColumns = useMemo(() => config.columns, [config.columns]);

// Header decoration (depends on columnOrder)
const columnsWithHeaders = useMemo(() => {
  return baseColumns.map((col) => {
    // Decorate header based on columnOrder
    return { ...col, header: decorateHeader(col, columnOrder) };
  });
}, [baseColumns, columnOrder]);
```

---

## 6. Dependency Graph Summary

### Top 10 Heaviest Modules (Estimated)

Based on package.json and import analysis:

1. **@tanstack/react-table** - ~80KB gzipped
   - Used in: `resource-table-client.tsx`, `data-table.tsx`
   - Load timing: Immediate (first paint)

2. **@tanstack/react-query** - ~50KB gzipped
   - Used in: `resource-table-client.tsx`
   - Load timing: Immediate (first paint)

3. **Radix UI Dialog** - ~30KB gzipped
   - Used in: `resource-table-client.tsx` (Save View dialog)
   - Load timing: Immediate (can be deferred)

4. **Radix UI Dropdown Menu** - ~25KB gzipped
   - Used in: Toolbar buttons (Columns, Sort, Views)
   - Load timing: Immediate

5. **@dnd-kit/core** - ~25KB gzipped
   - Used in: `resource-table-client.tsx`, `data-table.tsx`
   - Load timing: Immediate (can be deferred)

6. **@dnd-kit/sortable** - ~15KB gzipped
   - Used in: Column reordering
   - Load timing: Immediate (can be deferred)

7. **lucide-react** (tree-shaken) - ~35KB gzipped
   - Used in: Icons throughout
   - Load timing: Immediate

8. **sonner** (toast) - ~10KB gzipped
   - Used in: Toast notifications
   - Load timing: Immediate

9. **zustand** - ~3KB gzipped
   - Used in: Selection store
   - Load timing: Immediate

10. **Local data-table components** - ~50-100KB (estimated)
    - Used in: Table rendering, filters, pagination
    - Load timing: Immediate

**Total Estimated Initial Bundle**: ~500-600KB gzipped (includes shared Next.js chunks)

---

## 7. "Do Next" Checklist

### Phase 1: Measurement (Before Changes)

- [ ] Add performance instrumentation to SSR path (page.tsx)
- [ ] Add performance instrumentation to client hydration (stock-adjustments-table-client.tsx, resource-table-client.tsx)
- [ ] Run bundle analyzer: `ANALYZE=true pnpm build`
- [ ] Capture baseline metrics:
  - SSR time (server logs)
  - Client hydration time (browser console)
  - First Contentful Paint (FCP)
  - Largest Contentful Paint (LCP)
  - Time to Interactive (TTI)
- [ ] Document baseline numbers in a follow-up report

### Phase 2: Low-Risk Optimizations

- [ ] Fix column memoization stability (stock-adjustments-table-client.tsx)
- [ ] Split `columnsWithHeaders` memoization (resource-table-client.tsx)
- [ ] Lazy-load saved views hook (useSavedViews)
- [ ] Lazy-load column resize hooks (useColumnResize, useContainerResize)
- [ ] Lazy-load More Filters section component
- [ ] Lazy-load CSV export function
- [ ] Verify all changes pass tests: `pnpm test`
- [ ] Verify production build: `pnpm build`
- [ ] Re-measure and compare to baseline

### Phase 3: Medium-Risk Optimizations

- [ ] Code-split DnD Kit (lazy-load on first drag attempt)
- [ ] Lazy-load inline edit components (InlineEditCellWrapper, StatusCellWrapper)
- [ ] Lazy-load Dialog components (Save View dialog)
- [ ] Optimize React Query configuration (reduce unnecessary fetches)
- [ ] Verify all changes pass tests: `pnpm test`
- [ ] Verify production build: `pnpm build`
- [ ] Run E2E smoke tests: `pnpm test:e2e:smoke`
- [ ] Re-measure and compare to baseline

### Phase 4: Bundle Analysis & Code-Splitting

- [ ] Analyze bundle report for additional code-splitting opportunities
- [ ] Identify duplicate dependencies (if any)
- [ ] Consider dynamic imports for route-level code-splitting
- [ ] Verify bundle size reduction in analyzer
- [ ] Re-measure and compare to baseline

### Phase 5: Documentation & Cleanup

- [ ] Update this report with actual measured improvements
- [ ] Document optimization patterns for other screens
- [ ] Remove temporary performance instrumentation (or make it configurable)
- [ ] Create PR with optimization summary

---

## 8. How to Measure Again After Changes

### 8.1 Local Development

**Build and analyze**:
```bash
# Build with analyzer
ANALYZE=true pnpm build

# Start production server
pnpm start

# Open browser DevTools → Performance tab
# Record page load for /forms/stock-adjustments
# Check Console for performance marks
```

**Key Metrics to Capture**:
- Performance marks (from instrumentation)
- Network tab: Total bundle size, chunk sizes
- Lighthouse: Performance score, FCP, LCP, TTI
- React DevTools: Component render times

### 8.2 Production Measurement

**Vercel Preview**:
- Deploy PR to Vercel preview
- Use Vercel Analytics for real user metrics
- Check bundle size in Vercel build logs

**Web Vitals**:
- Use `web-vitals` package (already installed) to track:
  - FCP (First Contentful Paint)
  - LCP (Largest Contentful Paint)
  - FID (First Input Delay)
  - CLS (Cumulative Layout Shift)
  - TTFB (Time to First Byte)

### 8.3 Comparison

**Before/After Metrics**:
- SSR time: Compare server logs
- Client hydration: Compare browser console marks
- Bundle size: Compare `.next/analyze` reports
- Lighthouse scores: Compare performance audits

**Expected Improvements** (after Phase 2 optimizations):
- Initial bundle: -30-50KB (lazy-loaded components)
- Client hydration: -20-40ms (fewer hooks on mount)
- Render time: -10-20ms per render (stable memoization)

---

## Appendix: File Reference

### Key Files Analyzed

**SSR Path**:
- `src/app/(main)/forms/stock-adjustments/page.tsx`
- `src/lib/data/resource-fetch.ts`
- `src/app/(main)/forms/stock-adjustments/to-row.ts`
- `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx`

**Client Path**:
- `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx`
- `src/components/forms/resource-view/resource-table-client.tsx`
- `src/components/data-table/data-table.tsx`
- `src/components/forms/shell/page-shell.tsx`

**API Path**:
- `src/app/api/[resource]/route.ts`
- `src/lib/api/handle-list.ts`

**Config & Types**:
- `src/components/data-table/view-defaults.tsx`
- `src/components/forms/shell/selection/selection-store.ts`
- `package.json` (dependencies)

---

**Report Status**: Complete  
**Next Steps**: Begin Phase 1 (Measurement) from checklist above  
**Owner**: Development Team  
**Review Date**: After Phase 2 optimizations completed

