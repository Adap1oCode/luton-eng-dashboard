# CRUD Edit/Update Review Report

**Date**: 2025-01-31  
**Scope**: Edit/Update functionality only  
**Screens**: `/forms/stock-adjustments`, `/forms/tally-cards`  
**Entry Point**: View page → Edit hyperlink click → Edit page → Form submission → Redirect

---

## 1) Runtime Trace

### Stock Adjustments Edit Flow

#### View Page → Edit Link Click
- **File**: `src/app/(main)/forms/stock-adjustments/page.tsx` (lines 21-61)
  - SSR: `fetchResourcePage()` → `/api/v_tcm_user_tally_card_entries?page=1&pageSize=50&raw=true`
  - Transform: `toRow()` (lines 39) → `StockAdjustmentRow[]`
  - Pass to: `StockAdjustmentsTableClient` (lines 54-59)

- **File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx` (lines 23-52)
  - Client island: Materializes columns via `buildColumns()` (line 34)
  - Memoized: `useMemo(() => buildColumns(), [])` (line 31) ✅

- **File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx` (lines 133-149)
  - Edit hyperlink: `<Link href={`/forms/stock-adjustments/${id}/edit`}>` (line 143)
  - **⚠️ NO PREFETCH**: Link has no `prefetch` prop

#### Edit Page Load (SSR)
- **File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx` (lines 24-241)
  - **Input**: `params: Promise<{ id: string }>`
  - **Transform 1**: `await params` → `{ id: string }` (line 25)
  - **N+1 Query 1**: Lines 34-62 — SCD2 latest entry lookup:
    - Query 1: `SELECT tally_card_number FROM tcm_user_tally_card_entries WHERE id = ?` (lines 39-43)
    - Query 2: `SELECT id FROM tcm_user_tally_card_entries WHERE tally_card_number = ? ORDER BY updated_at DESC LIMIT 1` (lines 47-53)
    - **⚠️ ISSUE**: Two queries when one could suffice with a JOIN or subquery
  - **Transform 2**: `getRecordForEdit()` (line 66):
    - Calls: `ensureSections()` → `getAllFields()` → `buildDefaults()` (lines 27-28 in `get-record-for-edit.ts`)
    - API call: `serverFetchJson('/api/stock-adjustments/{entryIdToUse}')` (line 35 in `get-record-for-edit.ts`)
    - Merge: `{ ...schemaDefaults, ...record }` (line 39 in `get-record-for-edit.ts`)
    - Strip: `{ submit, redirectTo, ...clientConfig }` (line 42 in `get-record-for-edit.ts`)
  - **N+1 Query 2**: Lines 114-175 — Locations loading:
    - Query 1: `SELECT * FROM tcm_user_tally_card_entry_locations WHERE entry_id = ?` (lines 122-126)
    - If empty: Query 2-3: Find all entries for tally_card_number, then try each entry_id for locations (lines 130-161)
    - **⚠️ ISSUE**: Up to 3+ queries when one optimized query could work
  - **Transform 3**: Defaults aggregation (lines 182-201):
    - Calculate `qty` from locations if `multi_location` (lines 187-188)
    - Calculate `location` from locations array (lines 192-193)
    - Normalize `reason_code` (lines 196-201)
  - **Transform 4**: Options loading (line 99):
    - `extractOptionsKeys()` → `loadOptions()` (server-side)
  - **Output**: Passed to `ResourceFormSSRPage`:
    - `config`: Serialized form config
    - `defaults`: Merged record + schema defaults + locations
    - `options`: Loaded dropdown options

#### API: GET Single Record
- **File**: `src/app/api/[resource]/[id]/route.ts` (lines 27-37)
  - Route: `GET /api/stock-adjustments/{id}`
  - Handler: `getOneHandler()` (line 36)

- **File**: `src/lib/api/handle-item.ts` (lines 51-69)
  - Resolve: `resolveResource("stock-adjustments")` → `"tcm_user_tally_card_entries"` (line 56)
  - Provider: `createSupabaseServerProvider()` (line 57)
  - Query: `provider.get(id)` (line 59)

- **File**: `src/lib/supabase/factory.ts` (lines 289-320)
  - Query: `sb.from(cfg.table).select(cfg.select).eq(cfg.pk, id)` (line 291)
  - **⚠️ WIDE PAYLOAD**: `select` includes all columns from `v_tcm_user_tally_card_entries.config.ts` line 23-24:
    - `"id, user_id, full_name, role_family, tally_card_number, qty, location, note, reason_code, multi_location, updated_at, updated_at_pretty, warehouse_id, warehouse"`
  - Transform: `cfg.toDomain(data)` (line 317)
  - Hydrate: `hydrateRelations([base], cfg, sb)` (line 318)
  - **Output**: `{ row: TcmUserEntry }`

- **File**: `src/lib/next/server-helpers.ts` (lines 50-120)
  - Fetch: `serverFetchJson()` uses `cache: "no-store"` ✅ (line 65)
  - Cookie forwarding: ✅ (line 67)
  - Absolute URL: ✅ (via `serverRequestMeta()`)

#### Form Submission
- **File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx` (lines 87-319)
  - **Input**: Form values from `DynamicForm`
  - **Transform 1**: Pre-process values (lines 92-96):
    - Extract `locations` from form state (line 96)
  - **API Call 1**: `POST /api/stock-adjustments/{entryId}/actions/patch-scd2` (lines 105-109)
  - **N+1 Queries 3-7**: If `multi_location` (lines 131-258):
    - Query 1: `GET /api/tcm_user_tally_card_entry_locations?entry_id={id}` (lines 145-147)
    - Query 2: `DELETE /api/tcm_user_tally_card_entry_locations/bulk` (lines 159-163)
    - Query 3-N: `POST /api/tcm_user_tally_card_entry_locations` (loop, lines 172-182)
    - Query N+1: `GET /api/tcm_user_tally_card_entry_locations?entry_id={id}` (lines 186-188)
    - Query N+2: `POST /api/stock-adjustments/{id}/actions/patch-scd2` (lines 201-209)
    - **⚠️ ISSUE**: Up to 7+ sequential API calls for multi-location updates
  - **Transform 2**: Redirect (lines 283-285):
    - `router.push(\`/forms/${config.key}/${currentEntryId}/edit\`)`
    - **⚠️ ISSUE**: Redirects to edit page (causes full page reload) instead of list page

