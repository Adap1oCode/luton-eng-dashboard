# Vitest Tests Added — Stock Adjustments Verification

**Date**: 2025-01-28  
**Commit Message**: `test(stock-adjustments): add vitest coverage for core fixes`

---

## ✅ Test Files Created

### 1. `src/app/(main)/forms/stock-adjustments/__tests__/to-row.spec.ts`
**Tests**: 7  
**Purpose**: Verify `toRow()` transformation function correctness
- Complete API response transformation
- Type coercion (strings, nulls)
- `is_active` computation logic
- Pretty date handling
- Edge cases (undefined, null input)

### 2. `src/app/(main)/forms/stock-adjustments/__tests__/columns.spec.ts`
**Tests**: 4  
**Purpose**: Verify column memoization stability
- Same reference on repeated calls (memoization)
- Column IDs are stable and unique
- Column structure consistency

### 3. `src/app/(main)/forms/stock-adjustments/__tests__/filters.spec.ts`
**Tests**: 6  
**Purpose**: Verify `statusToQuery()` mapping
- ACTIVE → `{qty_gt: 0, qty_not_null: true}`
- ZERO → `{qty_eq: 0}`
- ALL → `{}`
- Unknown values → `{}`
- Case sensitivity
- Consistency across calls

### 4. `src/lib/http/__tests__/normalize-list-payload.spec.ts`
**Tests**: 8  
**Purpose**: Verify payload normalization helper
- `{rows, total}` format
- `{data, count}` format
- Preference handling (rows > data, total > count)
- Missing fields fallback
- Null/undefined handling
- Invalid number handling

### 5. `src/lib/data/resources/__tests__/v_tcm_user_tally_card_entries.scoping.spec.ts`
**Tests**: 6  
**Purpose**: Verify resource config scoping requirements
- `user_id` in select string (ownership scoping)
- `warehouse_id` in select string (warehouse scoping)
- `ownershipScope` configuration
- `warehouseScope` configuration
- Scoping columns match select fields

---

## 📊 Test Summary

| Test File | Tests | Status |
|-----------|-------|--------|
| `to-row.spec.ts` | 7 | ✅ Passing |
| `columns.spec.ts` | 4 | ✅ Passing |
| `filters.spec.ts` | 6 | ✅ Passing |
| `normalize-list-payload.spec.ts` | 8 | ✅ Passing |
| `scoping.spec.ts` | 6 | ✅ Passing |
| **Total** | **31** | ✅ **All Passing** |

---

## 🔧 Helper Created

**File**: `src/lib/http/normalize-list-payload.ts`  
**Purpose**: Normalizes list API payloads to consistent `{rows, total}` format  
**Handles**: Both `{rows, total}` and `{data, count}` response formats

---

## ⏭️ Optional Test (Skipped)

**URL Sync Effect Test**: Skipped per instructions  
**Reason**: Requires complex mocking of `next/navigation` hooks (`useRouter`, `useSearchParams`, `usePathname`)  
**Note**: The narrowed dependencies are verified through integration tests and manual verification

---

## ✅ Verification Results

**All tests passing**: ✅ 31/31  
**Lint checks**: ✅ No errors  
**Type checks**: ✅ All valid

---

## 🎯 Coverage Achieved

- ✅ Row transformation consistency (`toRow()`)
- ✅ Column memoization stability (`buildColumns()`)
- ✅ Status filter mapping (`statusToQuery()`)
- ✅ Payload normalization (`normalizeListPayload()`)
- ✅ Resource scoping configuration (user_id, warehouse_id)

**Total**: 5 core areas covered with 31 unit tests

---

## 🚀 Next Steps

Tests are ready to commit:
```bash
git add src/app/(main)/forms/stock-adjustments/__tests__/
git add src/lib/http/normalize-list-payload.ts
git add src/lib/http/__tests__/normalize-list-payload.spec.ts
git add src/lib/data/resources/__tests__/v_tcm_user_tally_card_entries.scoping.spec.ts

git commit -m "test(stock-adjustments): add vitest coverage for core fixes

- Add toRow() transformation tests (7 tests)
- Add column memoization tests (4 tests)
- Add status filter mapping tests (6 tests)
- Add payload normalization helper + tests (8 tests)
- Add resource scoping config tests (6 tests)

Total: 31 new tests covering all 4 performance fixes"
```

---

## 📝 Notes

- All tests are pure unit tests (no browser/E2E)
- Tests use real imports from live codebase
- No external mocks beyond simple `vi.mock()` (none used)
- Fast execution (< 1s for all new tests)
- Tests verify logic correctness, not rendering




















