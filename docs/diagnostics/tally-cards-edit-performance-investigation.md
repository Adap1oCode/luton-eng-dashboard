# Tally Cards Edit Page Performance Investigation

## Phase 0: Prerequisites - Current Status

### Step 0.1: Resource Mapping ✅ COMPLETED

**Findings:**
- Resource key `"tally-cards"` maps to `tcm_tally_cards` resource
- Table used: `tcm_tally_cards` (not a view)
- Primary key: `id` (UUID)
- Config file: `src/lib/data/resources/tally_cards.config.ts`

### Step 0.2: View Definition ⏳ PENDING USER QUERIES

**Action Required:** Run SQL queries in `docs/diagnostics/tally-cards-edit-performance-queries.sql` to:
- Get view definition for `v_tcm_tally_cards_current` (if used)
- Check view dependencies
- Note: The `tally-cards` resource uses table `tcm_tally_cards`, not a view

### Step 0.3: Database Indexes ⏳ PENDING USER QUERIES

**Action Required:** Run SQL queries to:
- List all indexes on `tcm_tally_cards` table
- Verify `id` column has primary key/index
- Check indexes on other columns (warehouse_id, item_number, etc.)

### Step 0.4: Query Performance Analysis ⏳ PENDING USER QUERIES

**Action Required:** Run `EXPLAIN ANALYZE` queries to:
- Analyze the actual query pattern used by `provider.get(id)`
- Identify sequential scans, missing indexes, slow joins
- Document query execution time and costs

### Step 0.5: Options Loading Requirements ✅ COMPLETED

**Findings:**
- Options loaded for tally-cards edit form:
  - `"warehouses"` - Uses resource `"warehouses"` with filter `{ is_active: true }`, pageSize 500
  - `"items"` - Uses resource `"inventory-unique"`, pageSize 500
- Both options are loaded in parallel via `Promise.all()`
- If current `item_number` is not in first 500 results, an additional API call is made

**Files Reviewed:**
- `src/app/(main)/forms/tally-cards/new/form.config.ts` - Form configuration
- `src/lib/forms/extract-options-keys.ts` - Options extraction logic
- `src/lib/forms/options-providers.ts` - Options provider configuration

### Step 0.6: Performance Profiling ✅ COMPLETED

**Performance Logging Added:**
- `src/lib/forms/get-record-for-edit.ts` - Times config normalization, API fetch
- `src/lib/forms/load-options.ts` - Times each options fetch, total time
- `src/lib/api/handle-item.ts` - Times resource resolution, provider creation, database query
- `src/lib/supabase/factory.ts` - Times session context, scoping, database query, domain transform

**Next Steps:**
1. Load the edit page: `/forms/tally-cards/[id]/edit`
2. Check server console logs for timing information
3. Identify which operation takes the most time

### Step 0.7: Compare with Inventory Popup ⏳ PENDING USER QUERIES

**Action Required:** Run SQL queries to:
- Get `v_inventory_current` view definition
- Analyze inventory query performance with `EXPLAIN ANALYZE`
- Compare query patterns and execution times

## SQL Queries File

All SQL queries needed for validation are in:
`docs/diagnostics/tally-cards-edit-performance-queries.sql`

## Performance Logging

Performance logs have been added to the following functions:
- `getRecordForEdit()` - Logs config normalization, API fetch times
- `loadOptions()` - Logs each options fetch time, total time
- `getOneHandler()` - Logs resource resolution, provider creation, database query times
- `provider.get()` - Logs session context, scoping, database query, transform times

**To view logs:**
1. Start the development server
2. Navigate to `/forms/tally-cards/[id]/edit`
3. Check server console for `[getRecordForEdit]`, `[loadOptions]`, `[getOneHandler]`, and `[provider.get]` log entries

## Next Steps

1. **Run SQL Queries** - Execute queries from `tally-cards-edit-performance-queries.sql` in Supabase SQL Editor
2. **Test Performance** - Load the edit page and capture timing logs from server console
3. **Analyze Results** - Compare timing data with SQL query analysis to identify bottlenecks
4. **Phase 1** - Based on findings, determine optimization strategy