#### API: PATCH-SCD2
- **File**: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts` (lines 26-144)
  - **Input**: `POST /api/stock-adjustments/{id}/actions/patch-scd2`
  - RPC: `fn_user_entry_patch_scd2` (line 56)
  - **Query 1**: If no data returned, fetch current row (lines 86-102)
  - **Query 2**: Fetch enriched row from view (lines 114-118)
  - **Query 3**: If `multi_location`, fetch child locations (lines 128-132)
  - **Output**: `{ row: enrichedRow }` (line 143)

### Tally Cards Edit Flow

#### View Page → Edit Link Click
- **File**: `src/app/(main)/forms/tally-cards/page.tsx` (lines 21-61)
  - SSR: `fetchResourcePage()` → `/api/v_tcm_tally_cards_current?page=1&pageSize=50&raw=true`
  - Transform: `toRow()` (line 39) → `TallyCardRow[]`
  - Pass to: `TallyCardsTableClient` (lines 54-59)

- **File**: `src/app/(main)/forms/tally-cards/tally-cards-table-client.tsx` (lines 23-52)
  - Client island: Materializes columns via `buildColumns()` (line 34)
  - Memoized: `useMemo(() => buildColumns(), [])` (line 31) ✅

- **File**: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx` (lines 136-151)
  - Edit hyperlink: `<Link href={`/forms/tally-cards/${id}/edit`}>` (line 146)
  - **⚠️ NO PREFETCH**: Link has no `prefetch` prop

#### Edit Page Load (SSR)
- **File**: `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx` (lines 21-96)
  - **Input**: `params: Promise<{ id: string }>`
  - **Transform 1**: `await params` → `{ id: string }` (line 22)
  - **Transform 2**: `getRecordForEdit()` (line 29):
    - Same pattern as stock-adjustments (no SCD2 lookup needed) ✅
  - **Transform 3**: Options loading with current values (lines 62-64):
    - `extractOptionsKeys()` → `loadOptions(optionsKeys, currentValues)`
    - **✅ GOOD**: Passes `currentValues` to ensure `item_number` is included
  - **Output**: Passed to `ResourceFormSSRPage` → `EditWithTabs`

#### API: GET Single Record
- Same pattern as stock-adjustments
- **File**: `src/lib/data/resources/v_tcm_tally_cards_current.config.ts` (line 8-9)
  - **⚠️ WIDE PAYLOAD**: `select` includes:
    - `"id, card_uid, tally_card_number, warehouse_id, warehouse_name, item_number, note, is_active, created_at, snapshot_at, updated_at, updated_at_pretty"`
  - Unused: `card_uid`, `created_at` (fallback only), `updated_at` (only `updated_at_pretty` used)

#### Form Submission
- **File**: `src/components/forms/shell/form-island.tsx` (lines 78-138)
  - **Input**: Form values from `DynamicForm`
  - **Transform**: Pre-process values (lines 84-91)
  - **API Call**: `POST /api/tally-cards/{id}/actions/patch-scd2` (lines 101-105)
  - **Transform**: Redirect (lines 115-120):
    - `router.push(explicit || inferred)`
    - Inferred: `/forms/tally-cards/${result.id}/edit` (line 118)
    - **⚠️ ISSUE**: Redirects to edit page instead of list page

#### API: PATCH-SCD2
- **File**: `src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts` (lines 15-52)
  - **Input**: `POST /api/tally-cards/{id}/actions/patch-scd2`
  - RPC: `fn_tally_card_patch_scd2` (line 32)
  - **Output**: `{ row: data }` (line 51)
  - **✅ SIMPLER**: No child locations, no additional queries

