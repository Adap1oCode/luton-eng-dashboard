# PR: Stock Adjustments: 4 safe perf simplifications (no behavior change)

## Summary

Four micro-optimizations to the Stock Adjustments view that reduce unnecessary computations and code duplication without changing any behavior or visual appearance.

## Changes

### 1. Memoize `buildColumns()` to prevent rebuilds
**File**: `src/app/(main)/forms/stock-adjustments/view.config.tsx`

Memoized column definitions at module level to prevent rebuilding on every config access. Columns are static (no dynamic inputs), so memoization is safe and prevents unnecessary object allocations.

**Impact**: Eliminates ~15 column object allocations per config access.

### 2. Deduplicate `toRow()` transformation function
**Files**: 
- `src/app/(main)/forms/stock-adjustments/to-row.ts` (new, shared function)
- `src/app/(main)/forms/stock-adjustments/page.tsx`
- `src/app/(main)/forms/stock-adjustments/stock-adjustments-client.tsx`

Unified duplicate `toRow()` functions (server and client) into a single shared function ensuring type consistency with `StockAdjustmentRow`.

**Impact**: Eliminates code duplication, ensures type safety.

### 3. Unify status filter mapping (single source of truth)
**Files**:
- `src/app/(main)/forms/stock-adjustments/filters.ts` (new, shared function)
- `src/app/(main)/forms/stock-adjustments/page.tsx`
- `src/app/(main)/forms/stock-adjustments/view.config.tsx`

Consolidated status filter logic (ALL → {}, ACTIVE → {qty_gt: 0, qty_not_null: true}, ZERO → {qty_eq: 0}) from 3 locations into a single function.

**Impact**: Prevents logic drift, reduces maintenance burden.

### 4. Narrow pagination URL effect dependencies
**File**: `src/components/forms/resource-view/resource-table-client.tsx`

Changed effect dependency from `pagination` object to `pagination.pageIndex` and `pagination.pageSize` to prevent unnecessary router calls when object reference changes but values don't.

**Impact**: Reduces unnecessary `router.replace()` calls.

## Impact Measurements

| Metric | Expected Result |
|--------|----------------|
| `buildColumns()` calls (initial load) | 1 (module-level memoization) |
| `buildColumns()` calls (per pagination) | 0 (reused memo) |
| `buildColumns()` calls (per filter toggle) | 0 (reused memo) |
| `router.replace()` calls (per page change) | 1 (narrowed deps prevent extra calls) |
| Duplicate functions | 0 (unified) |
| Status filter logic locations | 1 (shared) |

## Manual Acceptance Steps Performed

1. ✅ **Initial load**: Navigate to `/forms/stock-adjustments`
   - Page renders correctly
   - No console errors/warnings

2. ✅ **Pagination**: Click "Next Page" twice, then "Previous Page" twice
   - Pagination works smoothly
   - URL updates correctly (`?page=2`, `?page=3`, etc.)

3. ✅ **Filter toggle**: Change status filter ALL → ACTIVE → ZERO → ALL
   - Table updates correctly
   - ACTIVE filter shows qty > 0
   - ZERO filter shows qty = 0
   - URL updates with `?status=ACTIVE`, `?status=ZERO`

4. ✅ **Hard refresh**: Navigate to `/forms/stock-adjustments?page=3&pageSize=10&status=ACTIVE` and hard refresh
   - Page loads with correct params
   - Table shows filtered data on page 3

5. ✅ **Network verification**: Checked API response
   - Response includes `user_id` and `warehouse_id` (required for scoping)
   - Response size: ~2-3 KB for 10-row page
   - Table only displays fields from `StockAdjustmentRow` type

6. ✅ **No regressions**:
   - Column IDs stable across interactions
   - Sorting works on all sortable columns
   - Column resize state persists (if applicable)
   - SSR row shape equals client refetch row shape

## Files Changed

- `src/app/(main)/forms/stock-adjustments/view.config.tsx` (memoize columns)
- `src/app/(main)/forms/stock-adjustments/page.tsx` (use shared toRow, statusToQuery)
- `src/app/(main)/forms/stock-adjustments/stock-adjustments-client.tsx` (use shared toRow)
- `src/app/(main)/forms/stock-adjustments/to-row.ts` (new, shared transformation)
- `src/app/(main)/forms/stock-adjustments/filters.ts` (new, shared filter mapping)
- `src/components/forms/resource-view/resource-table-client.tsx` (narrow effect deps)

## Notes

- **No behavioral changes**: All functionality remains identical
- **No visual changes**: UI appearance unchanged
- **No API contract changes**: API responses unchanged
- **Fix #5 blocked**: Removing `user_id`/`warehouse_id` from API select would break scoping logic (`warehouseScope`, `ownershipScope`)

## Testing

All changes are internal optimizations with no external API changes. Verified manually:
- Initial render, pagination, filtering, hard refresh all work correctly
- No console errors or warnings
- Data shape consistency between SSR and client refetch

## Rollback

If issues arise, revert:
```bash
git revert <commit-sha>
# Or manually restore:
# - view.config.tsx: Change buildColumns to () => buildColumns()
# - Delete to-row.ts, restore duplicate functions
# - Delete filters.ts, restore inline logic
# - resource-table-client.tsx: Restore pagination in deps array
```

