# Migration Plan: SSR to Hybrid SSR + React Query

## Goal
Migrate `ResourceTableClient` from pure SSR (`router.refresh()`) to hybrid SSR + React Query pattern, enabling subtle updates for all interactions (pagination, inline edits, deletes, filters).

## Current State
- ✅ React Query is already set up in the app (`QueryProvider`, `queryClient`)
- ✅ `fetchResourcePageClient` helper exists
- ✅ `ResourceListClient` already uses hybrid pattern successfully
- ❌ `ResourceTableClient` uses `router.refresh()` causing full page refreshes

## Migration Steps (Regression-Safe)

### Step 1: Add React Query Infrastructure
**Goal**: Import React Query and set up query key helpers (non-breaking, no behavior change)

**Changes**:
1. Add imports: `useQuery`, `useQueryClient` from `@tanstack/react-query`
2. Add `fetchResourcePageClient` import
3. Create `queryKey` helper function (derives from `config`, page, pageSize, filters)
4. Extract `apiEndpoint` from config (check `config.resourceKey` or prop)

**Verification**:
- ✅ App builds without errors
- ✅ Table displays initial data (unchanged behavior)
- ✅ No console errors

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

### Step 2: Add React Query Hook (Parallel to Existing)
**Goal**: Add `useQuery` hook that fetches data, but table still uses `initialRows` (backward compatible)

**Changes**:
1. Add `useQuery` hook with queryKey and queryFn
2. Use `initialData: { rows: initialRows, total: initialTotal }` (SSR data)
3. Set `staleTime` and `refetchOnWindowFocus: false` (match ResourceListClient)
4. Table continues using `initialRows` prop (no change to table logic yet)

**Verification**:
- ✅ App builds without errors
- ✅ Table displays data correctly (from initialRows, not query yet)
- ✅ No network requests on initial load (uses SSR data)
- ✅ React Query DevTools shows query with SSR data

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

### Step 3: Switch Table Data Source to React Query
**Goal**: Table uses React Query data, falls back to `initialRows` during loading (regression-safe)

**Changes**:
1. Use `data?.rows ?? initialRows` for table rows
2. Use `data?.total ?? initialTotal` for pagination total
3. Keep `initialRows` as fallback during loading state
4. Extract `isLoading` and `isFetching` from query (for future loading indicators)

**Verification**:
- ✅ Table displays data correctly
- ✅ Pagination works (still uses router.replace, but data comes from React Query)
- ✅ Filters work (still uses router.refresh, but data comes from React Query)
- ✅ No visual regressions

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

### Step 4: Update Inline Edit to Use React Query
**Goal**: Replace `router.refresh()` with `queryClient.invalidateQueries()` for subtle updates

**Changes**:
1. Get `queryClient` from `useQueryClient()`
2. In `handleInlineEditSave`, after successful PATCH:
   - Remove `router.refresh()`
   - Add `queryClient.invalidateQueries([queryKey])`
3. Optionally: Optimistically update the row in cache (future enhancement)

**Verification**:
- ✅ Inline edit saves correctly
- ✅ Table updates subtly (no full page refresh)
- ✅ Edited value appears immediately after save
- ✅ No scroll position loss
- ✅ Column widths preserved

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

### Step 5: Update Delete Handler to Use React Query
**Goal**: Replace `router.refresh()` with `queryClient.invalidateQueries()` for subtle updates

**Changes**:
1. In `handleRowDelete`, after successful DELETE:
   - Keep `clearOptimisticState()` (optimistic UI)
   - Remove `router.refresh()`
   - Add `queryClient.invalidateQueries([queryKey])`
2. For bulk delete (from toolbar), same pattern

**Verification**:
- ✅ Single row delete works (optimistic + subtle refresh)
- ✅ Bulk delete works
- ✅ Table updates subtly (no full page refresh)
- ✅ Selection state clears correctly
- ✅ No scroll position loss

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

### Step 6: Remove router.refresh() from Pagination
**Goal**: Pagination URL changes trigger React Query refetch automatically (no explicit refresh needed)

**Changes**:
1. In pagination URL sync effect (line ~581):
   - Keep `router.replace()` (updates URL)
   - Remove any `router.refresh()` if present
   - React Query will auto-refetch because `page`/`pageSize` are in queryKey