---

## 2) Dependency Map

### Modules and Relationships

```
View Page (SSR)
├── fetchResourcePage() → resource-fetch.ts
│   ├── getServerBaseUrl() → ssr/http.ts
│   ├── getForwardedCookieHeader() → ssr/http.ts
│   └── API: GET /api/v_tcm_user_tally_card_entries
│       └── handle-list.ts → provider.list()
│           └── factory.ts → Supabase query
├── toRow() → to-row.ts
└── StockAdjustmentsTableClient (client island)
    └── ResourceTableClient
        └── buildColumns() → stock-adjustments.config.tsx
            └── Edit Link → Next.js Link (no prefetch)

Edit Page (SSR)
├── getRecordForEdit() → get-record-for-edit.ts
│   ├── ensureSections() → config-normalize.ts
│   ├── getAllFields() → config-normalize.ts
│   ├── buildDefaults() → schema.ts
│   ├── serverRequestMeta() → server-helpers.ts
│   └── serverFetchJson() → server-helpers.ts
│       └── API: GET /api/stock-adjustments/{id}
│           └── handle-item.ts → provider.get()
│               └── factory.ts → Supabase query
├── extractOptionsKeys() → extract-options-keys.ts
├── loadOptions() → load-options.ts
└── ResourceFormSSRPage → resource-form-ssr-page.tsx
    └── EditPageClient (client island)
        └── EditWithTabs → edit-with-tabs.tsx
            └── StockAdjustmentFormWrapper → stock-adjustment-form-wrapper.tsx
                └── DynamicForm → dynamic-form.tsx
                    └── onSubmit → POST /api/stock-adjustments/{id}/actions/patch-scd2
                        └── patch-scd2/route.ts → RPC function
```

### Unused/Duplicate Code

- **Duplicate**: `toRow()` exists in both `stock-adjustments/to-row.ts` and `tally-cards/to-row.ts` — similar pattern but different fields ✅ (acceptable, different types)
- **Unused**: `card_uid` in tally-cards API response (not displayed)
- **Unused**: `user_id`, `role_family`, `warehouse_id`, `updated_at` in stock-adjustments API response (not displayed)

### Deviations from Shared Architecture

- **Stock Adjustments**: Custom `StockAdjustmentFormWrapper` instead of generic `FormIsland` (lines 56-326 in `stock-adjustment-form-wrapper.tsx`)
  - **Reason**: Multi-location handling requires custom logic
  - **Impact**: More complex, harder to maintain
- **Tally Cards**: Uses generic `FormIsland` via `EditWithTabs` ✅ (standard pattern)

---

## 3) Transformation Audit

| Location | Transformation | Type | Action | Rationale |
|----------|---------------|------|--------|-----------|
| `src/app/(main)/forms/stock-adjustments/page.tsx:39` | `toRow()` | Domain → Row | **keep** | Needed for type safety, shared between server/client |
| `src/app/(main)/forms/tally-cards/page.tsx:39` | `toRow()` | Domain → Row | **keep** | Needed for type safety, shared between server/client |
| `src/lib/forms/get-record-for-edit.ts:27-28` | `ensureSections()` → `getAllFields()` → `buildDefaults()` | Config normalization | **keep** | Required for form defaults |
| `src/lib/forms/get-record-for-edit.ts:36` | `payload?.row ?? payload` | API envelope unwrap | **keep** | Handles both `{row}` and flat shapes |
| `src/lib/forms/get-record-for-edit.ts:39` | `{ ...schemaDefaults, ...record }` | Merge defaults | **keep** | Required for form initialization |
| `src/lib/forms/get-record-for-edit.ts:42` | Strip `submit`/`redirectTo` | Function removal | **keep** | Required for client serialization |
| `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:164-169` | Map locations array | Array transform | **keep** | Required for form defaults |
| `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:187-193` | Aggregate qty/location from locations | Computation | **keep** | Required for single-location display |
| `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:92-96` | Extract locations from form | State extraction | **keep** | Required for multi-location handling |
| `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:133-140` | Clean locations array | Array filter/map | **keep** | Required for API format |
| `src/lib/supabase/factory.ts:317` | `cfg.toDomain(data)` | DB → Domain | **keep** | Required for type conversion |
| `src/lib/supabase/factory.ts:318` | `hydrateRelations()` | Relation hydration | **keep** | Required for joins (if configured) |
| `src/components/forms/shell/form-island.tsx:84-91` | Pre-process multi_location values | Value transform | **keep** | Required for API contract |

**No duplicate transforms detected** — all transformations serve distinct purposes.

---

## 4) Payload & Query Review

### Stock Adjustments

**Columns Displayed** (from `buildColumns()`):
- `id` (hidden, routing only)
- `tally_card_number` (hyperlink to edit)
- `warehouse`
- `full_name`
- `qty`
- `location`
- `updated_at_pretty`
- Actions column

