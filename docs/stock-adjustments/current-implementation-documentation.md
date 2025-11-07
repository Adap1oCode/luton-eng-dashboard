# Stock Adjustments: Multi-Location & SCD2 Implementation Documentation

## Table of Contents

1. [Overview](#overview)
2. [Multi-Location Feature](#multi-location-feature)
3. [SCD2 Pattern Implementation](#scd2-pattern-implementation)
4. [Hash Mechanism](#hash-mechanism)
5. [Database Schema](#database-schema)
6. [Current Implementation](#current-implementation)
7. [Challenges & Issues](#challenges--issues)
8. [Data Flow](#data-flow)
9. [Known Limitations](#known-limitations)

---

## Overview

The Stock Adjustments feature allows users to record inventory adjustments with reason codes and support for either single-location or multi-location entries. The system uses a **Slowly Changing Dimension Type 2 (SCD2)** pattern to maintain a complete history of all changes, ensuring auditability and traceability.

### Key Components

- **Parent Entry**: `tcm_user_tally_card_entries` - Main adjustment record
- **Child Locations**: `tcm_user_tally_card_entry_locations` - Multiple location/quantity pairs for multi-location entries (managed as a standard resource)
- **View**: `v_tcm_user_tally_card_entries` - Current active records with aggregated child data
- **RPC Function**: `fn_user_entry_patch_scd2` - Handles SCD2 row creation (parent fields only)
- **Resource API**: `/api/resources/tcm_user_tally_card_entry_locations` - Standard CRUD operations for locations

---

## Multi-Location Feature

### Concept

The `multi_location` feature allows a single stock adjustment entry to be distributed across multiple physical locations, each with its own quantity. This is useful for scenarios where:

- Inventory is stored in multiple bins/locations
- A single adjustment affects multiple warehouse areas
- Detailed location-level tracking is required

### Two Modes of Operation

#### 1. Single Location Mode (`multi_location = false`)

- **Parent Fields Used**:
  - `location` (text): Single location identifier (e.g., "G5/G3")
  - `qty` (integer): Total adjustment quantity

- **Child Table**: Not used (empty)

- **Example**:
  ```json
  {
    "multi_location": false,
    "location": "G5",
    "qty": 100,
    "locations": []
  }
  ```

#### 2. Multi-Location Mode (`multi_location = true`)

- **Parent Fields**: 
  - `location` (text): Set to `NULL` (disabled)
  - `qty` (integer): Set to `NULL` (disabled)
  - **Effective quantity**: Sum of all child location quantities

- **Child Table**: Contains one or more rows in `tcm_user_tally_card_entry_locations`
  - Each row has: `location`, `qty`, `pos` (position/order)

- **Example**:
  ```json
  {
    "multi_location": true,
    "location": null,
    "qty": null,
    "locations": [
      {"location": "B5", "qty": 50, "pos": 1},
      {"location": "B6", "qty": 120, "pos": 2}
    ]
  }
  ```

### View Aggregation

The `v_tcm_user_tally_card_entries` view provides computed fields:

- **`effective_qty`**: 
  - If `multi_location = false`: Returns `qty` from parent
  - If `multi_location = true`: Returns `SUM(qty)` from child locations

- **`effective_location`**:
  - If `multi_location = false`: Returns `location` from parent
  - If `multi_location = true`: Returns comma-separated list of child locations (e.g., "B5, B6")

### Validation Rules

1. **Single Location Mode**:
   - `location` is required (non-empty string)
   - `qty` is required (non-null integer)
   - `locations` array must be empty or not provided

2. **Multi-Location Mode**:
   - `location` must be `NULL`
   - `qty` must be `NULL`
   - `locations` array must contain at least one valid entry
   - Each child location must have:
     - `location`: Non-empty string
     - `qty`: Valid integer
     - `pos`: Optional position number (auto-assigned if missing)

3. **Zero Quantity Rule**:
   - Zero quantities are only allowed when `reason_code = 'COUNT_CORRECTION'`
   - This is enforced via config: `allowsZeroQuantity(reasonCode)`

---

## SCD2 Pattern Implementation

### What is SCD2?

**Slowly Changing Dimension Type 2 (SCD2)** is a data warehousing pattern that preserves complete historical records by:

1. **Never updating existing rows** - All changes create new rows
2. **Maintaining temporal validity** - Each row represents the state at a point in time
3. **Identifying "current" records** - The latest row (by `updated_at`) is the active record

### Why SCD2 for Stock Adjustments?

- **Audit Trail**: Complete history of all changes
- **Compliance**: Regulatory requirements for inventory tracking
- **Debugging**: Ability to see exactly what changed and when
- **Rollback Analysis**: Can identify when issues were introduced

### How It Works

#### 1. Initial Entry Creation

When a new stock adjustment is created:

```sql
INSERT INTO tcm_user_tally_card_entries (
  updated_by_user_id,
  role_family,
  card_uid,
  tally_card_number,
  qty,
  location,
  note,
  reason_code,
  multi_location,
  updated_at
) VALUES (...);
```

- Creates first row with `updated_at = now()`
- This is the "current" record

#### 2. Update Operation (SCD2)

When an existing entry is updated:

1. **Load current record**: Get the latest row for `tally_card_number`
2. **Detect changes**: Compare new values with current values
3. **If changes detected**:
   - Create a **new row** with updated values
   - New row gets new `id` and `updated_at = now()`
   - Old row remains unchanged (historical record)
4. **If no changes**: Return existing row (idempotent)

#### 3. Determining "Current" Record

The view uses `DISTINCT ON` to select the latest record:

```sql
SELECT DISTINCT ON (e.tally_card_number)
  e.*
FROM tcm_user_tally_card_entries e
ORDER BY e.tally_card_number, e.updated_at DESC
```

- Groups by `tally_card_number`
- Orders by `updated_at DESC` (newest first)
- Takes first row (the current one)

#### 4. Child Locations Management

**Simplified Pattern**: Child locations are managed independently via the standard resource API:

- **Separate Resource**: `tcm_user_tally_card_entry_locations` is a standard resource (like warehouses, inventory)
- **Standard CRUD**: Locations are created, updated, and deleted via `/api/resources/tcm_user_tally_card_entry_locations`
- **No SCD2 Coupling**: Locations are not managed by the SCD2 function - they're decoupled
- **Aggregation**: After locations are updated, they are aggregated (sum qty, comma-separated locations) and the parent row is updated via SCD2

**Example Timeline**:

```
Time T1: Entry created
  - Parent row: id=1, multi_location=false, location="G5", qty=100
  - No child rows

Time T2: Switched to multi-location
  - Parent row: id=2, multi_location=true, location=null, qty=null (NEW SCD2 ROW)
  - Locations updated via resource API: entry_id=2, location="B5", qty=50
  - Locations updated via resource API: entry_id=2, location="B6", qty=50
  - Parent aggregated: qty=100, location="B5, B6" (via SCD2 update)
  - Old parent row (id=1) remains unchanged

Time T3: Updated child locations
  - Locations updated via resource API (delete old, insert new for entry_id=2)
  - Parent aggregated: qty=150, location="B5, B6" (via SCD2 update)
  - Parent row: id=3, multi_location=true (NEW SCD2 ROW if parent fields changed)
```

### SCD2 Benefits

1. **Complete History**: Every change is preserved
2. **Point-in-Time Queries**: Can query state at any timestamp
3. **Audit Compliance**: Full traceability
4. **No Data Loss**: Original records never modified

### SCD2 Challenges

1. **Storage Growth**: Table grows with every change
2. **Query Complexity**: Must filter for "current" records
3. **Referential Integrity**: Foreign keys must reference specific `id`, not `tally_card_number`
4. **Change Detection**: Must accurately detect what changed to avoid unnecessary rows

---

## Hash Mechanism

### Purpose

The hash mechanism prevents duplicate SCD2 rows when the same data is submitted multiple times (idempotency). It ensures that:

- Identical updates don't create multiple rows
- Race conditions are handled gracefully
- Constraint violations are prevented

### Hash Calculation

The hash (`hashdiff`) is calculated by the trigger function `fn_user_entry_set_hashdiff()`:

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

NEW.hashdiff := encode(extensions.digest(v_payload, 'sha256'), 'hex');
```

### Hash Components

The hash includes:

1. **`updated_by_user_id`**: User who made the change (ensures user-scoped uniqueness)
2. **`tally_card_number`**: Card identifier (anchor value)
3. **`card_uid`**: UUID reference to card (if available)
4. **`qty`**: Quantity (parent field)
5. **`location`**: Location (parent field)
6. **`note`**: Notes
7. **`role_family`**: Role ownership
8. **`reason_code`**: Reason for adjustment
9. **`multi_location`**: Multi-location flag

### Important: Child Locations NOT in Hash

**Critical Limitation**: The hash does **NOT** include child location data. This means:

- Two entries with identical parent fields but different child locations will have the **same hashdiff**
- The uniqueness constraint `uq_entries_uid_hash` only checks parent fields
- Child location changes must be detected separately

### Uniqueness Constraint

```sql
CONSTRAINT uq_entries_uid_hash UNIQUE (updated_by_user_id, card_uid, hashdiff)
WHERE (card_uid IS NOT NULL)
```

This constraint ensures:
- Same user cannot have duplicate hashdiffs for the same card
- Only applies when `card_uid IS NOT NULL`
- Prevents duplicate SCD2 rows for identical parent data

### Hash in RPC Function

The RPC function `fn_user_entry_patch_scd2` calculates the expected hashdiff **before** inserting:

```sql
-- Calculate expected hashdiff
v_payload := concat_ws(' | ', ...);
v_expected_hashdiff := encode(extensions.digest(v_payload, 'sha256'), 'hex');

-- Check if row with same hashdiff already exists
SELECT * INTO v_existing_row
FROM public.tcm_user_tally_card_entries
WHERE updated_by_user_id = v_me
  AND card_uid = v_card_uid
  AND hashdiff = v_expected_hashdiff
LIMIT 1;

IF FOUND THEN
  RETURN v_existing_row;  -- Idempotent: return existing instead of creating duplicate
END IF;
```

### Hash Challenges

1. **Child Locations Not Included**: Must compare child locations separately
2. **NULL Handling**: Must normalize NULLs consistently (`'∅'` placeholder)
3. **Text Normalization**: Must use `lower(btrim())` to avoid case/whitespace differences
4. **Race Conditions**: Two concurrent updates with same data can both calculate same hash

---

## Database Schema

### Parent Table: `tcm_user_tally_card_entries`

```sql
CREATE TABLE tcm_user_tally_card_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_by_user_id uuid NOT NULL REFERENCES users(id),
  role_family text NOT NULL,
  card_uid uuid REFERENCES tcm_tally_cards(card_uid),
  tally_card_number text NOT NULL,
  qty integer,
  location text,
  note text,
  reason_code text DEFAULT 'UNSPECIFIED',
  multi_location boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  hashdiff text NOT NULL,
  
  CONSTRAINT uq_entries_uid_hash UNIQUE (updated_by_user_id, card_uid, hashdiff)
    WHERE (card_uid IS NOT NULL)
);
```

**Key Columns**:
- `id`: Unique identifier (changes on each SCD2 update)
- `updated_by_user_id`: User who made the change
- `tally_card_number`: Anchor value (doesn't change across SCD2 versions)
- `hashdiff`: SHA256 hash of parent fields (for uniqueness check)
- `multi_location`: Flag indicating multi-location mode

### Child Table: `tcm_user_tally_card_entry_locations`

```sql
CREATE TABLE tcm_user_tally_card_entry_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES tcm_user_tally_card_entries(id),
  location text NOT NULL,
  qty integer NOT NULL,
  pos smallint,
  
  -- RLS policies ensure users can only manage locations for entries they own
);
```

**Key Columns**:
- `entry_id`: Foreign key to specific SCD2 parent row
- `location`: Location identifier
- `qty`: Quantity for this location
- `pos`: Position/order (for display)

**Important**: This table is **never updated or deleted**. New rows are inserted for each new SCD2 parent row.

### View: `v_tcm_user_tally_card_entries`

```sql
CREATE VIEW v_tcm_user_tally_card_entries AS
WITH ranked AS (
  SELECT 
    e.*,
    row_number() OVER (
      PARTITION BY e.role_family, e.card_key 
      ORDER BY e.updated_at DESC, e.id DESC
    ) AS rn
  FROM (
    -- Base query with joins
  ) e
),
child_agg AS (
  SELECT 
    l.entry_id,
    sum(l.qty) AS child_qty,
    string_agg(l.location, ', ' ORDER BY COALESCE(l.pos::integer, 32767)) AS child_locations_text
  FROM tcm_user_tally_card_entry_locations l
  GROUP BY l.entry_id
)
SELECT 
  r.*,
  CASE 
    WHEN r.multi_location THEN COALESCE(ca.child_qty, 0::bigint)
    ELSE r.qty::bigint
  END AS effective_qty,
  CASE 
    WHEN r.multi_location THEN COALESCE(ca.child_locations_text, r.location)
    ELSE r.location
  END AS effective_location
FROM ranked r
LEFT JOIN child_agg ca ON ca.entry_id = r.id
WHERE r.rn = 1;  -- Only current records
```

**Purpose**: Provides a "current records only" view with aggregated child location data.

---

## Current Implementation

### RPC Function: `fn_user_entry_patch_scd2`

**Location**: `supabase/migrations/20250131_final_stock_adjustments_update.sql`

**Signature**:
```sql
fn_user_entry_patch_scd2(
  p_id uuid,                    -- Entry ID to update
  p_reason_code text,           -- Reason code (optional)
  p_multi_location boolean,     -- Multi-location flag (optional)
  p_qty integer,                -- Quantity (optional)
  p_location text,              -- Location (optional)
  p_note text                   -- Note (optional)
)
RETURNS tcm_user_tally_card_entries
```

**Flow**:

1. **Resolve User**: Get `users.id` from `auth.uid()`
2. **Load Entry**: Load row by `p_id`
3. **Get Current**: Get latest row for `tally_card_number` (with `FOR UPDATE` lock)
4. **Detect Changes**: Compare parent fields only (`qty`, `location`, `note`, `reason_code`, `multi_location`)
5. **If No Changes**: Return existing row
6. **Calculate Hashdiff**: Compute expected hash (parent fields only)
7. **Pre-Insert Check**: Query for existing row with same hashdiff
8. **If Exists**: Return existing row (idempotent)
9. **Insert New Row**: Create new SCD2 row
10. **Handle Constraint Violation**: If race condition, query and return existing row

**Note**: Child locations are NOT managed by this function. They are handled separately via the resource API.

**Key Logic Sections**:

#### Change Detection

**Simplified**: Only checks parent fields:

```sql
-- Individual field checks (parent fields only)
IF (p_qty IS NOT NULL AND (p_qty IS DISTINCT FROM v_old_current.qty)) THEN
  v_has_changes := true;
END IF;
IF (p_location IS NOT NULL AND (p_location IS DISTINCT FROM v_old_current.location)) THEN
  v_has_changes := true;
END IF;
IF (p_note IS NOT NULL AND (p_note IS DISTINCT FROM v_old_current.note)) THEN
  v_has_changes := true;
END IF;
IF (p_reason_code IS NOT NULL AND (p_reason_code IS DISTINCT FROM COALESCE(v_old_current.reason_code, 'UNSPECIFIED'))) THEN
  v_has_changes := true;
END IF;
IF (p_multi_location IS NOT NULL AND (p_multi_location IS DISTINCT FROM COALESCE(v_old_current.multi_location, false))) THEN
  v_has_changes := true;
END IF;
```

**No child location comparison** - locations are managed separately via resource API.

### API Route: `/api/stock-adjustments/[id]/actions/patch-scd2`

**Location**: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`

**Flow**:

1. **Parse Payload**: Extract parent fields from request body
2. **Call RPC**: Invoke `fn_user_entry_patch_scd2` with parent fields only (no locations)
3. **Fetch Enriched Data**: Query view for warehouse, user name, etc.
4. **Fetch Child Locations**: If `multi_location = true`, fetch child rows from resource API
5. **Return Response**: Include parent row + child locations

**Key Code**:

```typescript
// Call RPC with parent fields only
const result = await sb.rpc("fn_user_entry_patch_scd2", {
  p_id: id,
  p_reason_code: payload.reason_code ?? null,
  p_multi_location: payload.multi_location ?? null,
  p_qty: payload.qty ?? null,
  p_location: payload.location ?? null,
  p_note: payload.note ?? null,
});
```

**Note**: Child locations are managed separately via `/api/resources/tcm_user_tally_card_entry_locations`.

### Form Components

#### `StockAdjustmentFormWrapper`

**Location**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx`

**Responsibilities**:
- Wraps `DynamicForm` with custom submit handler
- Captures locations via `LocationsCapture` component
- Updates parent entry first (to get entry_id)
- Updates locations via resource API
- Aggregates locations and updates parent via SCD2
- Handles redirect after successful update

**Key Logic**:

```typescript
// Step 1: Create/update parent entry
const result = await fetch(endpoint, { method, body: JSON.stringify(processedValues) });
const currentEntryId = result.row?.id || result.id || entryId;

// Step 2: If multi_location, update locations via resource API
if (processedValues.multi_location) {
  // Delete existing locations
  await fetch(`/api/resources/tcm_user_tally_card_entry_locations/bulk`, {
    method: "DELETE",
    body: JSON.stringify({ ids: existingLocationIds }),
  });
  
  // Insert new locations
  for (const loc of cleanLocations) {
    await fetch(`/api/resources/tcm_user_tally_card_entry_locations`, {
      method: "POST",
      body: JSON.stringify({ entry_id: currentEntryId, ...loc }),
    });
  }
  
  // Step 3: Aggregate and update parent
  const locations = await fetch(`/api/resources/tcm_user_tally_card_entry_locations?entry_id=eq.${currentEntryId}`);
  const totalQty = locations.rows.reduce((sum, loc) => sum + loc.qty, 0);
  const locationsText = locations.rows.map(loc => loc.location).join(", ");
  
  // Update parent via SCD2
  await fetch(`/api/stock-adjustments/${currentEntryId}/actions/patch-scd2`, {
    method: "POST",
    body: JSON.stringify({ qty: totalQty, location: locationsText, multi_location: true }),
  });
}
```

#### `StockAdjustmentFormWithLocations`

**Location**: `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-with-locations.tsx`

**Responsibilities**:
- Manages locations table UI
- Loads existing locations on edit via resource API
- Handles add/remove location actions
- Computes total quantity
- Updates form values via `setValue`

**Key Operations**:

```typescript
// Load existing locations via resource API
useEffect(() => {
  if (entryId && multiLocation) {
    fetch(`/api/resources/tcm_user_tally_card_entry_locations?entry_id=eq.${entryId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.rows && Array.isArray(data.rows)) {
          setValue("locations", data.rows.map(loc => ({
            id: loc.id,
            location: loc.location,
            qty: loc.qty,
            pos: loc.pos,
          })));
        }
      });
  }
}, [entryId, multiLocation, setValue]);

// Add/remove locations (updates form state only - actual save happens in wrapper)
const handleAddLocation = (location: string, qty: number) => {
  const newLocation: LocationRow = {
    id: `temp-${Date.now()}-${Math.random()}`,
    location,
    qty,
    pos: locationRows.length + 1,
  };
  setValue("locations", [...locationRows, newLocation], { 
    shouldValidate: true, 
    shouldDirty: true 
  });
};
```

---

## Challenges & Issues

### 1. Duplicate Key Constraint Violations

**Error**: `duplicate key value violates unique constraint "uq_entries_uid_hash"`

**Root Causes**:

1. **Hashdiff Doesn't Include Child Locations**:
   - Two updates with same parent fields but different child locations have same hashdiff
   - Constraint only checks parent fields
   - Must compare child locations separately

2. **Change Detection Gaps**:
   - Complex location transition logic may miss edge cases
   - Empty arrays vs NULL handling
   - Order-dependent comparisons

3. **Race Conditions**:
   - Concurrent updates can both pass pre-insert check
   - Both attempt INSERT with same hashdiff
   - Second one fails with constraint violation

**Current Mitigations**:

- Pre-insert hashdiff check
- `SELECT ... FOR UPDATE` locking
- Exception handler for constraint violations
- Separate child location comparison

**Remaining Issues**:

- Child location comparison is complex and brittle
- May still miss edge cases in location transitions
- Race condition handling may not cover all scenarios

### 2. Child Locations Not Being Inserted

**Symptom**: Update succeeds, but `tcm_user_tally_card_entry_locations` remains empty.

**Possible Causes**:

1. **Form State Not Captured**:
   - `LocationsCapture` component may not be updating form values
   - `currentLocations` state may be empty at submission time
   - Form values may not include locations array

2. **RPC Function Logic**:
   - Condition `v_should_insert_locations` may be false
   - `p_locations` may be NULL or empty
   - `v_new.id` may not be set correctly

3. **API Route**:
   - Locations array may not be properly formatted
   - JSONB conversion may fail
   - Filtering may remove all locations

**Debugging Steps**:

1. Check form logs: `[StockAdjustmentFormWrapper] Submitting payload`
2. Check API logs: `[patch-scd2] RPC parameters`
3. Check database logs: `[SCD2]` NOTICE messages
4. Query child table: `SELECT * FROM tcm_user_tally_card_entry_locations WHERE entry_id = ?`

### 3. Complex Change Detection Logic

**Issue**: The location transition logic is complex and hard to maintain:

```sql
-- Handles: false→true, true→false, true→true
-- Compares: counts, individual locations, quantities
-- Edge cases: empty arrays, NULL values, order differences
```

**Problems**:

- **Brittle**: Small changes can break edge cases
- **Hard to Test**: Many combinations to cover
- **Hard to Debug**: Complex nested conditions
- **Performance**: Multiple queries and loops

**Alternative Approaches Considered**:

1. **Hash-Based Comparison**: Create hash of sorted child locations, compare hashes
2. **Simplified Logic**: Always insert child locations, let database handle duplicates
3. **Separate Change Detection**: Detect parent changes separately from child changes

### 4. Form State Management

**Issue**: Locations array may not be in form values when submitting.

**Current Approach**:

- `LocationsCapture` component watches form values
- Updates `currentLocations` state in parent
- Parent uses `currentLocations` in submit handler

**Problems**:

- Two sources of truth (form values vs state)
- Timing issues (state may not be updated)
- `raw_locations: undefined` in logs suggests form values don't include locations

**Potential Solutions**:

1. Ensure `setValue("locations", ...)` is called with `shouldDirty: true`
2. Use form values directly instead of separate state
3. Add hidden form field for locations array

### 5. RLS Policy Complexity

**Issue**: RLS policies must check if entry is "current" (latest by `updated_at`).

**Current Policy**:

```sql
CREATE POLICY "Users can manage locations for entries they can edit"
ON tcm_user_tally_card_entry_locations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tcm_user_tally_card_entries e
    WHERE e.id = tcm_user_tally_card_entry_locations.entry_id
      AND e.updated_at = (
        SELECT MAX(updated_at)
        FROM tcm_user_tally_card_entries
        WHERE tally_card_number = e.tally_card_number
      )
  )
);
```

**Challenges**:

- Subquery performance
- Must match parent table RLS
- Complex to maintain

### 6. View Performance

**Issue**: View uses `DISTINCT ON` and window functions, which can be slow on large tables.

**Current View**:

```sql
WITH ranked AS (
  SELECT 
    e.*,
    row_number() OVER (PARTITION BY ... ORDER BY ...) AS rn
  FROM ...
)
SELECT * FROM ranked WHERE rn = 1
```

**Optimization Opportunities**:

- Add index on `(tally_card_number, updated_at DESC)`
- Consider materialized view for frequently accessed data
- Cache current records in application layer

---

## Data Flow

### Create Flow

1. **User fills form** → Form state updated
2. **User clicks "Create"** → `onSubmit` handler
3. **Form wrapper**:
   - Step 1: Creates parent entry → Gets entry_id
   - Step 2: If multi-location: Creates locations via resource API
   - Step 3: If multi-location: Aggregates locations (sum qty, comma-separated locations)
   - Step 4: Updates parent via SCD2 with aggregated values
4. **Redirect to edit page** → Load new entry

### Update Flow

1. **User loads edit page** → Fetch current entry + child locations via resource API
2. **User modifies form** → Form state updated
3. **User clicks "Update"** → `onSubmit` handler
4. **Form wrapper**:
   - Step 1: Updates parent entry → Gets entry_id
   - Step 2: If multi-location: Updates locations via resource API (delete old, insert new)
   - Step 3: If multi-location: Aggregates locations (sum qty, comma-separated locations)
   - Step 4: Updates parent via SCD2 with aggregated values
5. **SCD2 RPC function**:
   - Loads current entry
   - Detects changes (parent fields only)
   - If changed: Creates new SCD2 row
6. **Form redirects** → To new entry's edit page (new ID from SCD2)

### Read Flow

1. **User views list** → Query `v_tcm_user_tally_card_entries`
2. **View filters** → `WHERE rn = 1` (current records only)
3. **View aggregates** → Child locations via `child_agg` CTE
4. **View computes** → `effective_qty` and `effective_location`
5. **User clicks entry** → Load edit page
6. **Edit page fetches** → Current entry + child locations
7. **Form populates** → With current values

---

## Known Limitations

### 1. Hash Doesn't Include Child Locations

**Impact**: Two entries with identical parent fields but different child locations will have the same hashdiff.

**Solution**: This is intentional and correct. Child locations are managed separately and aggregated into parent fields (`qty`, `location`) after updates. The hash only needs to reflect parent field changes, which includes the aggregated values.

**No workaround needed** - this is the desired behavior.

### 2. No Automatic Cleanup

**Impact**: Historical child location rows accumulate indefinitely.

**Workaround**: Manual cleanup scripts if needed.

**Future Consideration**: Archive/delete old records after retention period.

### 3. View Performance on Large Tables

**Impact**: View queries can be slow with many SCD2 rows.

**Workaround**: Add indexes, consider materialized view.

**Future Consideration**: Implement caching layer.

### 4. ~~Complex Change Detection~~ (RESOLVED)

**Previous Issue**: Complex nested logic comparing child locations in RPC function.

**Solution**: Simplified to only check parent fields. Child locations are managed separately via resource API and aggregated into parent fields after updates.

**Status**: ✅ Resolved - Change detection is now simple and maintainable.

### 5. Form State Synchronization

**Impact**: Locations are managed in form state and synced to resource API on submit.

**Solution**: `LocationsCapture` component watches form values and updates `currentLocations` state, which is used as source of truth during submission.

**Status**: ✅ Working as designed - locations are captured from form state and persisted via resource API.

---

## Testing Scenarios

### Scenario 1: Single Location Update

**Input**:
```json
{
  "multi_location": false,
  "location": "G5",
  "qty": 100,
  "reason_code": "DAMAGE"
}
```

**Expected**:
- New SCD2 row created
- `location = "G5"`, `qty = 100`
- No child location rows

### Scenario 2: Switch to Multi-Location

**Input** (from single location):
```json
{
  "multi_location": true,
  "location": null,
  "qty": null,
  "locations": [
    {"location": "B5", "qty": 50, "pos": 1},
    {"location": "B6", "qty": 50, "pos": 2}
  ]
}
```

**Expected**:
- New SCD2 row created
- `multi_location = true`, `location = null`, `qty = null`
- Two child location rows inserted via resource API
- Parent aggregated: `qty = 100`, `location = "B5, B6"` (via SCD2 update)

### Scenario 3: Update Child Locations

**Input** (from multi-location):
```json
{
  "multi_location": true,
  "locations": [
    {"location": "B5", "qty": 100, "pos": 1},
    {"location": "B6", "qty": 50, "pos": 2}
  ]
}
```

**Expected**:
- Locations updated via resource API (delete old, insert new)
- Parent aggregated: `qty = 150`, `location = "B5, B6"` (via SCD2 update)
- New SCD2 row created (if parent fields changed after aggregation)

### Scenario 4: No Changes

**Input** (same as current):
```json
{
  "multi_location": true,
  "locations": [
    {"location": "B5", "qty": 50, "pos": 1},
    {"location": "B6", "qty": 50, "pos": 2}
  ]
}
```

**Expected**:
- No new SCD2 row created
- Existing row returned
- No child location changes

### Scenario 5: Race Condition

**Input**: Two concurrent updates with identical data

**Expected**:
- First update creates new row
- Second update detects existing row (via hashdiff check or constraint violation)
- Returns existing row (idempotent)

---

## Conclusion

The current implementation provides a robust SCD2 pattern with multi-location support, but faces challenges in:

1. **Complexity**: Change detection logic is intricate and brittle
2. **Reliability**: Child locations may not always be inserted correctly
3. **Maintainability**: Hard to understand and modify
4. **Performance**: View queries and change detection can be slow

**Recommendations for Future Enhancement**:

1. **Simplify Change Detection**: Use hash-based comparison for child locations
2. **Improve Form State**: Ensure locations are always in form values
3. **Add Comprehensive Tests**: Cover all transition scenarios
4. **Optimize Performance**: Add indexes, consider caching
5. **Better Logging**: More detailed diagnostics for debugging

This documentation should provide a complete picture for another agent to review and enhance the solution.

