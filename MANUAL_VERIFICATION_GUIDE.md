# Manual Verification Guide — Stock Adjustments Fixes

## Pre-Test Setup

1. Ensure dev server is running:
   ```bash
   pnpm dev
   ```

2. Open browser DevTools Console (F12)

3. Clear console and network logs

---

## Test 1: Initial Load

**Steps**:
1. Navigate to `http://localhost:3001/forms/stock-adjustments`
2. Wait for page to fully load

**Expected Results**:
- ✅ Page renders correctly
- ✅ Table shows stock adjustments data
- ✅ No console errors or warnings
- ✅ No red errors in console

**Impact Check**:
- Note: With memoization, `buildColumns()` is called **once** at module load (before first render)
- No visible console log (counters removed), but column memoization is active

---

## Test 2: Pagination

**Steps**:
1. Click "Next Page" button
2. Click "Next Page" again
3. Click "Previous Page" button
4. Click "Previous Page" again

**Expected Results**:
- ✅ Table updates smoothly
- ✅ URL changes: `?page=2`, `?page=3`, `?page=2`, `?page=1`
- ✅ No console errors
- ✅ Pagination controls show correct page numbers

**Impact Check**:
- With narrowed dependencies, `router.replace()` should be called **once per pagination change** (not multiple times)
- Check Network tab: Should see one request per pagination click

---

## Test 3: Filter Toggle

**Steps**:
1. Change status filter dropdown to "ACTIVE"
2. Verify table updates
3. Change to "ZERO"
4. Verify table updates
5. Change back to "ALL"

**Expected Results**:
- ✅ ACTIVE filter: Only shows rows where `qty > 0`
- ✅ ZERO filter: Only shows rows where `qty = 0`
- ✅ ALL filter: Shows all rows
- ✅ URL updates: `?status=ACTIVE`, `?status=ZERO`, or no status param
- ✅ No console errors

**Impact Check**:
- With unified filter logic, server and client use same mapping
- Verify Network tab: Request includes correct query params
  - ACTIVE: `qty_gt=0&qty_not_null=true`
  - ZERO: `qty_eq=0`

---

## Test 4: Hard Refresh with URL Params

**Steps**:
1. Manually navigate to: `http://localhost:3001/forms/stock-adjustments?page=3&pageSize=10&status=ACTIVE`
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**Expected Results**:
- ✅ Page loads with correct initial state
- ✅ Table shows page 3
- ✅ Table shows page size 10
- ✅ Table shows only ACTIVE items (qty > 0)
- ✅ URL params preserved
- ✅ No console errors

**Impact Check**:
- SSR should apply filters correctly using shared `statusToQuery()` function
- Client should receive correct initial data

---

## Test 5: Network & Payload Verification

**Steps**:
1. Open Network tab in DevTools
2. Load `/forms/stock-adjustments`
3. Find request to `/api/v_tcm_user_tally_card_entries`
4. Click on request → Response tab

**Expected Results**:
- ✅ Response includes `user_id` field (required for scoping)
- ✅ Response includes `warehouse_id` field (required for scoping)
- ✅ Response includes all displayed fields: `id`, `full_name`, `warehouse`, `tally_card_number`, `qty`, `location`, `note`, `updated_at`, `updated_at_pretty`
- ✅ Response size: Approximately **2-3 KB** for a 10-row page (varies by data)

**Verification**:
```json
{
  "rows": [
    {
      "id": "...",
      "user_id": "...",        // ✅ Present (scoping)
      "warehouse_id": "...",   // ✅ Present (scoping)
      "full_name": "...",
      "warehouse": "...",
      // ... other fields
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 5
}
```

---

## Test 6: No-Regression Checks

### Column Stability

**Steps**:
1. Note column order on initial load
2. Change pagination
3. Change filter
4. Hard refresh

**Expected Results**:
- ✅ Column order remains stable
- ✅ Column IDs unchanged: `id`, `tally_card_number`, `warehouse`, `full_name`, `qty`, `location`, `note`, `updated_at_pretty`, `__select`, `__actions`

### Sorting

**Steps**:
1. Click header to sort by `tally_card_number` (ascending)
2. Click again (descending)
3. Try sorting other columns: `warehouse`, `full_name`, `qty`, `updated_at_pretty`

**Expected Results**:
- ✅ Sorting works on all sortable columns
- ✅ Sort indicators show correctly
- ✅ URL may include sort params (if implemented)
- ✅ Data reorders correctly

### Data Shape Consistency

**Steps**:
1. Initial load: Check row data structure
2. Change filter: Check row data structure after React Query refetch

**Expected Results**:
- ✅ Both SSR and client refetch return same shape:
  ```typescript
  {
    id: string;
    full_name: string;
    warehouse: string;
    tally_card_number?: string | null;
    qty?: number | null;
    location?: string | null;
    note?: string | null;
    updated_at?: string | null;
    updated_at_pretty?: string | null;
    is_active?: boolean | null;
  }
  ```
- ✅ No extra fields like `user_id` or `card_uid` in table rows
- ✅ Type matches `StockAdjustmentRow`

---

## Impact Counters (Before Removal)

**Note**: Counters have been removed. If you need to verify impact, add back temporarily:

1. **buildColumns() calls**: Should be **1** total (module-level)
2. **router.replace() calls**: Should be **1 per pagination change**

---

## Failure Scenarios

If any test fails, note:
- **Which test failed** (1-6)
- **Exact error message** (console or network)
- **What happened vs what was expected**
- **Browser and OS**

Then we can roll back only the related fix.

---

## Success Criteria

All tests pass when:
- ✅ No console errors
- ✅ All interactions work as expected
- ✅ URL updates correctly
- ✅ Data displays correctly
- ✅ Network payload includes scoping fields
- ✅ No visual regressions

If all pass → **Ready for PR** ✅

