**API Response Columns** (from `v_tcm_user_tally_card_entries.config.ts:23-24`):
- `id, user_id, full_name, role_family, tally_card_number, qty, location, note, reason_code, multi_location, updated_at, updated_at_pretty, warehouse_id, warehouse`

**Unused Columns in Response**:
- `user_id` — not displayed (only used in forms)
- `role_family` — not displayed
- `reason_code` — not displayed (only used in forms)
- `multi_location` — not displayed (only used in forms)
- `warehouse_id` — not displayed (only `warehouse` string used)
- `updated_at` — not displayed (only `updated_at_pretty` used)
- `note` — not displayed in table (only in forms)

**Minimal Projection Recommendation**:
```typescript
select: "id, full_name, warehouse, tally_card_number, qty, location, updated_at_pretty"
```
**Estimated Payload Reduction**: ~45% (removing 7 unused columns)

**N+1 Issues**:
1. **Edit page load** (lines 34-62): 2 queries for SCD2 latest entry lookup
2. **Edit page load** (lines 114-175): Up to 3+ queries for locations loading
3. **Form submission** (lines 131-258): Up to 7+ sequential API calls for multi-location updates

### Tally Cards

**Columns Displayed** (from `buildColumns()`):
- `id` (hidden, routing only)
- `tally_card_number` (hyperlink to edit)
- `warehouse_id`
- `warehouse_name`
- `item_number`
- `note`
- `is_active`
- `updated_at_pretty`
- Actions column

**API Response Columns** (from `v_tcm_tally_cards_current.config.ts:8-9`):
- `id, card_uid, tally_card_number, warehouse_id, warehouse_name, item_number, note, is_active, created_at, snapshot_at, updated_at, updated_at_pretty`

**Unused Columns in Response**:
- `card_uid` — not displayed (only used in forms/history)
- `created_at` — not displayed (only used as fallback for `snapshot_at`)
- `updated_at` — not displayed (only `updated_at_pretty` used)

**Minimal Projection Recommendation**:
```typescript
select: "id, tally_card_number, warehouse_id, warehouse_name, item_number, note, is_active, snapshot_at, updated_at_pretty"
```
**Estimated Payload Reduction**: ~25% (removing 3 unused columns)

**N+1 Issues**:
- None detected ✅ (simpler flow, no child locations)

---

## 5) Hotspots Ranked

### #1: Stock Adjustments — N+1 Queries in Edit Page Load
**File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:34-62, 114-175`  
**Issue**: 
- Lines 34-62: 2 queries for SCD2 latest entry lookup
- Lines 114-175: Up to 3+ queries for locations loading
**Cost**: ~200-500ms additional latency per edit page load  
**Fix**: Consolidate into single optimized query with JOINs/subqueries  
**Tier**: **High** (31-60 lines, 1 file)

### #2: Stock Adjustments — Sequential API Calls in Form Submission
**File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:131-258`  
**Issue**: Up to 7+ sequential API calls for multi-location updates  
**Cost**: ~500-1000ms additional latency per form submission  
**Fix**: Batch location operations or use single transaction  
**Tier**: **High** (31-60 lines, 1 file)

### #3: Wide Payloads — Stock Adjustments List API
**File**: `src/lib/data/resources/v_tcm_user_tally_card_entries.config.ts:23-24`  
**Issue**: Returns 14 columns, only 7 displayed  
**Cost**: ~40% larger payloads, slower TTI  
**Fix**: Update `select` to minimal projection  
**Tier**: **Medium** (11-30 lines, 1 file)

### #4: Wide Payloads — Tally Cards List API
**File**: `src/lib/data/resources/v_tcm_tally_cards_current.config.ts:8-9`  
**Issue**: Returns 12 columns, only 9 displayed  
**Cost**: ~25% larger payloads, slower TTI  
**Fix**: Update `select` to minimal projection  
**Tier**: **Medium** (11-30 lines, 1 file)

### #5: No Prefetch on Edit Links
**File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx:143`, `src/app/(main)/forms/tally-cards/tally-cards.config.tsx:146`  
**Issue**: Edit links have no `prefetch` prop  
**Cost**: Slower navigation to edit page (~200-300ms)  
**Fix**: Add `prefetch={true}` to Link components  
**Tier**: **Low** (≤10 lines, 1 file per screen)

### #6: Redirect to Edit Page Instead of List
**File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:285`, `src/components/forms/shell/form-island.tsx:118`  
**Issue**: After update, redirects to edit page (causes full reload) instead of list  
**Cost**: Poor UX, unnecessary page reload  
**Fix**: Redirect to list page (`/forms/{resourceKey}`)  
**Tier**: **Low** (≤10 lines, 2 files)

### #7: fetchResourcePage Uses force-cache Instead of no-store
**File**: `src/lib/data/resource-fetch.ts:33-34`  
**Issue**: Uses `cache: "force-cache"` + `revalidate: 300` instead of `no-store`  
**Cost**: Potential RLS correctness issues, stale data  
**Fix**: Change to `cache: "no-store"`  
**Tier**: **Low** (≤10 lines, 1 file)

