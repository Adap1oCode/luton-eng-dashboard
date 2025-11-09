# Stock Adjustments SCD2 Pattern Analysis & Standardization Plan

## Executive Summary

This document maps the current Stock Adjustments Edit flow end-to-end, compares it with the Tally Cards SCD2 pattern, and proposes a standardization approach for a shared SCD2 model.

---

## Part 1: Current Stock Adjustments Architecture Flow

### 1.1 Edit Screen Entry Point

**File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`

- Server component that loads the edit form
- Finds latest entry by `tally_card_number` (SCD2 may have multiple versions)
- Calls `getRecordForEdit()` to fetch current record
- Renders form with action: `/api/stock-adjustments/${id}/actions/patch-scd2`

### 1.2 Form Submission Flow

**File**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx`

**Multi-step process**:

1. **Parent Update**: POST to `/api/stock-adjustments/${id}/actions/patch-scd2`
   - Sends parent fields only: `reason_code`, `multi_location`, `qty`, `location`, `note`
   - Gets new `entry_id` (may change if SCD2 creates new row)

2. **Child Locations Update** (if `multi_location = true`):
   - Fetches existing locations via `/api/tcm_user_tally_card_entry_locations?entry_id=${id}`
   - Deletes all existing locations via bulk DELETE
   - Inserts new locations one-by-one via POST
   - Aggregates locations and updates parent again via SCD2:
     - Calculates `totalQty = SUM(locations.qty)`
     - Sets `location = locations.map(l => l.location).join(", ")`
     - Calls SCD2 again to update parent with aggregated values

3. **Location Migration** (if SCD2 created new parent row):
   - If `newEntryId !== currentEntryId`, moves locations from old `entry_id` to new `entry_id`
   - Deletes old locations, inserts with new `entry_id`

### 1.3 API Route Handler

