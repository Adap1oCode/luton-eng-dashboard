# CRUD Screen Audit Report

**Date**: 2025-01-31  
**Screens Audited**: `/forms/stock-adjustments`, `/forms/tally-cards`  
**Scope**: Create, Read, Update, Delete (end-to-end)  
**Objective**: Identify smallest set of changes to cut unnecessary complexity and render/data overhead without changing behavior.

---

## 1) Runtime Trace

### Stock Adjustments Screen

#### Route Entry → Server SSR

**File**: `src/app/(main)/forms/stock-adjustments/page.tsx` (lines 21-61)  
**Type**: Server Component (async)  
**Entry**: Next.js route `/forms/stock-adjustments` with `searchParams`

**Input → Output Data Shape**:
- **Input**: `searchParams` (Promise<SPRecord> | SPRecord)
  - `page`: string (1-based, default 1)
  - `pageSize`: string (default 50, max 500)
  - `status`: "ALL" | "ACTIVE" | "ZERO" | "QUANTITY_UNDEFINED"
- **Transformations**:
  1. `resolveSearchParams()` → unwraps Promise (line 22)
  2. `parseListParams(sp, stockAdjustmentsFilterMeta, {defaultPage: 1, defaultPageSize: 50, max: 500})` → `{page: number, pageSize: number}` (1-based) (line 23)
  3. Status filter → `extraQuery` object (lines 26-30)
     - ACTIVE → `{qty_gt: 0, qty_not_null: true}`
     - ZERO → `{qty_eq: 0}`
     - QUANTITY_UNDEFINED → `{qty_is_null_or_empty: true}`
     - ALL → no filter
  4. `fetchResourcePage()` → calls `/api/v_tcm_user_tally_card_entries?page=1&pageSize=50&raw=true&qty_gt=0...` (lines 32-37)
  5. `toRow()` (lines 39) → transforms API response:
     - Maps: `id`, `full_name`, `warehouse`, `tally_card_number`, `qty`, `location`, `note`, `updated_at`, `updated_at_pretty`
     - Computes: `is_active = qty > 0`
     - Type coercion: all strings converted via `String()`
- **Output**: `{rows: StockAdjustmentRow[], total: number}`

**Pagination**: 1-based throughout server (`page: 1` = first page)  
**Caching**: `fetchResourcePage()` uses `cache: "force-cache"` + `next: { revalidate: 300 }` (5 min) + cookie forwarding  
**⚠️ ISSUE**: Should use `cache: "no-store"` per audit requirements

---

#### SSR → API

**File**: `src/lib/data/resource-fetch.ts` (lines 10-69)  
**Type**: Server-side fetch utility  
**Input**: `{endpoint, page, pageSize, extraQuery}`

**Transformations**:
1. `getServerBaseUrl()` → absolute URL (line 12)
2. `getForwardedCookieHeader()` → cookie header for RLS (line 13)
3. Build query string with `page`, `pageSize`, `extraQuery` (lines 15-23)
4. Fetch with `cache: "force-cache"` + `revalidate: 300` (lines 31-37)
   - **⚠️ ISSUE**: Should be `cache: "no-store"` for RLS correctness
5. Parse response: `payload.rows ?? payload.data` → rows, `payload.total ?? payload.count` → total (lines 64-66)

**Output**: `{rows: T[], total: number}`

---

#### API Handler

**File**: `src/lib/api/handle-list.ts` (lines 46-139)  
**Type**: Server Route Handler  
**Input**: GET `/api/v_tcm_user_tally_card_entries?page=1&pageSize=50&raw=true&qty_gt=0...`

**Transformations**:
1. `parseListQuery(url)` → extracts `page`, `pageSize`, `q`, `activeOnly`, `raw`, plus custom filters (lines 54-91)
2. `provider.list({q, page, pageSize, activeOnly, filters})` → queries Supabase view `v_tcm_user_tally_card_entries` (line 92)
3. Select fields (from provider config): All columns from view (id, user_id, full_name, role_family, tally_card_number, qty, location, note, reason_code, multi_location, updated_at, updated_at_pretty, warehouse_id, warehouse)
   - **⚠️ ISSUE**: Wide payload - selects all columns, not just displayed ones
4. If `raw=false` and `entry.toRow` exists → transforms via `entry.toRow()` (line 112) — **NOT USED** (raw=true)
5. Response shape: `{rows: any[], total: number, page: number, pageSize: number, resource: string, raw: boolean}`

**Pagination**: 1-based (`page: 1` = first page)  
**DB Query**: Supabase provider applies warehouse scoping, ownership scoping, and filters via WHERE clauses  
**Projection**: `select: "id, user_id, full_name, role_family, tally_card_number, qty, location, note, reason_code, multi_location, updated_at, updated_at_pretty, warehouse_id, warehouse"` (from `v_tcm_user_tally_card_entries.config.ts` line 23-24)

---

#### Client Island Entry