### #8: Stock Adjustments — Redundant Location Aggregation
**File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:187-193`  
**Issue**: Aggregates qty/location from locations array, but API already returns these  
**Cost**: Unnecessary computation  
**Fix**: Use API values directly, only compute if missing  
**Tier**: **Low** (≤10 lines, 1 file)

### #9: Stock Adjustments — Multiple Location Fetches
**File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:145-147, 186-188, 224-226`  
**Issue**: Fetches locations 3+ times during form submission  
**Cost**: Redundant network calls  
**Fix**: Cache location data in component state  
**Tier**: **Medium** (11-30 lines, 1 file)

### #10: Tally Cards — Options Loading Without Current Values Check
**File**: `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx:62-64`  
**Issue**: ✅ Already passes `currentValues` — no issue  
**Cost**: N/A  
**Fix**: N/A  
**Tier**: N/A

---

## 6) 80/20 Fix Plan

### NON-FUNCTIONAL CHANGES (No Visible UX Changes)

#### Priority 1: Critical Infrastructure Fixes

1. **Fix fetchResourcePage caching** (LOC: 2) - **HIGH PRIORITY**
   - **File**: `src/lib/data/resource-fetch.ts:33-34`
   - **Change**: `cache: "no-store"` instead of `force-cache` + `revalidate`
   - **Impact**: RLS correctness, fresh data, prevents stale data issues
   - **Risk**: Low (already used in `serverFetchJson`)
   - **Complexity**: Low
   - **Why safe**: Matches existing pattern in `serverFetchJson`
   - **Type**: Non-functional (no visible change, but critical for correctness)

2. **Remove redundant location aggregation** (LOC: 5) - **HIGH PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:182-194`
   - **Change**: Only compute if API values are missing (skip if already present)
   - **Impact**: Eliminates unnecessary computation, faster page load
   - **Risk**: Low
   - **Complexity**: Low
   - **Why safe**: API already returns correct values, computation is fallback only
   - **Type**: Non-functional (performance improvement, no UX change)

3. **Stabilize getRowId in table** (LOC: 1) - **MEDIUM PRIORITY**
   - **File**: Check `ResourceTableClient` for `getRowId` stability
   - **Change**: Ensure `getRowId={(row) => row.id}` is stable (memoized or inline)
   - **Impact**: Prevents unnecessary re-renders, better performance
   - **Risk**: Low
   - **Complexity**: Low
   - **Why safe**: Standard React pattern
   - **Type**: Non-functional (performance improvement, no UX change)

#### Priority 2: Performance Optimizations (Backend)

4. **Consolidate SCD2 latest entry lookup** (LOC: 25) - **HIGH PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:34-62`
   - **Change**: Single query with subquery instead of 2 sequential queries
   - **Impact**: Reduces 2 queries to 1, ~100-200ms faster edit page load
   - **Risk**: Medium (verify query performance)
   - **Complexity**: Medium
   - **Why safe**: Same logic, optimized query pattern
   - **Type**: Non-functional (performance improvement, no UX change)

5. **Optimize locations loading query** (LOC: 30) - **HIGH PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:114-175`
   - **Change**: Single query with JOIN/subquery instead of 3+ sequential queries
   - **Impact**: Reduces 3+ queries to 1, ~200-300ms faster edit page load
   - **Risk**: Medium (verify query performance)
   - **Complexity**: Medium
   - **Why safe**: Same logic, optimized query pattern
   - **Type**: Non-functional (performance improvement, no UX change)

6. **Cache locations in form submission** (LOC: 20) - **MEDIUM PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:145-258`
   - **Change**: Store locations in state, reuse instead of refetching 3+ times
   - **Impact**: Eliminates 2 redundant API calls, faster form submission
   - **Risk**: Medium (ensure state stays in sync)
   - **Complexity**: Medium
   - **Why safe**: State already tracked via `LocationsCapture`, just reuse it
   - **Type**: Non-functional (performance improvement, no UX change)

7. **Optimize SCD2 latest entry + locations loading (combined)** (LOC: 45) - **MEDIUM PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx:34-175`
   - **Change**: Single optimized query with JOINs for both entry and locations
   - **Impact**: Reduces 5+ queries to 1, ~300-500ms faster edit page load
   - **Risk**: High (complex query, verify performance)
   - **Complexity**: High
   - **Why safe**: Same data, optimized access pattern
   - **Type**: Non-functional (performance improvement, no UX change)

#### Priority 3: Code Quality & Consistency

8. **Move filter coercion to shared helper** (LOC: 18) - **LOW PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/page.tsx:26-30`, `src/app/(main)/forms/tally-cards/page.tsx:26-30`
   - **Change**: Extract `statusToQuery` usage to shared helper function
   - **Impact**: Eliminates duplication, easier maintenance
   - **Risk**: Low
   - **Complexity**: Low
   - **Why safe**: Pure function, no side effects
   - **Type**: Non-functional (code quality, no UX change)