**File**: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`

- Validates `id` parameter
- Extracts parent fields from payload
- Calls RPC: `fn_user_entry_patch_scd2(p_id, p_reason_code, p_multi_location, p_qty, p_location, p_note)`
- Fetches enriched row from view `v_tcm_user_tally_card_entries`
- Fetches child locations if `multi_location = true`
- Returns combined response

**Note**: Child locations are NOT passed to RPC function (removed in migration `20250202_remove_locations_from_scd2.sql`)

### 1.4 RPC Function: `fn_user_entry_patch_scd2`

**File**: `supabase/migrations/20250202_remove_locations_from_scd2.sql`

**SCD2 Boundary**: Starts at RPC function entry, ends after INSERT

**Process**:

1. **Resolve User**: Maps `auth.uid()` → `users.id` (app_user_id)

2. **Load Current Record**:
   - Finds record by `p_id`
   - Gets latest version by `tally_card_number` with `FOR UPDATE` lock
   - Uses `tally_card_number` as anchor (doesn't change across versions)

3. **Change Detection**:
   - Compares each parameter with current values using `IS DISTINCT FROM`
   - Fields checked: `qty`, `location`, `note`, `reason_code`, `multi_location`
   - If no changes, returns existing row (no-op)

4. **Hashdiff Calculation** (pre-insert check):
   - Builds payload string: `updated_by_user_id | tally_card_number | card_uid | qty | location | note | role_family | reason_code | multi_location`
   - Normalizes: `lower(btrim())` for text, `'∅'` for NULLs, `'unspecified'` for NULL reason_code
   - Calculates: `encode(extensions.digest(payload, 'sha256'), 'hex')`

5. **Duplicate Check** (idempotency):
   - Queries for existing row: `WHERE updated_by_user_id = v_me AND card_uid = v_card_uid AND hashdiff = v_expected_hashdiff`
   - If found, returns existing row (prevents duplicate on retry)

6. **Insert New SCD2 Row**:
   - Inserts with `COALESCE(p_*, v_old_current.*)` pattern
   - Sets `updated_at = now()`
   - Trigger `trg_user_entry_set_hashdiff` fires BEFORE INSERT to set `hashdiff`
   - Unique constraint: `uq_entries_uid_hash (updated_by_user_id, card_uid, hashdiff) WHERE card_uid IS NOT NULL`

7. **Race Condition Handling**:
   - Wraps INSERT in `BEGIN...EXCEPTION WHEN unique_violation`
   - On constraint violation, queries for existing row and returns it
   - Prevents duplicate rows from concurrent requests

8. **Return**: Returns new row (or existing if duplicate/race)

**Key Points**:
- Child locations NOT handled in RPC (managed separately)
- Hashdiff does NOT include child locations (parent fields only)
- `updated_at` used for temporal ordering (not `snapshot_at`)
- Anchor: `tally_card_number` (text, not UUID)

### 1.5 Hashdiff Trigger Function

**File**: `supabase/migrations/20250131_final_stock_adjustments_update.sql` (lines 674-704)

**Function**: `fn_user_entry_set_hashdiff()`

- Trigger: `BEFORE INSERT OR UPDATE`
- Calculates hashdiff using same payload format as RPC function
- Uses `extensions.digest()` (Supabase schema)
- Sets `NEW.hashdiff` before insert

**Important**: Child locations NOT included in hash (BEFORE INSERT trigger can't access child rows)

### 1.6 Child Locations Management

**Resource Config**: `src/lib/data/resources/tcm_user_tally_card_entry_locations.config.ts`

- Standard resource API: `/api/tcm_user_tally_card_entry_locations`
- CRUD operations via Supabase provider
- Foreign key: `entry_id` → `tcm_user_tally_card_entries(id)`
- **SCD2 Behavior**: Child rows are NOT versioned; they reference specific parent `id`
- When parent gets new SCD2 row, child locations must be moved to new `entry_id`

**Current Flow Issues**:
- Child locations deleted/recreated on every edit (not SCD2-preserved)
- If SCD2 creates new parent row, locations must be manually moved
- No automatic linkage between parent SCD2 and child history

---

## Part 2: Tally Cards SCD2 Pattern Comparison

### 2.1 Tally Cards RPC Function

**File**: `supabase/migrations/20250201_fix_tally_card_patch_scd2_search_path.sql`

**Function**: `fn_tally_card_patch_scd2`

**Key Differences from Stock Adjustments**:

| Aspect | Stock Adjustments | Tally Cards |
|--------|------------------|-------------|
| **Anchor** | `tally_card_number` (text) | `card_uid` (UUID) |
| **Temporal Field** | `updated_at` | `snapshot_at` |
| **User Scoping** | `updated_by_user_id` (user-scoped uniqueness) | None (global uniqueness) |
| **Uniqueness Constraint** | `(updated_by_user_id, card_uid, hashdiff)` | `(card_uid, hashdiff)` (implied) |
| **Hashdiff Fields** | Includes `updated_by_user_id` | Excludes user (no user dimension) |
| **Child Tables** | `tcm_user_tally_card_entry_locations` | None |
| **Return Type** | Single row (`RETURNS tcm_user_tally_card_entries`) | Table (`RETURNS TABLE`) |

**Similarities**:
- Both use `FOR UPDATE` lock on current record
- Both check for changes before insert
- Both calculate hashdiff pre-insert
- Both handle race conditions via unique constraint + exception
- Both use `SET search_path TO 'public'`
- Both use `SECURITY DEFINER`

### 2.2 Hashdiff Calculation Comparison

**Stock Adjustments** (`fn_user_entry_set_hashdiff`):
```sql
v_payload := concat_ws(' | ',
  coalesce(NEW.updated_by_user_id::text, '∅'),
  coalesce(lower(btrim(NEW.tally_card_number)), '∅'),
  coalesce(NEW.card_uid::text, '∅'),
  coalesce(NEW.qty::text, '∅'),
  coalesce(lower(btrim(NEW.location)), '∅'),
  coalesce(lower(btrim(NEW.note)), '∅'),
  coalesce(lower(btrim(NEW.role_family)), '∅'),
  coalesce(lower(btrim(NEW.reason_code)), 'unspecified'),
  coalesce(NEW.multi_location::text, 'false')
);
```

**Tally Cards** (`fn_tally_card_set_hashdiff`):
```sql
v_payload := concat_ws(' | ',
  coalesce(NEW.card_uid::text, '∅'),
  coalesce(NEW.warehouse_id::text, '∅'),
  coalesce(lower(btrim(NEW.tally_card_number)), '∅'),
  coalesce(NEW.item_number::text, '∅'),
  coalesce(lower(btrim(NEW.note)), '∅'),
  coalesce(NEW.is_active::text, 'true')
);
```

**Key Differences**:
- Stock Adjustments includes user scoping (`updated_by_user_id`)
- Stock Adjustments includes role (`role_family`)
- Different field sets (business domain specific)
- Both normalize text with `lower(btrim())`
- Both use `'∅'` for NULLs

---

## Part 3: Gap Analysis & Issues

### 3.1 Parent-Child Linkage Issues

**Current Problem**:
- Child locations reference parent `id` (which changes on SCD2 insert)
- When parent gets new SCD2 row, child locations must be manually moved
- No automatic SCD2 preservation of child data
- Child locations deleted/recreated on edit (loses history)

**Ideal SCD2 Pattern**:
- Child rows should reference anchor value (e.g., `tally_card_number`) OR
- Child rows should be versioned with parent (same `updated_at`/`snapshot_at`)
- Child history should be preserved automatically

### 3.2 Hashdiff Limitations

**Issue**: Child locations NOT included in hashdiff

**Impact**:
- Two parent rows with identical parent fields but different child locations will have same `hashdiff`
- Uniqueness constraint won't detect child location changes
- Must manually check child locations in RPC function (removed in latest version)

**Current Workaround**:
- Child locations managed separately
- Parent updated again after child locations change (triggers new SCD2 row)

### 3.3 Business Logic Duplication

**Location**: Client-side form wrapper + API route + RPC function

**Duplication**:
- Change detection logic (client checks, RPC checks)
- Aggregation logic (client calculates totals, view calculates totals)
- Location migration logic (client handles moving locations to new parent)

### 3.4 Race Condition Handling

**Current**: Both patterns handle races via unique constraint + exception

**Potential Issue**: If two requests update parent simultaneously:
1. Both detect changes
2. Both calculate same hashdiff
3. First insert succeeds
4. Second insert fails constraint, queries for existing row
5. Both return same row (correct behavior)

**Edge Case**: If child locations updated between parent checks, may create inconsistent state

---

## Part 4: Standardization Proposal

### 4.1 Shared SCD2 Base Function Pattern

**Proposed Structure**:

```sql
CREATE OR REPLACE FUNCTION public.fn_scd2_patch_base(
  p_table_name text,           -- Target table
  p_id uuid,                   -- Current record ID
  p_anchor_column text,        -- Anchor column name (e.g., 'tally_card_number', 'card_uid')
  p_temporal_column text,      -- Temporal column name (e.g., 'updated_at', 'snapshot_at')
  p_hashdiff_config jsonb,     -- Column list for hashdiff calculation
  p_update_fields jsonb,       -- Fields to update
  p_user_scoped boolean DEFAULT false  -- Whether to include user_id in uniqueness
) RETURNS jsonb
```

**Config-Driven Approach**:
- Column sets defined in config (per resource)
- Hashdiff fields defined in config
- Anchor column defined in config
- Temporal column defined in config

**Benefits**:
- Single function handles all SCD2 logic
- Consistent change detection
- Consistent hashdiff calculation
- Consistent race condition handling

### 4.2 Resource-Specific Wrapper Functions

**Pattern**:
```sql
CREATE OR REPLACE FUNCTION public.fn_user_entry_patch_scd2(...)
RETURNS tcm_user_tally_card_entries
AS $$
  SELECT fn_scd2_patch_base(
    'tcm_user_tally_card_entries',
    p_id,
    'tally_card_number',
    'updated_at',
    '["updated_by_user_id", "tally_card_number", "card_uid", "qty", "location", "note", "role_family", "reason_code", "multi_location"]'::jsonb,
    jsonb_build_object(
      'reason_code', p_reason_code,
      'multi_location', p_multi_location,
      'qty', p_qty,
      'location', p_location,
      'note', p_note
    ),
    true  -- user_scoped
  )::tcm_user_tally_card_entries;
