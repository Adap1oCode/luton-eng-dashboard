# Stock Adjustments Fixes — Verification Checklist

**Status**: ✅ All 4 fixes applied, ready for manual verification  
**Date**: 2025-01-28

---

## ✅ Fixes Applied

1. ✅ **Memoize `buildColumns()`** — Prevents column rebuilds
2. ✅ **Deduplicate `toRow()`** — Shared function (server + client)
3. ✅ **Unify status filter mapping** — Single source of truth
4. ✅ **Narrow pagination effect deps** — Prevents unnecessary router calls
5. ❌ **Drop unused API fields** — BLOCKED (required for scoping)

---

## 📋 Quick Verification Checklist

### Build & Initial Load
- [ ] `pnpm build` succeeds
- [ ] Navigate to `/forms/stock-adjustments`
- [ ] No console errors/warnings
- [ ] Page renders correctly
- [ ] Check console: `[PERF] buildColumns() called 1 times` ✓

### Pagination
- [ ] Click "Next Page" twice
- [ ] Click "Previous Page" twice
- [ ] Pagination works smoothly
- [ ] URL updates correctly (`?page=2`, `?page=3`, etc.)
- [ ] Check console: Minimal `router.replace()` calls

### Filter Toggle
- [ ] Change filter: ALL → ACTIVE → ZERO → ALL
- [ ] Table updates correctly
- [ ] URL updates: `?status=ACTIVE`, `?status=ZERO`
- [ ] ACTIVE shows qty > 0
- [ ] ZERO shows qty = 0

### Hard Refresh
- [ ] Navigate to `/forms/stock-adjustments?page=3&pageSize=10&status=ACTIVE`
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Page loads with correct params
- [ ] Table shows filtered data

### Network Check
- [ ] Open Network tab
- [ ] Find `/api/v_tcm_user_tally_card_entries` request
- [ ] Verify response includes `user_id` and `warehouse_id` ✓
- [ ] Note response size (~2-3 KB for 10 rows)

### Data Shape
- [ ] Initial SSR data matches `StockAdjustmentRow` type
- [ ] Client refetch data matches `StockAdjustmentRow` type
- [ ] No extra fields in table rows

### No Regressions
- [ ] Column sorting works
- [ ] Column IDs stable across interactions
- [ ] Row selection works (if applicable)

---

## 📊 Impact Numbers to Record

During testing, note console logs:

1. **buildColumns() calls**: Should see `1` on initial load only
2. **router.replace() calls**: Should see `1` per pagination change

Record in table:

| Interaction | buildColumns() Calls | router.replace() Calls |
|-------------|---------------------|------------------------|
| Initial load | ? | ? |
| Pagination (next) | ? | ? |
| Filter toggle (ALL→ACTIVE) | ? | ? |

---

## 🧹 Cleanup Before PR

### Remove Temporary Counters

**File**: `src/app/(main)/forms/stock-adjustments/view.config.tsx`

Replace lines 168-177:
```typescript
// MEMOIZED VERSION (remove counter):
// Memoize columns at module level to prevent rebuilds on every config access
const _memoizedColumns = buildColumns();
```

**File**: `src/components/forms/resource-view/resource-table-client.tsx`

Remove lines 581-585 (counter code), keep only:
```typescript
    router.replace(`${pathname}?${sp.toString()}`);
```

---

## 📝 PR Ready When

- [x] All fixes applied
- [ ] Manual verification passes
- [ ] Impact numbers recorded
- [ ] Temporary counters removed
- [ ] No lint errors
- [ ] All checks pass

**Next**: Open PR "Stock Adjustments: 4 safe perf simplifications"



















