# Remaining Optimizations and Fixes

**Last Updated**: 2025-01-29  
**Status**: After resize cleanup and initial optimizations

---

## ✅ Already Implemented

1. **Column Width Calculation** - `columnsSignature` utility prevents unnecessary recalculations
2. **router.refresh() Replacement** - Replaced with `queryClient.invalidateQueries()` (4 instances)
3. **CSV Export Optimization** - Uses `tableRefForExport` ref to prevent listener recreation
4. **QuickFiltersToolbar Memoization** - Uses `quickFilterValues` memo instead of entire `search` object
5. **filterColumns Optimization** - Uses `allLeafColumnIds` memo instead of entire `table` object
6. **renderColumnWidthsPx Optimization** - Uses `visibleColumnIds` memo instead of calling `table.getAllLeafColumns()` directly
7. **ColumnsAndSortToolbar Dependencies** - Extracted `currentSorting` and `leafColumnsMetadata` memos to reduce dependencies
8. **dataIds Memo Optimization** - Improved with better fallback ID generation
9. **useSavedViews localStorage** - Defers writes using `requestIdleCallback` to avoid blocking render
10. **Column Resize Functionality** - Fixed and cleaned up (removed diagnostic code)

---

## ⚠️ Remaining Fixes by Priority

### P0 (Critical - Immediate Impact)

#### 1. Stabilize `config` Object Dependencies
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: Multiple memos depend on entire `config` object (lines 128, 142, 170, 260)
- **Issue**: `config` object reference may change, causing cascading recalculations
- **Fix**: Extract specific properties (`columns`, `quickFilters`, `formsRouteSegment`) to stable variables, or use deep equality check
- **Impact**: 5-15ms per render (fewer cascading recalculations)

#### 2. Fix Base Columns Memoization
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~249-256
- **Issue**: `baseColumns` memo checks `config.columns` but `config` object reference may change
- **Fix**: Extract `columns` to separate prop or use deep comparison
- **Impact**: 10-20ms per render

#### 3. Split `columnsWithHeaders` Memoization
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~562-587
- **Issue**: Currently depends on `columnOrder` which changes, causing unnecessary recalculations
- **Fix**: Split into base columns memo (stable) and header decoration memo (depends on order)
- **Impact**: 10-15ms per render

---

### P1 (High Impact - Low Risk)

#### 4. Lazy-Load Saved Views Hook
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~274-284
- **Issue**: `useSavedViews` loads localStorage and makes API calls immediately
- **Fix**: Defer until user opens Views menu
- **Impact**: 5-10ms initial load, ~20KB bundle reduction

#### 5. Lazy-Load Column Resize Hooks
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~368-384
- **Issue**: `useColumnResize` and `useContainerResize` loaded immediately but only needed on resize
- **Fix**: Load on first resize interaction
- **Impact**: 3-5ms initial load, ~10KB bundle reduction

#### 6. Optimize `autoColumnWidthsPct` Calculation
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~952-967
- **Issue**: `computeAutoColumnPercents` iterates through 50 rows × 8 columns = 400 iterations on every render
- **Fix**: Reduce `sampleRows` to 20-30, or only compute when explicitly requested (auto-fit button)
- **Impact**: 10-20ms initial load (if deferred)

#### 7. Lazy-Load More Filters Section
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~1321-1350
- **Issue**: `MoreFiltersSection` is memoized but computed on every render
- **Fix**: Lazy-load component until `showMoreFilters` is true
- **Impact**: 2-5ms per render

---

### P2 (Medium Impact - Code Splitting)

#### 8. Code-Split DnD Kit
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~20-32 (imports)
- **Issue**: `@dnd-kit/core` and `@dnd-kit/sortable` loaded immediately (~40KB combined)
- **Fix**: Lazy-load until user attempts to drag a column. Use React.lazy() or dynamic import
- **Impact**: ~40KB bundle reduction, 5-10ms initial load

#### 9. Lazy-Load Inline Edit Components
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~54-55 (imports)
- **Issue**: `InlineEditCellWrapper` and `StatusCellWrapper` loaded immediately
- **Fix**: Load on first edit interaction
- **Impact**: ~15KB bundle reduction, 3-5ms initial load

#### 10. Lazy-Load CSV Export
- **File**: `src/components/data-table/csv-export.ts`
- **Issue**: `exportCSV` function only needed when Export button clicked
- **Fix**: Use dynamic import in click handler
- **Impact**: ~5KB bundle reduction, 1-2ms initial load

#### 11. Lazy-Load Dialog Components
- **File**: `src/components/ui/dialog` (used in Save View dialog)
- **Lines**: ~1579-1643
- **Issue**: Save View dialog only needed when Save View button clicked
- **Fix**: Use React.lazy() for DialogContent, DialogHeader, etc.
- **Impact**: ~20KB bundle reduction, 2-3ms initial load

---

### P3 (Lower Priority - Configuration)

#### 12. Stabilize Column Memoization in stock-adjustments-table-client
- **File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx`
- **Lines**: ~31-39
- **Issue**: `viewConfigWithColumns` uses empty array `[]` deps. Verify `buildColumns()` is pure
- **Fix**: Ensure `buildColumns()` is pure (no side effects, same input = same output)
- **Impact**: 5-10ms per render

#### 13. Split `enhancedColumns` Memoization
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~590-655
- **Issue**: Combined filter function assignment with inline edit wrapper assignment
- **Fix**: Separate filter functions (stable) from inline edit wrappers (depend on editing state)
- **Impact**: 5-10ms per render

#### 14. Review SSR Cache Strategy
- **File**: `src/lib/data/resource-fetch.ts`
- **Lines**: ~31-37
- **Issue**: Uses `cache: "force-cache"` with 5min revalidate. May be too long for dynamic data
- **Fix**: Consider `cache: "no-store"` for dynamic data, or reduce revalidate time to 30-60s
- **Impact**: Better data freshness (depends on use case)

#### 15. Optimize React Query Setup
- **File**: `src/components/forms/resource-view/resource-table-client.tsx`
- **Lines**: ~206-230
- **Issue**: `useQuery` runs immediately but uses `initialData`. May cause unnecessary network requests
- **Fix**: Consider using `enabled: false` until user interacts, or reduce `staleTime` for better caching
- **Impact**: Network request savings, faster perceived load

---

## Summary

**Total Remaining**: **15 optimizations**

- **P0 (Critical)**: 3 fixes - Stabilize config dependencies, fix base columns, split columnsWithHeaders
- **P1 (High Impact)**: 4 fixes - Lazy-load saved views, resize hooks, optimize auto-width calc, lazy-load more filters
- **P2 (Code Splitting)**: 4 fixes - DnD Kit, inline edits, CSV export, Dialog components
- **P3 (Lower Priority)**: 4 fixes - Column memoization verification, enhancedColumns split, cache strategy, React Query setup

**Estimated Combined Impact** (if all implemented):
- **Bundle Size**: ~110KB reduction (lazy-loaded components)
- **Initial Load Time**: 50-100ms improvement
- **Render Performance**: 50-80ms improvement per render
- **Network**: Eliminated unnecessary refetches

---

## Recommended Next Steps

1. **Start with P0 fixes** - These have the highest impact and are critical for render performance
2. **Measure after each fix** - Use performance marks/measures to verify improvements
3. **Test thoroughly** - Each change should maintain existing functionality
4. **Prioritize based on actual measurements** - Focus on fixes that show real-world improvements