$$;
```

### 4.3 Child Table SCD2 Integration

**Option A: Anchor-Based Linkage**
- Child tables reference anchor value (e.g., `tally_card_number`) instead of `id`
- View joins on anchor + temporal column to get current child rows
- Child rows automatically "versioned" with parent

**Option B: Temporal Join Pattern**
- Child tables include temporal column (`updated_at`/`snapshot_at`)
- Child rows inserted with same temporal value as parent
- View joins on anchor + temporal to get matching child rows

**Option C: Separate Child SCD2**
- Child tables have their own SCD2 pattern
- Linkage via anchor value + temporal range
- More complex but preserves independent child history

### 4.4 Migration Strategy

**Phase 1: Extract Common Logic**
1. Create `fn_scd2_patch_base` with config-driven approach
2. Keep existing wrapper functions (backward compatible)
3. Test with both Stock Adjustments and Tally Cards

**Phase 2: Standardize Hashdiff**
1. Move hashdiff calculation to shared function
2. Update trigger functions to call shared logic
3. Ensure consistent normalization

**Phase 3: Child Table Integration**
1. Decide on linkage pattern (Option A/B/C)
2. Migrate child location handling to shared pattern
3. Update views to use new linkage

**Phase 4: Client Simplification**
1. Remove client-side aggregation logic
2. Rely on server-side SCD2 function for all changes
3. Simplify form wrapper (remove location migration code)

---

## Part 5: Implementation Considerations

### 5.1 What's Generic & Reusable

**Fully Generic**:
- Change detection logic (`IS DISTINCT FROM` comparison)
- Hashdiff calculation (with config-driven field list)
- Duplicate/race condition handling
- Temporal ordering (`ORDER BY temporal_column DESC`)
- Anchor-based current record lookup

**Partially Generic** (needs customization):
- Field lists (per resource)
- Hashdiff field selection (per resource)
- User scoping (some resources have it, some don't)
- Return type (single row vs table)

**Resource-Specific**:
- Business validation rules
- Child table relationships
- Aggregation logic (if any)

### 5.2 What Needs Customization Per Resource

1. **Column Configuration**:
   - Which columns are updatable
   - Which columns go in hashdiff
   - Anchor column name
   - Temporal column name

2. **Uniqueness Scope**:
   - User-scoped vs global
   - Additional dimensions (e.g., `role_family`)

3. **Child Table Handling**:
   - Whether child tables exist
   - Linkage pattern (anchor vs temporal)
   - Aggregation requirements

4. **Business Rules**:
   - Validation logic
   - Default values
   - Computed fields

### 5.3 Safety Considerations

**Backward Compatibility**:
- Keep existing RPC function signatures
- Wrapper functions call shared base
- No breaking changes to API routes

**Testing Strategy**:
- Unit tests for shared SCD2 logic
- Integration tests for each resource
- E2E tests for edit flows
- Race condition stress tests

**Rollback Plan**:
- Shared function can be disabled via feature flag
- Fall back to resource-specific functions
- Database migrations reversible

---

## Part 6: Recommendations

### 6.1 Immediate Actions (Discovery Complete)

1. **Document Current State**: ✅ This document
2. **Validate Assumptions**: Test both patterns in staging
3. **Identify All Resources**: List all resources using SCD2

### 6.2 Short-Term (Standardization Prep)

1. **Create Shared Base Function**: Extract common SCD2 logic
2. **Standardize Hashdiff Triggers**: Use shared calculation function
3. **Update Documentation**: Document shared pattern

### 6.3 Long-Term (Full Standardization)

1. **Migrate Child Tables**: Implement anchor-based or temporal linkage
2. **Simplify Client Code**: Remove location migration logic
3. **Add Tests**: Comprehensive test coverage for shared pattern

---

## Appendix: Key Files Reference

### Stock Adjustments
- Edit Page: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`
- Form Wrapper: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx`
- API Route: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
- RPC Function: `supabase/migrations/20250202_remove_locations_from_scd2.sql`
- Hashdiff Trigger: `supabase/migrations/20250131_final_stock_adjustments_update.sql` (lines 674-704)

### Tally Cards
- API Route: `src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts`
- RPC Function: `supabase/migrations/20250201_fix_tally_card_patch_scd2_search_path.sql`
- Hashdiff Trigger: `supabase/migrations/20250201_create_tally_card_hashdiff_function.sql`

### Child Locations
- Resource Config: `src/lib/data/resources/tcm_user_tally_card_entry_locations.config.ts`
- Create Handler: `src/app/api/forms/stock-adjustments/route.ts`

---

## Summary: How Edits Are Processed

### Stock Adjustments Edit Flow

1. **User submits form** → Client wrapper (`stock-adjustment-form-wrapper.tsx`)
2. **Parent update** → POST `/api/stock-adjustments/${id}/actions/patch-scd2`
3. **RPC call** → `fn_user_entry_patch_scd2()` with parent fields
4. **SCD2 logic** (in RPC):
   - Load current record by `tally_card_number` with `FOR UPDATE`
   - Detect changes (compare each field)
   - Calculate hashdiff (parent fields only)
   - Check for duplicate (idempotency)
   - Insert new row if changes detected
   - Handle race conditions
5. **Child locations** (if `multi_location = true`):
   - Client deletes old locations via resource API
   - Client inserts new locations via resource API
   - Client aggregates and updates parent again via SCD2
   - Client migrates locations if parent `id` changed
6. **Response** → Enriched row with child locations

### SCD2 Boundary

- **Starts**: RPC function entry (`fn_user_entry_patch_scd2`)
- **Ends**: After INSERT completes (new row created or existing returned)
- **Excludes**: Child location management (handled separately in client)

### Race Conditions & Duplicates

- **Prevention**: `FOR UPDATE` lock on current record
- **Detection**: Hashdiff uniqueness constraint
- **Handling**: Exception handler queries for existing row on constraint violation
- **Result**: Idempotent (same request returns same row)

### Hashdiff Interaction

- **Calculation**: Trigger function (`fn_user_entry_set_hashdiff`) sets `hashdiff` on INSERT
- **Uniqueness**: Constraint `uq_entries_uid_hash (updated_by_user_id, card_uid, hashdiff)`
- **Scope**: Parent fields only (excludes child locations)
- **Normalization**: `lower(btrim())` for text, `'∅'` for NULLs

### RLS Interaction

- **User Resolution**: RPC maps `auth.uid()` → `users.id` (app_user_id)
- **RLS Policies**: Applied to table queries in RPC function
- **Security**: `SECURITY DEFINER` allows RPC to bypass caller's RLS, but function logic enforces user scoping

### Generic vs Customizable

**Generic (reusable)**:
- Change detection pattern (`IS DISTINCT FROM`)
- Hashdiff calculation algorithm
- Race condition handling
- Temporal ordering logic

**Customizable (per resource)**:
- Field lists for hashdiff
- Anchor column (text vs UUID)
- Temporal column (`updated_at` vs `snapshot_at`)
- User scoping (yes/no)
- Child table linkage pattern