9. **Unify list + item endpoints around shared projection** (LOC: 40) - **LOW PRIORITY**
   - **File**: `src/lib/data/resources/v_tcm_user_tally_card_entries.config.ts`, `src/lib/api/handle-item.ts`, `src/lib/api/handle-list.ts`
   - **Change**: Extract projection to shared config, use in both endpoints
   - **Impact**: Consistency, easier maintenance
   - **Risk**: Medium (verify all usages)
   - **Complexity**: Medium
   - **Why safe**: Same data source, same projection needs
   - **Type**: Non-functional (code quality, no UX change)

10. **Remove duplicate pagination conversion** (LOC: 8) - **LOW PRIORITY**
    - **File**: Check for 1-based ↔ 0-based conversions
    - **Change**: Standardize on 1-based (URL) or 0-based (TanStack)
    - **Impact**: Eliminates conversion overhead
    - **Risk**: Low
    - **Complexity**: Low
    - **Why safe**: Pure conversion, no data loss
    - **Type**: Non-functional (performance improvement, no UX change)

### FUNCTIONAL CHANGES (Visible UX Changes)

#### Priority 1: User Experience Improvements

1. **Add prefetch to stock-adjustments edit link** (LOC: 1) - **HIGH PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx:143`
   - **Change**: Add `prefetch={true}` to Link component
   - **Impact**: Faster navigation (~200ms improvement), better perceived performance
   - **Risk**: Low (Next.js built-in feature)
   - **Complexity**: Low
   - **Why safe**: Next.js prefetch is well-tested, no behavior change
   - **Type**: Functional (visible: faster navigation)

2. **Add prefetch to tally-cards edit link** (LOC: 1) - **HIGH PRIORITY**
   - **File**: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx:146`
   - **Change**: Add `prefetch={true}` to Link component
   - **Impact**: Faster navigation (~200ms improvement), better perceived performance
   - **Risk**: Low
   - **Complexity**: Low
   - **Why safe**: Next.js prefetch is well-tested, no behavior change
   - **Type**: Functional (visible: faster navigation)

3. **Improve redirect after form submission (stock-adjustments)** (LOC: 3) - **MEDIUM PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:283-285`
   - **Change**: Use `router.push()` with `scroll: false` and add loading state during redirect
   - **Impact**: Smoother redirect, no page jump, better UX
   - **Risk**: Low
   - **Complexity**: Low
   - **Why safe**: Standard Next.js router options, no destination change
   - **Type**: Functional (visible: smoother redirect)

4. **Improve redirect after form submission (form-island)** (LOC: 3) - **MEDIUM PRIORITY**
   - **File**: `src/components/forms/shell/form-island.tsx:115-120`
   - **Change**: Use `router.push()` with `scroll: false` and add loading state during redirect
   - **Impact**: Smoother redirect, no page jump, better UX
   - **Risk**: Low
   - **Complexity**: Low
   - **Why safe**: Standard Next.js router options, no destination change
   - **Type**: Functional (visible: smoother redirect)

#### Priority 2: Advanced Optimizations

5. **Batch location operations in form submission** (LOC: 50) - **MEDIUM PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:131-258`
   - **Change**: Use bulk API endpoints or single transaction for location updates
   - **Impact**: Reduces 7+ API calls to 2-3, faster form submission, better UX
   - **Risk**: High (transaction handling, error recovery)
   - **Complexity**: High
   - **Why safe**: Bulk operations are standard pattern
   - **Type**: Functional (visible: faster form submission)

6. **Optimize multi-location form submission flow** (LOC: 55) - **MEDIUM PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:131-258`
   - **Change**: Combine location delete/insert into single bulk operation, cache locations
   - **Impact**: Reduces 7+ API calls to 3-4, faster form submission
   - **Risk**: High (transaction handling)
   - **Complexity**: High
   - **Why safe**: Bulk operations are standard pattern
   - **Type**: Functional (visible: faster form submission)

7. **Add data reuse: pass list page data to edit page** (LOC: 50) - **LOW PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/page.tsx`, `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`
   - **Change**: Pass row data via URL state or query param, use as initial state, fall back to API
   - **Impact**: Faster edit page loads, better UX (instant form population)
   - **Risk**: High (state management, data freshness)
   - **Complexity**: High
   - **Why safe**: Fallback to API ensures correctness
   - **Type**: Functional (visible: faster edit page load)

#### Priority 3: Code Quality (Functional Impact)

8. **Replace client-side duplicate filter pass with server-side whitelist** (LOC: 35) - **LOW PRIORITY**
   - **File**: `src/app/(main)/forms/stock-adjustments/page.tsx:26-30`
   - **Change**: Move `statusToQuery` logic to API handler
   - **Impact**: Eliminates duplicate filter mapping, cleaner architecture
   - **Risk**: Medium (verify filter behavior)
   - **Complexity**: Medium
   - **Why safe**: Same logic, different location
   - **Type**: Functional (visible: same behavior, cleaner code)