**File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx` (lines 23-52)  
**Type**: Client Component  
**Input Props**: `initialRows`, `initialTotal`, `page`, `pageSize`

**Transformations**:
1. `useMemo(() => buildColumns())` → materializes columns in client context (lines 31-41)
   - Calls `stockAdjustmentsViewConfig.buildColumns()` which calls `buildColumns()` function
   - **⚠️ ISSUE**: Function reference `buildColumns: () => buildColumns()` creates new function on each access, but columns are actually memoized at module level
2. Passes materialized config to `ResourceTableClient` (lines 44-50)

---

#### ResourceTableClient

**File**: `src/components/forms/resource-view/resource-table-client.tsx` (lines 96-1977)  
**Type**: Client Component  
**Input**: `config`, `initialRows`, `initialTotal`, `page`, `pageSize`

**Transformations**:
1. Extract stable config properties via `useMemo` (lines 127-150)
2. `baseColumns = useMemo(() => config.columns ?? config.buildColumns(true) ?? [], [configColumns, configBuildColumns])` (lines 140-147)
   - Prefers `config.columns` (if SSR-materialized)
   - Falls back to `config.buildColumns(true)` if function exists
3. `filteredRows = useMemo(() => initialRows.filter(!isOptimisticallyDeleted), [initialRows, isOptimisticallyDeleted])` (lines 122-124)
4. `pagination = useState({pageIndex: page - 1, pageSize})` (lines 157-160) — **CONVERSION: 1-based → 0-based**
5. `columnsWithHeaders = useMemo(() => baseColumns.map(decorateHeader), [baseColumns, columnOrder])` (lines 313-338)
6. TanStack Table initialization with `filteredRows`, `columnsWithHeaders`
7. **URL SYNC LOOP** (lines 1084-1106):
   ```typescript
   useEffect(() => {
     const nextPage = pagination.pageIndex + 1;  // 0-based → 1-based
     const curPage = Number(search.get("page") ?? String(page));
     if (curPage === nextPage && curSize === finalSize && !shouldUpdateSize) return;
     router.replace(`${pathname}?${sp.toString()}`);  // Updates URL
   }, [pagination.pageIndex, pagination.pageSize, pathname, router, search, page, pageSize]);
   ```
   - **DUPLICATE CONVERSION**: Converts 0-based → 1-based every render if URL changes
8. **SSR SYNC** (lines 1108-1114):
   ```typescript
   useEffect(() => {
     setPagination((prev) => {
       const next = { pageIndex: Math.max(0, page - 1), pageSize };  // 1-based → 0-based
       return prev.pageIndex === next.pageIndex && prev.pageSize === next.pageSize ? prev : next;
     });
   }, [page, pageSize]);
   ```
   - **DUPLICATE CONVERSION**: Converts 1-based → 0-based when SSR props change

**Pagination Conversions**:
- Server: 1-based (`page: 1`)
- URL: 1-based (`?page=1`)
- Table state: 0-based (`pageIndex: 0`)
- Conversions happen at: (1) table init (line 158), (2) URL sync effect (line 1085), (3) SSR sync effect (line 1111)

---

### Tally Cards Screen

#### Route Entry → Server SSR

**File**: `src/app/(main)/forms/tally-cards/page.tsx` (lines 21-61)  
**Type**: Server Component (async)  
**Entry**: Next.js route `/forms/tally-cards` with `searchParams`

**Input → Output Data Shape**:
- **Input**: `searchParams` (Promise<SPRecord> | SPRecord)
  - `page`: string (1-based, default 1)
  - `pageSize`: string (default 50, max 500)
  - `status`: "ALL" | "ACTIVE" | "INACTIVE"
- **Transformations**:
  1. `resolveSearchParams()` → unwraps Promise (line 22)
  2. `parseListParams(sp, tallyCardsFilterMeta, {defaultPage: 1, defaultPageSize: 50, max: 500})` → `{page: number, pageSize: number}` (1-based) (line 23)
  3. Status filter → `extraQuery` object (lines 26-30)
     - ACTIVE → `{is_active: true}`
     - INACTIVE → `{is_active: false}`
     - ALL → no filter
  4. `fetchResourcePage()` → calls `/api/v_tcm_tally_cards_current?page=1&pageSize=50&raw=true&is_active=true...` (lines 32-37)
  5. `toRow()` (line 39) → transforms API response:
     - Maps: `id`, `card_uid`, `warehouse_id`, `warehouse_name`, `tally_card_number`, `item_number`, `note`, `is_active`, `created_at`, `snapshot_at`, `updated_at`, `updated_at_pretty`
     - Type coercion: `item_number` converted to Number if not null
- **Output**: `{rows: TallyCardRow[], total: number}`

**Pagination**: 1-based throughout server (`page: 1` = first page)  
**Caching**: Same issue as stock-adjustments - uses `force-cache` instead of `no-store`

---

#### API Handler (Tally Cards)

**File**: `src/lib/api/handle-list.ts` (same as stock-adjustments)  
**Input**: GET `/api/v_tcm_tally_cards_current?page=1&pageSize=50&raw=true&is_active=true...`

**Projection**: `select: "id, card_uid, tally_card_number, warehouse_id, warehouse_name, item_number, note, is_active, created_at, snapshot_at, updated_at, updated_at_pretty"` (from `v_tcm_tally_cards_current.config.ts` line 8-9)

**⚠️ ISSUE**: Wide payload - selects all columns, not just displayed ones

---

#### Client Island Entry (Tally Cards)

**File**: `src/app/(main)/forms/tally-cards/tally-cards-table-client.tsx` (lines 23-52)  
Same pattern as stock-adjustments - materializes columns in client context

---

### Create Flow

#### Stock Adjustments Create

**File**: `src/app/(main)/forms/stock-adjustments/new/page.tsx` (lines 13-75)  
**Entry**: `/forms/stock-adjustments/new`

**Flow**:
1. `ensureSections(stockAdjustmentCreateConfig)` → normalizes config (line 14)
2. `buildDefaults()` → builds form defaults (line 15)
3. `extractOptionsKeys()` → extracts option keys (line 30)
4. `loadOptions(optionsKeys)` → loads options server-side (line 31)
5. Renders `FormShell` + `StockAdjustmentFormWrapper` (lines 41-73)
6. Submit → `POST /api/forms/stock-adjustments` (line 24)
7. Success → redirects to `/forms/stock-adjustments` (handled by form component)

**API**: `src/app/api/forms/stock-adjustments/route.ts` (lines 21-85)
- Creates parent entry via provider (line 39)
- Creates child locations if `multi_location` is true (lines 42-59)
- Returns created record (line 68)

---

#### Tally Cards Create

**File**: `src/app/(main)/forms/tally-cards/new/page.tsx` (lines 13-68)  
**Entry**: `/forms/tally-cards/new`

**Flow**: Similar to stock-adjustments, uses `FormIsland` directly (line 59)

---

### Update Flow

#### Stock Adjustments Edit

**File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx` (lines 24-241)  
**Entry**: `/forms/stock-adjustments/[id]/edit`

