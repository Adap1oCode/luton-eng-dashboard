# Vitest Tests — Stock Adjustments Core Fixes

**Status**: ✅ Complete — All 31 tests passing  
**Date**: 2025-01-28

---

## Test Files Created (5 files, 31 tests)

1. ✅ **`to-row.spec.ts`** — 7 tests
   - Row transformation consistency
   - Type coercion
   - `is_active` computation
   - Edge cases

2. ✅ **`columns.spec.ts`** — 4 tests
   - Column memoization (same reference)
   - Stable column IDs
   - Structure consistency

3. ✅ **`filters.spec.ts`** — 6 tests
   - Status → query mapping (ACTIVE, ZERO, ALL)
   - Case sensitivity
   - Consistency

4. ✅ **`normalize-list-payload.spec.ts`** — 8 tests
   - Payload format normalization
   - `{rows, total}` vs `{data, count}`
   - Edge cases

5. ✅ **`scoping.spec.ts`** — 6 tests
   - Resource config scoping requirements
   - `user_id` and `warehouse_id` in select
   - Scoping configuration validation

---

## Helper Function Created

**`src/lib/http/normalize-list-payload.ts`**
- Normalizes API payloads to `{rows, total}` format
- Handles both `{rows, total}` and `{data, count}` formats
- Safe null/undefined handling

---

## Test Execution

```bash
npm test
```

**Result**: ✅ All 31 new tests passing  
**Execution Time**: < 1s for new tests  
**Total Test Suite**: 176 tests passing (including new tests)

---

## Coverage Summary

| Area | Tests | Status |
|------|-------|--------|
| Row transformation | 7 | ✅ |
| Column memoization | 4 | ✅ |
| Status filter mapping | 6 | ✅ |
| Payload normalization | 8 | ✅ |
| Resource scoping | 6 | ✅ |
| **Total** | **31** | ✅ |

---

## Files Changed

**New Test Files** (5):
- `src/app/(main)/forms/stock-adjustments/__tests__/to-row.spec.ts`
- `src/app/(main)/forms/stock-adjustments/__tests__/columns.spec.ts`
- `src/app/(main)/forms/stock-adjustments/__tests__/filters.spec.ts`
- `src/lib/http/__tests__/normalize-list-payload.spec.ts`
- `src/lib/data/resources/__tests__/v_tcm_user_tally_card_entries.scoping.spec.ts`

**New Helper** (1):
- `src/lib/http/normalize-list-payload.ts`

**Total**: 6 new files

---

## ✅ All Tests Passing

```
✓ to-row.spec.ts (7 tests)
✓ columns.spec.ts (4 tests)
✓ filters.spec.ts (6 tests)
✓ normalize-list-payload.spec.ts (8 tests)
✓ scoping.spec.ts (6 tests)

Test Files  5 passed (5)
Tests      31 passed (31)
```

---

## Commit Ready

All tests are ready to commit with message:
```
test(stock-adjustments): add vitest coverage for core fixes
```

