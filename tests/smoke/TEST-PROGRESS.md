# Smoke Test Progress Tracker

## Test Suite Overview

**Total Tests: 19**
**Expected Duration: ~5 minutes** (30 seconds per test average)

## Test Breakdown

### 1. Login Test (1 test)
- ✅ `should login successfully and redirect to default homepage`

### 2. Permissions Tests (3 tests)
- ⏳ `should show correct menu items based on permissions`
- ⏳ `should show correct user menu items based on permissions`
- ⏳ `should show only allowed warehouses in warehouse filter`

### 3. Tally Cards Tests (4 tests)
- ⏳ `should verify data loads and pagination works`
- ⏳ `should verify filters work`
- ⏳ `should verify warehouse filter shows only allowed warehouses`
- ⏳ `should create, edit, verify history, and delete RTZ-999`

### 4. Stock Adjustments Tests (4 tests)
- ⏳ `should verify data loads and pagination works`
- ⏳ `should verify filters work`
- ⏳ `should verify warehouse filter shows only allowed warehouses`
- ⏳ `should create, edit, verify history, and cleanup stock adjustment for RTZ-999`

### 5. Compare Stock Tests (6 tests)
- ⏳ `should verify data loads and pagination works`
- ⏳ `should verify filters work`
- ⏳ `should verify warehouse filter shows only allowed warehouses`
- ⏳ `should verify RTZ-999 record is visible after stock adjustment`
- ⏳ `should verify item number link is clickable`
- ⏳ `should verify export CSV button is visible and clickable`

### 6. Cleanup Test (1 test)
- ⏳ `should delete RTZ-999 and verify cleanup`

## Execution Status

**Status:** Not Started
**Started:** -
**Completed:** -
**Duration:** -
**Passed:** 0/19
**Failed:** 0/19

## Notes

- Tests run sequentially (`workers=1`) for clear progress tracking
- Each test has a 30-second timeout
- Global timeout is 5 minutes for the entire suite
- Real-time progress shown in console with `list` reporter
- HTML report generated after completion