**Flow**:
1. Finds latest entry_id for tally_card_number (lines 34-62) - **⚠️ N+1 potential**: Multiple queries to find latest
2. `getRecordForEdit()` → fetches record from `/api/tcm_user_tally_card_entries/{id}` (line 66)
3. Loads locations server-side if `multi_location` is true (lines 114-175) - **⚠️ N+1**: Multiple queries to find locations
4. Renders `ResourceFormSSRPage` + `EditPageClient` (lines 208-239)
5. Submit → `POST /api/stock-adjustments/{id}/actions/patch-scd2` (line 83)
6. Success → redirects to `/forms/stock-adjustments` (handled by form component)

**API**: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts` (lines 26-144)
- Calls RPC function `fn_user_entry_patch_scd2` (line 56)
- Fetches enriched row from view (lines 114-118)
- Fetches child locations if `multi_location` is true (lines 127-141)

---

#### Tally Cards Edit

**File**: `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx` (lines 21-96)  
**Entry**: `/forms/tally-cards/[id]/edit`

**Flow**: Simpler than stock-adjustments - no location handling
- `getRecordForEdit()` → fetches record (line 29)
- Submit → `POST /api/tally-cards/{id}/actions/patch-scd2` (line 46)

**API**: `src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts` (lines 15-52)
- Calls RPC function `fn_tally_card_patch_scd2` (line 32)

---

### Delete Flow

#### Row Delete

**File**: `src/components/forms/resource-view/resource-table-client.tsx` (lines 1018-1051)  
**Type**: Client-side handler

**Flow**:
1. User clicks delete button in actions column
2. Confirmation dialog (lines 1019-1023)
3. Optimistic update: `markAsDeleted([rowId])` (line 1027)
4. `DELETE /api/{resourceKey}/{rowId}` (line 1029)
5. On success: `clearOptimisticState()` + invalidate React Query cache (lines 1033-1037)
6. On error: revert optimistic state (lines 1039-1047)

**API**: `src/lib/api/handle-item.ts` (lines 118-163)
- Soft delete if `activeFlag` configured (lines 127-152)
- Hard delete fallback (lines 155-158)

---

#### Bulk Delete

**File**: `src/app/api/[resource]/bulk/route.ts` (lines 14-87)  
**Type**: Server Route Handler

**Flow**:
1. Receives `{ids: string[]}` in body (line 23)
2. Soft delete if `activeFlag` configured (lines 34-59)
3. Hard delete fallback (lines 62-75)

---

## 2) Dependency Map

### Modules and Relationships

```
/forms/stock-adjustments (route)
  ├── page.tsx (SSR)
  │   ├── fetchResourcePage (lib/data/resource-fetch.ts)
  │   │   ├── getServerBaseUrl (lib/ssr/http.ts)
  │   │   ├── getForwardedCookieHeader (lib/ssr/http.ts)
  │   │   └── fetch → /api/v_tcm_user_tally_card_entries
  │   ├── toRow (local to-row.ts)
  │   └── StockAdjustmentsTableClient (client island)
  │       ├── stockAdjustmentsViewConfig (stock-adjustments.config.tsx)
  │       │   ├── buildColumns() (function, creates new function ref each access)
  │       │   └── statusToQuery() (filter mapping)
  │       └── ResourceTableClient (shared)
  │           ├── parseListParams (lib/next/search-params.ts) - DUPLICATE parsing
  │           ├── fetchResourcePageClient (lib/api/client-fetch.ts) - DUPLICATE fetch
  │           └── TanStack Table (pagination conversion 1-based ↔ 0-based)
  │
  ├── new/page.tsx (Create)
  │   ├── loadOptions (lib/forms/load-options.ts)
  │   └── StockAdjustmentFormWrapper (local component)
  │
  └── [id]/edit/page.tsx (Update)
      ├── getRecordForEdit (lib/forms/get-record-for-edit.ts)
      │   └── serverFetchJson → /api/tcm_user_tally_card_entries/{id}
      └── EditPageClient (local component)