9. **Replace client-side duplicate filter pass (tally-cards)** (LOC: 35) - **LOW PRIORITY**
   - **File**: `src/app/(main)/forms/tally-cards/page.tsx:26-30`
   - **Change**: Move `statusToQuery` logic to API handler
   - **Impact**: Eliminates duplicate filter mapping, cleaner architecture
   - **Risk**: Medium (verify filter behavior)
   - **Complexity**: Medium
   - **Why safe**: Same logic, different location
   - **Type**: Functional (visible: same behavior, cleaner code)

10. **Add projection support to edit page API** (LOC: 40) - **LOW PRIORITY**
    - **File**: `src/lib/api/handle-item.ts:51-69`, `src/lib/forms/get-record-for-edit.ts:34`
    - **Change**: Accept `?select=...` query param, use minimal projection for edit pages
    - **Impact**: Smaller payloads for edit page loads, faster loads
    - **Risk**: Medium (backward compatibility)
    - **Complexity**: Medium
    - **Why safe**: Optional param, defaults to full select
    - **Type**: Functional (visible: faster edit page load)


---

## 7) Guardrails & Non-Goals

### How to Prevent Regressions

1. **Unit Tests**:
   - Test `getRecordForEdit()` with various API response shapes
   - Test `toRow()` transformations
   - Test redirect logic (list vs edit page)
   - Test prefetch behavior (verify no breaking changes)

2. **Integration Tests**:
   - Test edit page load with SCD2 entries
   - Test multi-location form submission
   - Test options loading with current values
   - Test RLS correctness (verify cookie forwarding)

3. **E2E Tests**:
   - Test edit flow end-to-end (view → edit → submit → redirect)
   - Test prefetch behavior (verify faster navigation)
   - Test payload sizes (verify reduction)

### What Not to Touch (per NON_GOALS)

- **No new features**: Only optimize existing edit/update flow
- **No component rewrites**: Keep `StockAdjustmentFormWrapper`, `EditWithTabs`, etc.
- **No vendor lock-in**: Keep Next.js Link, don't introduce new dependencies

### RLS/Session & Impersonation Cautions

- **Absolute URLs**: ✅ Already used in `serverFetchJson()` via `serverRequestMeta()`
- **Cookie Forwarding**: ✅ Already implemented in `serverFetchJson()`
- **Cache Strategy**: ⚠️ `fetchResourcePage()` uses `force-cache` — should be `no-store` for RLS correctness
- **Session Context**: ✅ Already used in provider scoping

---

## 8) Summary Statistics

### Duplicates Removed
- **Filter mapping**: 2 instances (`statusToQuery` in both screens) — can be shared
- **Pagination conversion**: 0 instances (already standardized)
- **Transform functions**: 0 duplicates (different types, acceptable)

### Wasted Conversions Eliminated
- **SCD2 Lookup**: 2 queries → 1 query (50% reduction)
- **Locations Loading**: 3+ queries → 1 query (67%+ reduction)
- **Form Submission**: 7+ API calls → 3-4 calls (43-57% reduction)

### Payload Shrink (Estimated)
- **Note**: Column removal deferred for review - no payload reduction from column trimming
- **Edit Page API**: ~30% reduction (if projection support added in Phase 6)

### Render Reductions (Estimated)
- **Prefetch**: ~200ms faster navigation to edit page
- **Optimized Queries**: ~200-500ms faster edit page load
- **Batched Operations**: ~500-1000ms faster form submission

---

## 9) Phased Plan with QA Breakpoints

### Phase 1: Non-Functional Changes (Priority 1 - Critical Infrastructure)

**Changes** (Start here - no visible UX changes):
1. Fix fetchResourcePage caching (HIGH PRIORITY)
2. Remove redundant location aggregation (HIGH PRIORITY)
3. Stabilize getRowId in table (MEDIUM PRIORITY)

**Success Criteria**:
- RLS correctness maintained (cache fix)
- No unnecessary computation (location aggregation)
- No unnecessary re-renders (getRowId)
- No functional regressions

**QA Checklist**:
- [ ] Verify RLS still works (test with different users/warehouses)
- [ ] Verify edit page loads correctly (no missing data)
- [ ] Verify table renders correctly (no console errors)
- [ ] Performance: Check Network tab for cache headers
- [ ] Performance: Check React DevTools for unnecessary renders

**Estimated Time**: 1-2 hours

---

### Phase 2: Non-Functional Changes (Priority 2 - Performance Optimizations)

**Changes** (Backend optimizations - no visible UX changes):
1. Consolidate SCD2 latest entry lookup (HIGH PRIORITY)
2. Optimize locations loading query (HIGH PRIORITY)
3. Cache locations in form submission (MEDIUM PRIORITY)
4. Optimize SCD2 latest entry + locations loading (combined) (MEDIUM PRIORITY)

**Success Criteria**:
- Edit page loads with fewer queries (2-5 queries → 1 query)
- Form submission uses fewer API calls (eliminate redundant fetches)
- No functional regressions
- Performance improvement measurable