2. Add `scroll: false` to `router.replace()` to prevent scroll jump

**Verification**:
- ✅ Pagination changes update URL correctly
- ✅ Table data refetches subtly (React Query auto-refetch)
- ✅ No full page refresh
- ✅ No scroll position jump
- ✅ Loading state works (if added in Step 8)

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

### Step 7: Update Filter Changes to Use React Query
**Goal**: Filter changes trigger React Query refetch instead of `router.refresh()`

**Changes**:
1. In `QuickFiltersToolbar` `handleFilterChange`:
   - Keep `router.replace()` (updates URL)
   - Remove `router.refresh()`
   - Add `queryClient.invalidateQueries([queryKey])` OR rely on auto-refetch
2. In `MoreFiltersSection` filter handlers, same pattern
3. Ensure filter values are included in queryKey (serializedFilters pattern)

**Verification**:
- ✅ Quick filters (status dropdown) work correctly
- ✅ More filters work correctly
- ✅ Table data refetches subtly (no full page refresh)
- ✅ Filter state persists in URL
- ✅ No scroll position loss

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

### Step 8: Add Loading States and Error Handling
**Goal**: Provide visual feedback during refetches and handle errors gracefully

**Changes**:
1. Add subtle loading indicator (use `isFetching` from query)
   - Show small spinner in bottom toolbar or table area
   - Only show for background refetches (not initial load)
2. Add error handling:
   - Display toast on query error
   - Show retry button
   - Fallback to `initialRows` on error
3. Match pattern from `ResourceListClient` (BackgroundLoader)

**Verification**:
- ✅ Loading indicator appears during refetches
- ✅ Errors display user-friendly messages
- ✅ Retry works correctly
- ✅ No visual jarring (subtle updates)

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

### Step 9: Cleanup and Final Verification
**Goal**: Remove unused code, add comments, verify all interactions

**Changes**:
1. Remove any unused imports or variables
2. Add JSDoc comments explaining React Query pattern
3. Verify all interactions:
   - ✅ Initial load (SSR)
   - ✅ Pagination (subtle update)
   - ✅ Inline edit (subtle update)
   - ✅ Delete (subtle update)
   - ✅ Filters (subtle update)
   - ✅ Column widths persist
   - ✅ Selection state works
   - ✅ Scroll position preserved
4. Test on stock-adjustments screen specifically

**Verification**:
- ✅ All interactions work smoothly
- ✅ No full page refreshes anywhere
- ✅ Code is clean and well-documented
- ✅ No console errors or warnings

**Files to modify**:
- `src/components/forms/resource-view/resource-table-client.tsx`

---

## Key Patterns to Follow (Reference ResourceListClient)

### Query Key Structure
```typescript
const serializedFilters = useMemo(() => {
  const keys = Object.keys(filters).sort();
  return keys.map(k => `${k}:${filters[k]}`).join('|');
}, [filters]);

const queryKey = [resourceKey, page, pageSize, serializedFilters || 'no-filters'];
```

### Query Configuration
```typescript
const { data, error, isLoading, isFetching } = useQuery({
  queryKey,
  queryFn: async () => fetchResourcePageClient({ endpoint, page, pageSize, extraQuery }),
  initialData: { rows: initialRows, total: initialTotal },
  initialDataUpdatedAt: Date.now(),
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
```

### Invalidation Pattern
```typescript
const queryClient = useQueryClient();
// After mutation:
queryClient.invalidateQueries({ queryKey: [resourceKey] });
```

### URL Sync Pattern
```typescript
// Update URL (triggers React Query auto-refetch via queryKey change)
router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
// NO router.refresh() needed!
```

---

## Success Criteria

After migration:
- ✅ All interactions use subtle updates (no full page refreshes)
- ✅ SSR initial load still works (fast, SEO-friendly)
- ✅ Loading states are subtle and non-jarring
- ✅ Error handling is graceful
- ✅ Code is maintainable and follows existing patterns
- ✅ No regression in functionality

---

## Rollback Plan

If any step causes issues:
1. Revert that specific step's changes
2. Verify app works correctly
3. Debug the issue before proceeding
4. Each step is designed to be independent and reversible