/api/v_tcm_user_tally_card_entries (API route)
  └── handle-list.ts
      ├── resolveResource (lib/api/resolve-resource.ts)
      │   └── v_tcm_user_tally_card_entries.config.ts
      │       └── select: "id, user_id, full_name, role_family, tally_card_number, qty, location, note, reason_code, multi_location, updated_at, updated_at_pretty, warehouse_id, warehouse"
      ├── parseListQuery (lib/http/list-params.ts)
      └── createSupabaseServerProvider (lib/supabase/factory.ts)
          └── provider.list() → Supabase query
```

### Unused/Duplicate Code

1. **Duplicate Filter Mapping**: `statusToQuery()` exists in both:
   - `stock-adjustments.config.tsx` (line 63) - used in SSR
   - `stock-adjustments.config.tsx` (line 215) - used in client via `quickFilters[].toQueryParam`
   - Same function, but called from different contexts

2. **Duplicate Pagination Parsing**: `parseListParams()` runs in:
   - SSR: `page.tsx` (line 23)
   - Client: `ResourceTableClient` (line 198) - parses same URL params again

3. **Duplicate Fetch**: Data fetched in:
   - SSR: `fetchResourcePage()` in `page.tsx`
   - Client: `fetchResourcePageClient()` in `ResourceTableClient` (via React Query)
   - Client fetch happens even though SSR already fetched

4. **Unused toRow in API**: API handler has `entry.toRow` check (line 111), but `raw=true` is always passed, so transformation never happens

### Architecture Deviations

Both screens follow the shared "View All" architecture (SSR page + client island + API) correctly. No major deviations.

---

## 3) Transformation Audit

| Location | Transformation | Type | Action | Rationale |
|----------|---------------|------|--------|-----------|
| `src/app/(main)/forms/stock-adjustments/to-row.ts:7-20` | `toRow(d: any): StockAdjustmentRow` | Domain mapping | **keep** | Shared between server and client, ensures type consistency |
| `src/app/(main)/forms/tally-cards/to-row.ts:7-22` | `toRow(d: any): TallyCardRow` | Domain mapping | **keep** | Shared between server and client, ensures type consistency |
| `src/app/(main)/forms/stock-adjustments/page.tsx:39` | `domainRows.map(toRow)` | Server-side transform | **keep** | Needed to convert API response to row type |
| `src/app/(main)/forms/tally-cards/page.tsx:39` | `domainRows.map(toRow)` | Server-side transform | **keep** | Needed to convert API response to row type |
| `src/lib/api/handle-list.ts:111-112` | `rows.map(entry.toRow)` | API transform | **remove** | Never used (raw=true always passed) |
| `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx:63-68` | `statusToQuery(status: string)` | Filter mapping | **keep** | Shared function, used in both SSR and client |
| `src/app/(main)/forms/tally-cards/tally-cards.config.tsx:65-69` | `statusToQuery(status: string)` | Filter mapping | **keep** | Shared function, used in both SSR and client |
| `src/components/forms/resource-view/resource-table-client.tsx:1111` | `pageIndex: Math.max(0, page - 1)` | Pagination conversion | **inline** | 1-based → 0-based conversion, happens in multiple places |
| `src/components/forms/resource-view/resource-table-client.tsx:1085` | `pagination.pageIndex + 1` | Pagination conversion | **inline** | 0-based → 1-based conversion, happens in multiple places |
| `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx:34` | `buildColumns()` | Column materialization | **keep** | Needed in client context (makeActionsColumn is client-only) |
| `src/app/(main)/forms/tally-cards/tally-cards-table-client.tsx:34` | `buildColumns()` | Column materialization | **keep** | Needed in client context (makeActionsColumn is client-only) |
| `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx:233` | `buildColumns: () => buildColumns()` | Function wrapper | **inline** | Creates new function reference on each access, should be stable |
| `src/app/(main)/forms/tally-cards/tally-cards.config.tsx:256` | `buildColumns: () => buildColumns()` | Function wrapper | **inline** | Creates new function reference on each access, should be stable |
| `src/components/forms/resource-view/resource-list-client.tsx:108` | `JSON.parse(saved)` | localStorage parse | **keep** | Needed for column width persistence |
| `src/components/forms/resource-view/resource-list-client.tsx:125` | `JSON.stringify(widths)` | localStorage stringify | **keep** | Needed for column width persistence |

---

## 4) Payload & Query Review

### Stock Adjustments

**Columns Displayed** (from `buildColumns()`):
- `id` (hidden, routing only)
- `tally_card_number`
- `warehouse`
- `full_name`
- `qty`
- `location`
- `note` (not displayed, but in row type)
- `updated_at_pretty`
- Actions column

**API Response Columns** (from `v_tcm_user_tally_card_entries.config.ts`):
- `id, user_id, full_name, role_family, tally_card_number, qty, location, note, reason_code, multi_location, updated_at, updated_at_pretty, warehouse_id, warehouse`

**Unused Columns in Response**:
- `user_id` - not displayed
- `role_family` - not displayed
- `reason_code` - not displayed
- `multi_location` - not displayed
- `warehouse_id` - not displayed (only `warehouse` is used)
- `updated_at` - not displayed (only `updated_at_pretty` is used)

**Minimal Projection Recommendation**:
```typescript
select: "id, full_name, warehouse, tally_card_number, qty, location, note, updated_at_pretty"
```
**Estimated Payload Reduction**: ~40% (removing 6 unused columns)

---

### Tally Cards

**Columns Displayed** (from `buildColumns()`):
- `id` (hidden, routing only)
- `tally_card_number`
- `warehouse_id`
- `warehouse_name`
- `item_number`
- `note`
- `is_active`
- `snapshot_at` (or `created_at` fallback)
- `updated_at_pretty`
- Actions column

**API Response Columns** (from `v_tcm_tally_cards_current.config.ts`):
- `id, card_uid, tally_card_number, warehouse_id, warehouse_name, item_number, note, is_active, created_at, snapshot_at, updated_at, updated_at_pretty`

**Unused Columns in Response**:
- `card_uid` - not displayed
- `created_at` - not displayed (only used as fallback for `snapshot_at`)
- `updated_at` - not displayed (only `updated_at_pretty` is used)

**Minimal Projection Recommendation**:
```typescript
select: "id, tally_card_number, warehouse_id, warehouse_name, item_number, note, is_active, snapshot_at, updated_at_pretty"
```
**Estimated Payload Reduction**: ~25% (removing 3 unused columns)

---

### Joins/N+1 Issues

1. **Stock Adjustments Edit Page** (lines 34-175 in `[id]/edit/page.tsx`):
   - Query 1: Get `tally_card_number` for entry (line 39-43)
   - Query 2: Find latest entry_id (line 47-53)
   - Query 3: Get locations for latest entry (line 122-126)
   - Query 4-N: If no locations found, queries each entry_id until locations found (lines 130-161)
   - **⚠️ N+1**: Up to N+3 queries where N = number of entries for tally_card_number

2. **Stock Adjustments Patch-SCD2** (lines 114-141 in `patch-scd2/route.ts`):
   - Query 1: Fetch enriched row from view (line 114-118)
   - Query 2: Fetch child locations if `multi_location` is true (line 128-132)
   - **⚠️ N+1**: 2 queries per update

3. **No N+1 in List Queries**: List endpoints use single query with proper joins in views.

---

## 5) Hotspots Ranked

| File:Line | Issue | Cost | Minimal Fix (Tier) |
|-----------|-------|------|-------------------|
| `src/lib/data/resource-fetch.ts:33` | Uses `cache: "force-cache"` instead of `no-store` | High (RLS correctness risk) | Change to `cache: "no-store"` (Low, ~2 LOC) |
| `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:34-175` | N+1 queries to find latest entry and locations | High (network latency) | Consolidate into single query or RPC (High, ~40 LOC) |
| `src/components/forms/resource-view/resource-table-client.tsx:1085,1111` | Double pagination conversion (1-based ↔ 0-based) | Medium (render churn) | Extract to helper, use once (Medium, ~15 LOC) |
| `src/lib/api/handle-list.ts:111-112` | Unused `toRow` transform (raw=true always) | Low (dead code) | Remove unused branch (Low, ~3 LOC) |
| `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx:233` | Unstable `buildColumns` function reference | Medium (memo invalidation) | Use stable reference (Low, ~2 LOC) |
| `src/app/(main)/forms/tally-cards/tally-cards.config.tsx:256` | Unstable `buildColumns` function reference | Medium (memo invalidation) | Use stable reference (Low, ~2 LOC) |
| `src/components/forms/resource-view/resource-table-client.tsx:198` | Duplicate `parseListParams` in client (already parsed in SSR) | Low (CPU waste) | Pass parsed params as props (Medium, ~20 LOC) |
| `src/components/forms/resource-view/resource-table-client.tsx:154-185` | React Query refetch even though SSR already fetched | Medium (network waste) | Use SSR data only, refetch on URL change (Medium, ~25 LOC) |
| `v_tcm_user_tally_card_entries.config.ts:23-24` | Wide payload (all columns vs displayed) | Medium (network payload) | Project only displayed columns (Medium, ~10 LOC) |
| `v_tcm_tally_cards_current.config.ts:8-9` | Wide payload (all columns vs displayed) | Medium (network payload) | Project only displayed columns (Medium, ~10 LOC) |
| `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx:143` | No `prefetch` on edit link | Low (UX) | Add `prefetch` to Link (Low, ~1 LOC) |
| `src/app/(main)/forms/tally-cards/tally-cards.config.tsx:146` | No `prefetch` on edit link | Low (UX) | Add `prefetch` to Link (Low, ~1 LOC) |
| `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts:127-141` | N+1: Fetches locations separately after RPC | Medium (network latency) | Include locations in RPC response or single query (High, ~30 LOC) |

---

## 6) 80/20 Fix Plan

### Low Changes (≤10 lines, single file, no new imports, no new components)

1. **Fix SSR cache mode to no-store** (2 LOC)
   - File: `src/lib/data/resource-fetch.ts:33`
   - Change `cache: "force-cache"` to `cache: "no-store"`
   - Impact: Ensures RLS correctness, prevents stale data
   - Risk: Low (correct behavior)
   - Complexity: Low
   - Why safe: Audit doc requires no-store, current behavior is incorrect

2. **Remove unused toRow branch in API handler** (3 LOC)
   - File: `src/lib/api/handle-list.ts:111-112`
   - Remove `if (!raw && typeof entry.toRow === "function")` branch
   - Impact: Removes dead code
   - Risk: Low (code path never executed)
   - Complexity: Low
   - Why safe: `raw=true` is always passed, branch never executes

3. **Stabilize buildColumns reference in stock-adjustments** (2 LOC)
   - File: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx:233`
   - Change `buildColumns: () => buildColumns()` to `buildColumns`
   - Impact: Prevents memo invalidation
   - Risk: Low (function is pure)
   - Complexity: Low
   - Why safe: `buildColumns` is already a function, no need to wrap