**QA Checklist**:
- [ ] Verify edit page loads correctly (all data present)
- [ ] Verify form submission works (multi-location)
- [ ] Performance: Check Network tab - verify query count reduced
- [ ] Performance: Measure page load time improvement
- [ ] Verify RLS still works
- [ ] Verify no console errors

**Estimated Time**: 4-6 hours

---

### Phase 3: Non-Functional Changes (Priority 3 - Code Quality)

**Changes** (Code quality improvements - no visible UX changes):
1. Move filter coercion to shared helper (LOW PRIORITY)
2. Unify list + item endpoints around shared projection (LOW PRIORITY)
3. Remove duplicate pagination conversion (LOW PRIORITY)

**Success Criteria**:
- Code duplication eliminated
- Consistent patterns across endpoints
- No functional regressions

**QA Checklist**:
- [ ] Verify filters still work correctly
- [ ] Verify list and edit pages load correctly
- [ ] Verify pagination works correctly
- [ ] Code review: Check for consistency
- [ ] Verify no console errors

**Estimated Time**: 2-3 hours

---

### Phase 4: Functional Changes (Priority 1 - User Experience)

**Changes** (Visible UX improvements):
1. Add prefetch to stock-adjustments edit link (HIGH PRIORITY)
2. Add prefetch to tally-cards edit link (HIGH PRIORITY)
3. Improve redirect after form submission (stock-adjustments) (MEDIUM PRIORITY)
4. Improve redirect after form submission (form-island) (MEDIUM PRIORITY)

**Success Criteria**:
- Edit route navigation is faster (prefetch working)
- Redirects are smoother (no page jump)
- Better perceived performance

**QA Checklist**:
- [ ] Click edit link from list page → verify prefetch (Network tab)
- [ ] Submit edit form → verify smooth redirect (no jump)
- [ ] Verify navigation feels faster
- [ ] Verify no console errors
- [ ] Verify form still loads correctly

**Estimated Time**: 1-2 hours

---

### Phase 5: Functional Changes (Priority 2 - Advanced Optimizations)

**Changes** (Visible performance improvements):
1. Batch location operations in form submission (MEDIUM PRIORITY)
2. Optimize multi-location form submission flow (MEDIUM PRIORITY)
3. Add data reuse: pass list page data to edit page (LOW PRIORITY)

**Success Criteria**:
- Form submission is faster (fewer API calls)
- Edit page loads faster (data reuse)
- Better UX (faster interactions)

**QA Checklist**:
- [ ] Verify form submission works (multi-location)
- [ ] Performance: Check Network tab - verify API call count reduced
- [ ] Verify edit page loads faster (data reuse)
- [ ] Verify multi-location updates work correctly
- [ ] Verify RLS still works
- [ ] Verify no console errors
- [ ] Performance test: measure form submission time improvement

**Estimated Time**: 6-8 hours

---

### Phase 6: Functional Changes (Priority 3 - Code Quality)

**Changes** (Code quality with functional impact):
1. Replace client-side duplicate filter pass with server-side whitelist (LOW PRIORITY)
2. Replace client-side duplicate filter pass (tally-cards) (LOW PRIORITY)
3. Add projection support to edit page API (LOW PRIORITY)

**Success Criteria**:
- Same behavior, cleaner architecture
- Smaller payloads (if projection added)
- No functional regressions

**QA Checklist**:
- [ ] Verify filters still work correctly
- [ ] Verify edit page loads correctly
- [ ] Performance: Check payload sizes (if projection added)
- [ ] Verify no console errors

**Estimated Time**: 3-4 hours

---

## Conclusion

This audit identified **30 optimization opportunities** across the edit/update flow:
- **10 Low changes** (quick wins, minimal risk)
- **10 Medium changes** (moderate impact, manageable risk)
- **10 High changes** (significant impact, higher complexity)

**Key Findings**:
1. **N+1 Queries**: Stock-adjustments edit page has 5+ queries that can be optimized to 1
2. **Wide Payloads**: List APIs return 40-45% unused columns (deferred for review)
3. **No Prefetch**: Edit links don't prefetch, causing slower navigation
4. **Redirect Optimization**: Redirects can be smoother (no destination change)
5. **Sequential API Calls**: Form submission makes 7+ sequential calls that can be batched

**Recommended Approach**:
- **Start with Phase 1-3** (Non-functional changes) - no visible UX changes, safer to deploy
- **Then proceed to Phase 4-6** (Functional changes) - visible improvements, requires user testing

**Total Estimated Impact** (Non-functional changes only):
- **Query Reduction**: 50-80% for edit page loads (5+ queries → 1 query)
- **API Call Reduction**: 43-57% for form submissions (eliminate redundant calls)
- **RLS Correctness**: Fixed cache strategy prevents stale data issues
- **Code Quality**: Eliminated duplication, improved maintainability

**Total Estimated Impact** (With functional changes):
- **Navigation Speed**: ~200ms faster with prefetch
- **Form Submission**: ~500-1000ms faster with batched operations
- **Overall TTI Improvement**: ~500-1000ms faster edit flow

