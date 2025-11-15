# Code Review Fixes - Last 48 Hours

## Summary

This document summarizes the fixes applied based on the code review of commits from the last 48 hours.

## Fixes Applied

### 1. ✅ Permission Migration - Standardized to `screen:*` Pattern

**Issue:** Permission names changed from `admin:impersonate` → `screen:switch-user:update` and `resource:*` → `screen:*`, but old permission names were still in use in some places.

**Standard Pattern:** `screen:stock-adjustments:*` and `screen:tally-cards:*` are now the **correct patterns**.

**Fixes:**
- Added backward compatibility check in `/api/me/role/route.ts` to accept both old and new permission names for impersonation
- Updated `PERMISSION_PREFIX` in `stock-adjustments.config.tsx` from `resource:tcm_user_tally_card_entries` to `screen:stock-adjustments` (NEW STANDARD)
- Updated `PERMISSION_PREFIX` in `tally-cards.config.tsx` from `resource:tcm_tally_cards` to `screen:tally-cards` (NEW STANDARD)
- Updated form config permission key in `stock-adjustments/new/form.config.ts` to `screen:stock-adjustments:create`
- Added backward compatibility to all permission checks (toolbar, forms, edit pages) to support both old `resource:*` and new `screen:*` patterns during transition
- Updated test expectations to match new permission names
- Updated debug route to include both old and new permission names for testing

**Files Changed:**
- `src/app/api/me/role/route.ts`
- `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx`
- `src/app/(main)/forms/tally-cards/tally-cards.config.tsx`
- `src/app/(main)/forms/stock-adjustments/new/form.config.ts`
- `src/tests/unit/forms/stock-adjustments/toolbar-config.spec.tsx`
- `src/tests/unit/forms/tally-cards/toolbar-config.spec.tsx`
- `src/app/api/debug/nav-filter/route.ts`

### 2. ✅ Props Interface - Removed Unused Props

**Issue:** `initialFilters` and `initialExtraQuery` props were being passed to `StockAdjustmentsTableClient` but not used. `ResourceTableClient` reads filters directly from URL search params.

**Fixes:**
- Removed `initialFilters` and `initialExtraQuery` props from `StockAdjustmentsTableClient` interface
- Removed props from `page.tsx` where they were being passed
- `ResourceTableClient` already handles filters via URL search params (no changes needed)

**Files Changed:**
- `src/app/(main)/forms/stock-adjustments/page.tsx`
- `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx`

### 3. ✅ Locations Table Backfill - Verified Migration Exists

**Issue:** Concern that single-location entries might not have locations table entries after refactoring.

**Verification:**
- Migration file exists: `supabase/migrations/20250204_backfill_single_location_entries.sql`
- Migration is idempotent and safe to run multiple times
- Edit page has fallback logic to handle legacy entries that haven't been backfilled yet (lines 241-249 in `[id]/edit/page.tsx`)
- Migration only processes latest entry per tally_card_number (SCD2 pattern)

**Status:** ✅ Migration exists and code handles edge cases

## Testing Requirements

The following areas require manual testing or automated test verification:

### 1. Permission System Testing

**Test Cases:**
- [ ] Test user impersonation with new permission name (`screen:switch-user:update`)
- [ ] Test user impersonation with old permission name (`admin:impersonate`) - should still work due to backward compatibility
- [ ] Test stock-adjustments create permission (`screen:stock-adjustments:create`)
- [ ] Test tally-cards create permission (`screen:tally-cards:create`)
- [ ] Verify users with old permission names in database still have access (or verify migration script updated all records)

**How to Test:**
1. Create a test user with only `admin:impersonate` permission
2. Verify they can still impersonate users
3. Create a test user with only `screen:switch-user:update` permission
4. Verify they can impersonate users
5. Test form create buttons with both old and new permission names

### 2. Stock Adjustments Form Testing

**Test Cases:**
- [ ] Create new single-location entry (should create location table entry)
- [ ] Create new multi-location entry (should create multiple location table entries)
- [ ] Edit existing single-location entry (should load from locations table)
- [ ] Edit existing multi-location entry (should load all locations)
- [ ] Edit legacy entry without locations table entry (should create default location from parent qty/location)
- [ ] Test zero quantity submission (should be allowed per business logic)
- [ ] Test SCD2 row creation and location movement when qty/location changes

**How to Test:**
1. Navigate to `/forms/stock-adjustments/new`
2. Create entry with single location
3. Verify location appears in locations table
4. Edit the entry and verify locations load correctly
5. Test with existing entries that may not have locations table entries

### 3. Filter Performance Testing

**Test Cases:**
- [ ] Test rapid filter typing (verify 500ms debounce works)
- [ ] Test filter + pagination interaction (changing filters should reset to page 1)
- [ ] Test browser back/forward navigation with filters (filters should persist in URL)
- [ ] Verify URL and filter state stay in sync during rapid changes

**How to Test:**
1. Open stock-adjustments or tally-cards list page
2. Type rapidly in a filter field
3. Verify URL updates after 500ms delay
4. Change filters and verify pagination resets
5. Use browser back/forward buttons and verify filters persist

### 4. Hydration Testing

**Test Cases:**
- [ ] Test SSR page load with initial data (verify no hydration mismatch warnings)
- [ ] Test mutation that updates total count (verify total updates correctly)
- [ ] Test page refresh after mutation (verify data persists)

**How to Test:**
1. Open browser console
2. Navigate to list page
3. Verify no hydration mismatch warnings
4. Create/delete an entry
5. Verify total count updates correctly
6. Refresh page and verify data persists

## Regression Watchlist

### Critical Areas to Monitor

1. **Permission System:**
   - Monitor logs for permission denied errors
   - Verify all users can still access features they should have access to
   - Check if any users report access issues

2. **Stock Adjustments:**
   - Monitor for errors when editing existing entries
   - Verify locations table is populated for all entries
   - Check for any entries that fail to save

3. **Filter Performance:**
   - Monitor user feedback on filter responsiveness
   - Check for any URL sync issues
   - Verify pagination works correctly with filters

4. **Hydration:**
   - Monitor console for hydration mismatch warnings
   - Verify SSR data matches client data
   - Check for any rendering issues

## Next Steps

1. Run automated tests: `pnpm test`
2. Run E2E smoke tests: `pnpm test:e2e:smoke`
3. Perform manual testing of critical flows
4. Monitor production logs for any errors
5. Verify database migration has been run in production

## Notes

- All permission changes include backward compatibility
- Migration for locations table backfill exists and is idempotent
- Props interface cleanup removes unused code
- All changes maintain existing functionality while improving consistency