4. **Stabilize buildColumns reference in tally-cards** (2 LOC)
   - File: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx:256`
   - Change `buildColumns: () => buildColumns()` to `buildColumns`
   - Impact: Prevents memo invalidation
   - Risk: Low (function is pure)
   - Complexity: Low
   - Why safe: `buildColumns` is already a function, no need to wrap

5. **Add prefetch to stock-adjustments edit link** (1 LOC)
   - File: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx:143`
   - Add `prefetch` prop to Link component
   - Impact: Improves edit page load time
   - Risk: Low (Next.js built-in feature)
   - Complexity: Low
   - Why safe: Prefetch is safe, only loads on hover/idle

6. **Add prefetch to tally-cards edit link** (1 LOC)
   - File: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx:146`
   - Add `prefetch` prop to Link component
   - Impact: Improves edit page load time
   - Risk: Low (Next.js built-in feature)
   - Complexity: Low
   - Why safe: Prefetch is safe, only loads on hover/idle

7. **Clamp pagination off-by-one in ResourceTableClient** (3 LOC)
   - File: `src/components/forms/resource-view/resource-table-client.tsx:1111`
   - Ensure `Math.max(0, page - 1)` handles edge cases
   - Impact: Prevents pagination bugs
   - Risk: Low (defensive coding)
   - Complexity: Low
   - Why safe: Already has Math.max, just ensure correctness

8. **Remove revalidate from fetchResourcePage** (2 LOC)
   - File: `src/lib/data/resource-fetch.ts:34`
   - Remove `next: { revalidate: 300 }` when using no-store
   - Impact: Consistent caching behavior
   - Risk: Low (no-store doesn't use revalidate)
   - Complexity: Low
   - Why safe: Revalidate is ignored with no-store

9. **Stabilize getRowId in ResourceTableClient** (4 LOC)
   - File: `src/components/forms/resource-view/resource-table-client.tsx` (find getRowId usage)
   - Ensure stable function reference
   - Impact: Prevents table re-renders
   - Risk: Low (stability improvement)
   - Complexity: Low
   - Why safe: Just memoizing a function

10. **Remove duplicate statusToQuery calls** (5 LOC)
    - File: `src/app/(main)/forms/stock-adjustments/page.tsx:28-29`
    - Cache result of statusToQuery to avoid re-computation
    - Impact: Minor CPU savings
    - Risk: Low (caching optimization)
    - Complexity: Low
    - Why safe: Pure function, safe to cache

---

### Medium Changes (11–30 lines, 1–2 files, no new components)

1. **Consolidate pagination conversion to single helper** (15 LOC)
   - Files: `src/components/forms/resource-view/resource-table-client.tsx`
   - Create `toPageIndex(page: number): number` and `toPageNumber(pageIndex: number): number` helpers
   - Replace all conversions with helper calls
   - Impact: Eliminates duplicate conversion logic
   - Risk: Low (refactoring, no behavior change)
   - Complexity: Medium
   - Why safe: Pure functions, easy to test

2. **Project only displayed columns in stock-adjustments API** (20 LOC)
   - Files: `src/lib/data/resources/v_tcm_user_tally_card_entries.config.ts`
   - Change `select` to only include displayed columns: `"id, full_name, warehouse, tally_card_number, qty, location, note, updated_at_pretty"`
   - Impact: ~40% payload reduction
   - Risk: Medium (need to verify all columns used)
   - Complexity: Medium
   - Why safe: Columns are clearly defined in buildColumns()

3. **Project only displayed columns in tally-cards API** (15 LOC)
   - Files: `src/lib/data/resources/v_tcm_tally_cards_current.config.ts`
   - Change `select` to only include displayed columns: `"id, tally_card_number, warehouse_id, warehouse_name, item_number, note, is_active, snapshot_at, updated_at_pretty"`
   - Impact: ~25% payload reduction
   - Risk: Medium (need to verify all columns used)
   - Complexity: Medium
   - Why safe: Columns are clearly defined in buildColumns()

4. **Pass parsed params to ResourceTableClient to avoid duplicate parsing** (20 LOC)
   - Files: `src/components/forms/resource-view/resource-table-client.tsx`, `src/app/(main)/forms/*/page.tsx`
   - Parse params in SSR, pass as props to client
   - Remove duplicate `parseListParams` call in client
   - Impact: Eliminates duplicate parsing
   - Risk: Low (refactoring)
   - Complexity: Medium
   - Why safe: SSR already parses, just pass through

5. **Use SSR data only in ResourceTableClient, refetch only on URL change** (25 LOC)
   - Files: `src/components/forms/resource-view/resource-table-client.tsx`
   - Remove React Query initial fetch, use SSR data
   - Only refetch when URL params actually change
   - Impact: Eliminates duplicate fetch
   - Risk: Medium (need to ensure URL sync works)
   - Complexity: Medium
   - Why safe: SSR data is fresh, only refetch on user action

6. **Consolidate filter mapping to single helper** (18 LOC)
   - Files: `src/lib/next/search-params.ts` (or new helper file)
   - Create shared `applyQuickFilters(filters, quickFilterMeta)` helper
   - Use in both SSR and client
   - Impact: Eliminates duplicate filter logic
   - Risk: Low (refactoring)
   - Complexity: Medium
   - Why safe: Pure function, easy to test

7. **Add Cache-Control: no-store consistently** (12 LOC)
   - Files: All API route handlers
   - Ensure all handlers return `Cache-Control: no-store` header
   - Impact: Consistent caching behavior
   - Risk: Low (correct behavior)
   - Complexity: Low
   - Why safe: Already done in some handlers, just ensure consistency

8. **Optimize stock-adjustments edit page location loading** (22 LOC)
   - Files: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`
   - Combine queries 1-2 into single query with join
   - Cache location query result
   - Impact: Reduces N+1 from N+3 to 2 queries
   - Risk: Medium (query logic change)
   - Complexity: Medium
   - Why safe: Same data, just fewer queries

9. **Memoize column defs in ResourceTableClient** (15 LOC)
   - Files: `src/components/forms/resource-view/resource-table-client.tsx`
   - Ensure `baseColumns` memo has stable dependencies
   - Impact: Prevents unnecessary column re-creation
   - Risk: Low (memoization improvement)
   - Complexity: Low
   - Why safe: Already memoized, just ensure stability

10. **Remove duplicate filter state management** (18 LOC)
    - Files: `src/components/forms/resource-view/resource-table-client.tsx`
    - Consolidate filter state (URL → filters → URL sync)
    - Impact: Simplifies filter logic
    - Risk: Medium (state management change)
    - Complexity: Medium
    - Why safe: Same behavior, cleaner code

---

### High Changes (31–60 lines, max 2 files, no rewrites)

1. **Consolidate stock-adjustments edit page queries into single RPC or optimized query** (45 LOC)
   - Files: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`
   - Create RPC function or single query that:
     - Finds latest entry_id for tally_card_number
     - Fetches entry data
     - Fetches locations in one go
   - Impact: Reduces N+3 queries to 1-2 queries
   - Risk: Medium (database change if using RPC)
   - Complexity: High
   - Why safe: Same data, just optimized query

2. **Include locations in patch-scd2 RPC response** (35 LOC)
   - Files: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`, database RPC function
   - Modify RPC function to return locations in response
   - Or fetch locations in single query after RPC
   - Impact: Reduces 2 queries to 1
   - Risk: Medium (RPC function change)
   - Complexity: High
   - Why safe: Same data, just fewer round trips

3. **Unify list + item endpoints around shared projection/types** (50 LOC)
   - Files: `src/lib/data/resources/*.config.ts`, `src/lib/api/handle-list.ts`, `src/lib/api/handle-item.ts`
   - Create shared projection config
   - Use in both list and item endpoints
   - Impact: Consistent projection, easier maintenance
   - Risk: Medium (API contract change)
   - Complexity: High
   - Why safe: Can be done incrementally

4. **Replace client-side duplicate filter pass with server-side whitelist** (40 LOC)
   - Files: `src/components/forms/resource-view/resource-table-client.tsx`, `src/lib/api/handle-list.ts`
   - Server validates and whitelists filters
   - Client just passes filter values
   - Impact: Security + eliminates duplicate logic
   - Risk: Medium (filter validation change)
   - Complexity: High
   - Why safe: Server already validates, just formalize

5. **Add small selection-store bridge for bulk actions refresh** (38 LOC)
   - Files: `src/components/forms/resource-view/resource-table-client.tsx`, selection store
   - After bulk delete, refresh selection store
   - Impact: Better UX after bulk operations
   - Risk: Low (state management)
   - Complexity: Medium
   - Why safe: State management improvement

6. **Inline-edit save path uses optimistic UI with server confirmation** (55 LOC)
   - Files: `src/components/data-table/inline-edit-cell-wrapper.tsx`, `src/components/forms/resource-view/resource-table-client.tsx`
   - Add optimistic update for inline edits
   - Show loading state, then confirm with server
   - Impact: Better UX for inline edits
   - Risk: Medium (state management)
   - Complexity: High
   - Why safe: Similar pattern to delete optimistic updates

7. **Optimize stock-adjustments patch-scd2 to fetch locations in single query** (32 LOC)
   - Files: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
   - After RPC, fetch locations in single optimized query
   - Cache location query if possible
   - Impact: Reduces query count
   - Risk: Low (query optimization)
   - Complexity: Medium
   - Why safe: Same data, just optimized

8. **Add data reuse: pass loaded row to edit page as initial state** (42 LOC)
   - Files: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`, `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx`
   - Accept row data as prop or search param
   - Use as initial state, fallback to re-fetch
   - Impact: Faster edit page load
   - Risk: Medium (state management)
   - Complexity: Medium
   - Why safe: Fallback ensures correctness

9. **Replace deep clone with shallow where possible** (35 LOC)
   - Files: Various (search for structuredClone, JSON.parse(JSON.stringify))
   - Audit all deep clones, replace with shallow where safe
   - Impact: Performance improvement
   - Risk: Medium (need to verify safety)
   - Complexity: Medium
   - Why safe: Shallow is sufficient for most cases

10. **Add projection helper to resource configs** (48 LOC)
    - Files: `src/lib/data/resources/*.config.ts`, `src/lib/supabase/factory.ts`
    - Create `getProjection(displayedColumns: string[]): string` helper
    - Use in provider.list() to project only needed columns
    - Impact: Automatic payload optimization
    - Risk: Low (helper function)
    - Complexity: Medium
    - Why safe: Backward compatible, can be opt-in

---

## 7) Guardrails & Non-Goals

### How to Prevent Regressions

1. **Unit Tests**: Add tests for pagination conversions (1-based ↔ 0-based)
2. **Integration Tests**: Test filter mapping in both SSR and client contexts
3. **E2E Tests**: Verify edit page loads correctly after prefetch changes
4. **Type Safety**: Ensure `toRow` functions maintain type consistency
5. **RLS Tests**: Verify RLS correctness after cache mode changes

### What Not to Touch (per NON_GOALS)

1. **No new features**: All changes are optimizations, no new functionality
2. **No component rewrites**: Keep existing component structure
3. **No vendor lock-in**: Keep SSR + API pattern, no direct DB calls from client

### RLS/Session & Impersonation Cautions

1. **Cache Mode**: Must use `no-store` to respect RLS and impersonation
2. **Cookie Forwarding**: Must forward cookies in SSR fetch for RLS
3. **Absolute URLs**: Must use absolute URLs in SSR fetch for RLS
4. **Session Context**: Any caching must respect session context changes

---

## 8) Summary Statistics

- **Duplicates Removed**: 3 (unused toRow branch, duplicate parseListParams, duplicate fetchResourcePage)
- **Wasted Conversions**: 2 pagination conversions per render (1-based ↔ 0-based)
- **Payload Shrink**: 
  - Stock Adjustments: ~40% (6 unused columns removed)
  - Tally Cards: ~25% (3 unused columns removed)
- **Render Reductions**: 
  - Stabilizing buildColumns: ~2-3 renders saved per interaction
  - Memoizing column defs: ~1-2 renders saved per filter change
  - Total estimated: ~5-10 renders saved per user interaction

---

## 9) Phased Plan with QA Breakpoints

### Phase 1 (Low) → Manual QA Checklist

**Changes**: 10 low-impact changes (cache mode, remove dead code, stabilize refs, prefetch)

**Success Criteria**:
- [ ] Edit route TTI improved (prefetch working)
- [ ] Pagination correct at size change
- [ ] No RLS regressions (cache mode change verified)
- [ ] No console errors
- [ ] All CRUD operations tested

**QA Checkpoint**: Verify all low changes work, then proceed to Phase 2

---

### Phase 2 (Medium) → Manual QA Checklist

**Changes**: 10 medium-impact changes (pagination helper, projection, filter consolidation)

**Success Criteria**:
- [ ] Payload size reduced (verify in network tab)
- [ ] Pagination conversions consolidated (no duplicate logic)
- [ ] Filter mapping works in both SSR and client
- [ ] No duplicate fetches (verify in network tab)
- [ ] Edit page location loading optimized (verify query count)

**QA Checkpoint**: Verify performance improvements, then proceed to Phase 3

---

### Phase 3 (High) → Manual QA Checklist

**Changes**: 10 high-impact changes (N+1 fixes, RPC optimizations, data reuse)

**Success Criteria**:
- [ ] Edit page query count reduced (verify in database logs)
- [ ] Patch-SCD2 includes locations in response (verify API response)
- [ ] Inline edits use optimistic UI (verify UX)
- [ ] Data reuse working (edit page loads faster)
- [ ] All N+1 issues resolved (verify query count)

**QA Checkpoint**: Final verification, then merge to main

---

## Appendix: Detailed File References

### Stock Adjustments Files
- Route: `src/app/(main)/forms/stock-adjustments/page.tsx`
- Config: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx`
- Client: `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx`
- Transform: `src/app/(main)/forms/stock-adjustments/to-row.ts`
- Create: `src/app/(main)/forms/stock-adjustments/new/page.tsx`
- Edit: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`
- API Create: `src/app/api/forms/stock-adjustments/route.ts`
- API Update: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
- Resource Config: `src/lib/data/resources/v_tcm_user_tally_card_entries.config.ts`

### Tally Cards Files
- Route: `src/app/(main)/forms/tally-cards/page.tsx`
- Config: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx`
- Client: `src/app/(main)/forms/tally-cards/tally-cards-table-client.tsx`
- Transform: `src/app/(main)/forms/tally-cards/to-row.ts`
- Create: `src/app/(main)/forms/tally-cards/new/page.tsx`
- Edit: `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx`
- API Update: `src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts`
- Resource Config: `src/lib/data/resources/v_tcm_tally_cards_current.config.ts`

### Shared Infrastructure
- SSR Fetch: `src/lib/data/resource-fetch.ts`
- Client Fetch: `src/lib/api/client-fetch.ts`
- List Handler: `src/lib/api/handle-list.ts`
- Item Handler: `src/lib/api/handle-item.ts`
- Table Client: `src/components/forms/resource-view/resource-table-client.tsx`
- HTTP Utils: `src/lib/ssr/http.ts`

---

**Report Generated**: 2025-01-31  
**Next Steps**: Review report, prioritize fixes, begin Phase 1 implementation
















