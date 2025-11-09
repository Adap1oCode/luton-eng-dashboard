# SCD2 (Slowly Changing Dimension Type 2) Complete Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Table Definitions](#table-definitions)
4. [Configuration System](#configuration-system)
5. [Core Functions](#core-functions)
6. [Parent-Child Pattern](#parent-child-pattern)
7. [Complete SQL Reference](#complete-sql-reference)
8. [Usage Examples](#usage-examples)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This SCD2 implementation provides a **production-ready, config-driven pattern** for tracking historical changes to dimension data. Instead of updating existing records, new rows are created for each change, preserving complete history.

### Key Features

- **Config-driven**: Resource definitions stored in `scd2_resource_config` table
- **Single source of truth**: One hash function (`fn_scd2_hash`) used by both wrapper and trigger
- **Type-safe**: JSONB operations preserve numeric/boolean types (not string conversions)
- **Idempotent**: Unique constraints prevent duplicate rows with same hashdiff
- **Generic**: Works with any table/resource via configuration
- **Backward compatible**: Legacy v1/v2 functions remain unchanged

---

## Core Concepts

### SCD2 Pattern

**Slowly Changing Dimension Type 2** creates a new row for each change rather than updating the existing row. This preserves complete history.

**Example:**
```
Before update:
id: abc-123, tally_card_number: RTZ-01, qty: 10, updated_at: 2025-01-01

After update (qty changed to 20):
id: abc-123, tally_card_number: RTZ-01, qty: 10, updated_at: 2025-01-01  (old row - preserved)
id: def-456, tally_card_number: RTZ-01, qty: 20, updated_at: 2025-01-02  (new row - created)
```

### Hashdiff

A **SHA256 hash** of relevant record fields used to:
1. **Detect changes**: If hashdiff matches existing row, no change occurred
2. **Ensure idempotency**: Prevents duplicate rows with identical data
3. **Optimize queries**: Fast comparison instead of field-by-field checks

**Hashdiff Calculation:**
- Fields are normalized (lowercase, trimmed, nulls → '∅')
- Concatenated with ` | ` separator
- SHA256 hashed and hex-encoded

### Anchor Column

The **anchor column** identifies records that belong to the same logical entity across SCD2 versions. For example:
- `tally_card_number` for stock adjustments
- `card_uid` for tally cards

All versions of the same entity share the same anchor value but have different `id` and `updated_at` values.

### Temporal Column

The **temporal column** (typically `updated_at` or `snapshot_at`) determines which version is "current" (latest timestamp = current version).

---

## Table Definitions

### 1. Parent Table: `tcm_user_tally_card_entries`

```sql
CREATE TABLE public.tcm_user_tally_card_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_by_user_id uuid NOT NULL REFERENCES users(id),
  role_family text NOT NULL,
  card_uid uuid REFERENCES tcm_tally_cards(card_uid),
  tally_card_number text NOT NULL,  -- Anchor column
  qty integer,
  location text,
  note text,
  reason_code text DEFAULT 'UNSPECIFIED',
  multi_location boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),  -- Temporal column
  hashdiff text NOT NULL,  -- SHA256 hash of hashdiff_columns
  
  -- Idempotency constraint: prevents duplicate rows with same hashdiff
  CONSTRAINT uq_entries_uid_hash UNIQUE (updated_by_user_id, card_uid, hashdiff)
    WHERE (card_uid IS NOT NULL),
  CONSTRAINT uq_entries_uid_anchor_hash UNIQUE (updated_by_user_id, tally_card_number, hashdiff)
    WHERE (card_uid IS NULL)
);

-- Indexes for performance
CREATE INDEX idx_entries_tally_card_number ON public.tcm_user_tally_card_entries(tally_card_number);
CREATE INDEX idx_entries_updated_at ON public.tcm_user_tally_card_entries(updated_at DESC);
CREATE INDEX idx_entries_hashdiff ON public.tcm_user_tally_card_entries(hashdiff);
```

**Key Columns:**
- `id`: Unique identifier (changes on each SCD2 update)
- `tally_card_number`: **Anchor column** (doesn't change across versions)
- `updated_at`: **Temporal column** (determines current version)
- `hashdiff`: SHA256 hash for change detection and idempotency
- `updated_by_user_id`: User who made the change (for user-scoped idempotency)

### 2. Child Table: `tcm_user_tally_card_entry_locations`

```sql
CREATE TABLE public.tcm_user_tally_card_entry_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES tcm_user_tally_card_entries(id) ON DELETE CASCADE,
  location text NOT NULL,
  qty integer NOT NULL,
  pos smallint,  -- Position/order for display
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_locations_entry_id ON public.tcm_user_tally_card_entry_locations(entry_id);
CREATE INDEX idx_locations_pos ON public.tcm_user_tally_card_entry_locations(entry_id, pos);
```

**Key Points:**
- `entry_id` references a **specific SCD2 parent row** (not the anchor)
- When parent creates new SCD2 row, children must be **moved** to new `entry_id`
- This table is **NOT versioned** (no SCD2 on children)

### 3. Configuration Table: `scd2_resource_config`

```sql
CREATE TABLE public.scd2_resource_config (
  table_name text PRIMARY KEY,  -- e.g. 'public.tcm_user_tally_card_entries'
  anchor_col text NOT NULL,  -- e.g. 'tally_card_number'
  temporal_col text NOT NULL,  -- e.g. 'updated_at'
  user_scoped boolean NOT NULL DEFAULT false,  -- Include updated_by_user_id in idempotency WHERE
  hashdiff_columns jsonb NOT NULL,  -- Array of column configs for hash calculation
  unique_key text[] NOT NULL,  -- Array of column names for idempotency WHERE clause
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.scd2_resource_config IS 
  'Configuration for SCD2 resources. Hash fields, anchor, temporal, and uniqueness constraints are defined here, not in code.';
```

**Example Config Row:**
```json
{
  "table_name": "public.tcm_user_tally_card_entries",
  "anchor_col": "tally_card_number",
  "temporal_col": "updated_at",
  "user_scoped": true,
  "hashdiff_columns": [
    {"name": "tally_card_number", "type": "text", "normalize": "lower_trim"},
    {"name": "card_uid", "type": "uuid", "normalize": "none"},
    {"name": "qty", "type": "integer", "normalize": "none"},
    {"name": "location", "type": "text", "normalize": "lower_trim"},
    {"name": "note", "type": "text", "normalize": "lower_trim"},
    {"name": "reason_code", "type": "text", "normalize": "lower_trim"},
    {"name": "multi_location", "type": "boolean", "normalize": "none"}
  ],
  "unique_key": ["updated_by_user_id", "card_uid", "hashdiff"]
}
```

---

## Configuration System

### Registering a Resource

Use `fn_scd2_register_resource` to register a table for SCD2:

```sql
SELECT public.fn_scd2_register_resource(
  p_table_name := 'public.tcm_user_tally_card_entries',
  p_anchor_col := 'tally_card_number',
  p_temporal_col := 'updated_at',
  p_user_scoped := true,
  p_hashdiff_columns := '[
    {"name": "tally_card_number", "type": "text", "normalize": "lower_trim"},
    {"name": "card_uid", "type": "uuid", "normalize": "none"},
    {"name": "qty", "type": "integer", "normalize": "none"},
    {"name": "location", "type": "text", "normalize": "lower_trim"},
    {"name": "note", "type": "text", "normalize": "lower_trim"},
    {"name": "reason_code", "type": "text", "normalize": "lower_trim"},
    {"name": "multi_location", "type": "boolean", "normalize": "none"}
  ]'::jsonb,
  p_unique_key := ARRAY['updated_by_user_id', 'card_uid', 'hashdiff']
);
```

### Retrieving Configuration

```sql
SELECT public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
```

Returns JSONB config or NULL if not registered.

---

## Core Functions

### 1. Hash Function: `fn_scd2_hash`

**Purpose**: Calculate SHA256 hash of record fields for change detection.

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.fn_scd2_hash(
  p_record jsonb,  -- Record as JSONB
  p_config jsonb   -- Config from scd2_resource_config
)
RETURNS text  -- Hex-encoded SHA256 hash
```

**Algorithm:**
1. Extract `hashdiff_columns` from config
2. For each column:
   - Get value from `p_record`
   - Apply normalization (lower_trim, none)
   - Convert to text representation
   - Handle NULLs (→ '∅')
3. Concatenate with ` | ` separator
4. SHA256 hash and hex-encode

**Example:**
```sql
SELECT public.fn_scd2_hash(
  '{"tally_card_number": "RTZ-01", "qty": 10, "location": "A1"}'::jsonb,
  '{"hashdiff_columns": [{"name": "tally_card_number", "type": "text", "normalize": "lower_trim"}, {"name": "qty", "type": "integer"}]}'::jsonb
);
-- Returns: 'a1b2c3d4e5f6...' (hex hash)
```

### 2. Base Patch Function: `fn_scd2_patch_base`

**Purpose**: Generic SCD2 logic that works with any configured table.

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.fn_scd2_patch_base(
  p_table        regclass,   -- Table name (e.g. 'public.tcm_user_tally_card_entries'::regclass)
  p_id           uuid,       -- Current record id
  p_anchor_col   text,       -- Anchor column name
  p_temporal_col text,       -- Temporal column name
  p_user_scoped  boolean,    -- Include updated_by_user_id in idempotency WHERE
  p_hash_config  jsonb,     -- Hashdiff columns config
  p_unique_key   text[],     -- Unique key columns for idempotency
  p_updates      jsonb       -- Updates as JSONB (preserves types)
)
RETURNS uuid  -- Returns new/existing row id
```

**Algorithm:**
1. **Load current record** by `p_id`
2. **Get anchor value** (e.g. `tally_card_number`)
3. **Find latest version** for this anchor (ORDER BY temporal_col DESC)
4. **Detect changes**: Compare `p_updates` with latest version
5. **If no changes**: Return existing row id
6. **Calculate hashdiff**: Build updated JSONB, call `fn_scd2_hash`
7. **Idempotency check**: Query for existing row with same hashdiff
8. **If exists**: Return existing row id
9. **If not exists**: Insert new row with `now()` for temporal column
10. **Return new row id**

**Critical Behavior:**
- **Always uses `now()`** for temporal column in new rows (ignores any value in `p_updates`)
- **Removes temporal column** from hashdiff calculation (it's not part of business data)
- **Type-safe**: Uses `jsonb_each` (not `jsonb_each_text`) to preserve numeric/boolean types

### 3. Trigger Hash Shim: `fn_scd2_trigger_hash_shim`

**Purpose**: Calculate hashdiff automatically on INSERT/UPDATE via trigger.

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.fn_scd2_trigger_hash_shim()
RETURNS trigger
```

**Algorithm:**
1. Get config for `TG_TABLE_NAME`
2. Build JSONB from `NEW` record
3. Resolve `updated_by_user_id` from `auth.uid()` if needed
4. Call `fn_scd2_hash` to calculate hashdiff
5. Set `NEW.hashdiff` and return `NEW`

**Usage:**
```sql
CREATE TRIGGER trg_scd2_hash_tcm_user_tally_card_entries
  BEFORE INSERT OR UPDATE ON public.tcm_user_tally_card_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_scd2_trigger_hash_shim();
```

### 4. Resource-Specific Wrappers

**Example: `fn_tcm_user_tally_card_entries_patch_scd2_v3`**

```sql
CREATE OR REPLACE FUNCTION public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
  p_id uuid,
  p_reason_code text DEFAULT NULL,
  p_multi_location boolean DEFAULT NULL,
  p_qty integer DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS TABLE(id uuid, ...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_config jsonb;
  v_new_id uuid;
BEGIN
  -- Get config
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No SCD2 config found for public.tcm_user_tally_card_entries';
  END IF;
  
  -- Build updates JSONB (preserve types)
  DECLARE
    v_updates jsonb := '{}'::jsonb;
  BEGIN
    IF p_reason_code IS NOT NULL THEN
      v_updates := jsonb_set(v_updates, ARRAY['reason_code'], to_jsonb(p_reason_code));
    END IF;
    IF p_multi_location IS NOT NULL THEN
      v_updates := jsonb_set(v_updates, ARRAY['multi_location'], to_jsonb(p_multi_location));
    END IF;
    IF p_qty IS NOT NULL THEN
      v_updates := jsonb_set(v_updates, ARRAY['qty'], to_jsonb(p_qty));
    END IF;
    IF p_location IS NOT NULL THEN
      v_updates := jsonb_set(v_updates, ARRAY['location'], to_jsonb(p_location));
    END IF;
    IF p_note IS NOT NULL THEN
      v_updates := jsonb_set(v_updates, ARRAY['note'], to_jsonb(p_note));
    END IF;
  END;
  
  -- Call base function
  v_new_id := public.fn_scd2_patch_base(
    p_table := 'public.tcm_user_tally_card_entries'::regclass,
    p_id := p_id,
    p_anchor_col := v_config->>'anchor_col',
    p_temporal_col := v_config->>'temporal_col',
    p_user_scoped := (v_config->>'user_scoped')::boolean,
    p_hash_config := v_config->'hashdiff_columns',
    p_unique_key := ARRAY(SELECT jsonb_array_elements_text(v_config->'unique_key')),
    p_updates := v_updates
  );
  
  -- Return new/updated row
  RETURN QUERY
  SELECT t.*
  FROM public.tcm_user_tally_card_entries t
  WHERE t.id = v_new_id;
END;
$$;
```

---

## Parent-Child Pattern

### Overview

When a parent table uses SCD2 and has child records that need to be aggregated into parent fields, a **two-phase update** is required.

### The Problem

1. Parent needs `entry_id` to save children
2. Children must be saved before aggregation
3. Aggregation must happen after children are saved
4. Parent must be updated with aggregated values
5. If parent creates new SCD2 row, children must be moved

### The Solution: Two-Phase Update

#### Phase 1: Update Parent Metadata (Get Entry ID)

**Purpose**: Get or create a parent record with valid `entry_id` for saving children.

**What to send:**
- Metadata fields only: `reason_code`, `note`, `multi_location` (flag)
- **DO NOT send**: `location`, `qty` (these will be aggregated from children)

**SQL:**
```sql
SELECT * FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
  p_id := 'abc-123'::uuid,
  p_reason_code := 'DAMAGE',
  p_note := 'Updated note',
  p_multi_location := true
  -- NOTE: p_location and p_qty are NOT sent
);
```

**Result**: Returns row with `id` (new or existing) to use for children.

#### Phase 2: Save Child Records

**Purpose**: Save individual child records with parent `entry_id`.

**SQL:**
```sql
-- Delete existing children
DELETE FROM public.tcm_user_tally_card_entry_locations
WHERE entry_id = 'abc-123'::uuid;

-- Insert new children
INSERT INTO public.tcm_user_tally_card_entry_locations (entry_id, location, qty, pos)
VALUES
  ('abc-123'::uuid, 'A1', 10, 1),
  ('abc-123'::uuid, 'B2', 20, 2),
  ('abc-123'::uuid, 'C3', 30, 3);
```

#### Phase 3: Aggregate and Update Parent

**Purpose**: Calculate aggregated values from saved children and update parent.

**SQL:**
```sql
-- Fetch saved children
SELECT location, qty, pos
FROM public.tcm_user_tally_card_entry_locations
WHERE entry_id = 'abc-123'::uuid
ORDER BY pos;

-- Calculate aggregates
WITH aggregates AS (
  SELECT 
    SUM(qty) as total_qty,
    string_agg(location, ', ' ORDER BY pos) as location_string
  FROM public.tcm_user_tally_card_entry_locations
  WHERE entry_id = 'abc-123'::uuid
)
-- Update parent with aggregates
SELECT * FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
  p_id := 'abc-123'::uuid,
  p_qty := (SELECT total_qty FROM aggregates),
  p_location := (SELECT location_string FROM aggregates),
  p_multi_location := true
);
```

**Result**: Creates new SCD2 row if aggregates changed, returns new `id`.

#### Phase 4: Move Children (If Needed)

**Purpose**: If Phase 3 created a new parent row, move children to new `entry_id`.

**SQL:**
```sql
-- Check if new row was created
-- (Compare returned id with original id)

-- If different, move children
WITH old_children AS (
  SELECT location, qty, pos
  FROM public.tcm_user_tally_card_entry_locations
  WHERE entry_id = 'abc-123'::uuid  -- Old entry_id
)
INSERT INTO public.tcm_user_tally_card_entry_locations (entry_id, location, qty, pos)
SELECT 
  'def-456'::uuid,  -- New entry_id
  location,
  qty,
  pos
FROM old_children;

-- Delete old children
DELETE FROM public.tcm_user_tally_card_entry_locations
WHERE entry_id = 'abc-123'::uuid;
```

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User submits form with:                                     │
│ - reason_code: 'DAMAGE'                                     │
│ - note: 'Updated'                                            │
│ - multi_location: true                                       │
│ - locations: [{location: 'A1', qty: 10}, ...]             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: First SCD2 Call (Metadata Only)                    │
│                                                              │
│ fn_tcm_user_tally_card_entries_patch_scd2_v3(               │
│   p_reason_code := 'DAMAGE',                                │
│   p_note := 'Updated',                                      │
│   p_multi_location := true                                  │
│   -- NO p_location, NO p_qty                               │
│ )                                                           │
│                                                              │
│ Result: entry_id = 'abc-123' (new or existing)             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Save Children                                      │
│                                                              │
│ DELETE FROM locations WHERE entry_id = 'abc-123'           │
│ INSERT INTO locations (entry_id, location, qty, pos)       │
│ VALUES ('abc-123', 'A1', 10, 1), ...                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Aggregate and Update Parent                        │
│                                                              │
│ SELECT SUM(qty), string_agg(location, ', ')                │
│ FROM locations WHERE entry_id = 'abc-123'                   │
│                                                              │
│ fn_tcm_user_tally_card_entries_patch_scd2_v3(               │
│   p_qty := 60,  -- Aggregated                               │
│   p_location := 'A1, B2, C3',  -- Aggregated                │
│   p_multi_location := true                                  │
│ )                                                           │
│                                                              │
│ Result: entry_id = 'def-456' (new row created)              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Move Children (if new row created)                 │
│                                                              │
│ IF 'def-456' != 'abc-123' THEN                              │
│   INSERT INTO locations (entry_id, ...)                     │
│   SELECT 'def-456', location, qty, pos                      │
│   FROM locations WHERE entry_id = 'abc-123'                 │
│                                                              │
│   DELETE FROM locations WHERE entry_id = 'abc-123'          │
│ END IF                                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete SQL Reference

### Registration Queries

#### Register Stock Adjustments

```sql
SELECT public.fn_scd2_register_resource(
  p_table_name := 'public.tcm_user_tally_card_entries',
  p_anchor_col := 'tally_card_number',
  p_temporal_col := 'updated_at',
  p_user_scoped := true,
  p_hashdiff_columns := '[
    {"name": "tally_card_number", "type": "text", "normalize": "lower_trim"},
    {"name": "card_uid", "type": "uuid", "normalize": "none"},
    {"name": "qty", "type": "integer", "normalize": "none"},
    {"name": "location", "type": "text", "normalize": "lower_trim"},
    {"name": "note", "type": "text", "normalize": "lower_trim"},
    {"name": "reason_code", "type": "text", "normalize": "lower_trim"},
    {"name": "multi_location", "type": "boolean", "normalize": "none"}
  ]'::jsonb,
  p_unique_key := ARRAY['updated_by_user_id', 'card_uid', 'hashdiff']
);
```

#### Register Tally Cards

```sql
SELECT public.fn_scd2_register_resource(
  p_table_name := 'public.tcm_tally_cards',
  p_anchor_col := 'card_uid',
  p_temporal_col := 'snapshot_at',
  p_user_scoped := false,
  p_hashdiff_columns := '[
    {"name": "card_uid", "type": "uuid", "normalize": "none"},
    {"name": "warehouse_id", "type": "uuid", "normalize": "none"},
    {"name": "tally_card_number", "type": "text", "normalize": "lower_trim"},
    {"name": "item_number", "type": "bigint", "normalize": "none"},
    {"name": "note", "type": "text", "normalize": "lower_trim"},
    {"name": "is_active", "type": "boolean", "normalize": "none"}
  ]'::jsonb,
  p_unique_key := ARRAY['card_uid', 'hashdiff']
);
```

### Attach Triggers

```sql
-- Stock Adjustments
SELECT public.fn_scd2_attach_trigger('public.tcm_user_tally_card_entries'::regclass);

-- Tally Cards
SELECT public.fn_scd2_attach_trigger('public.tcm_tally_cards'::regclass);
```

### Query Examples

#### Get Current Version

```sql
SELECT *
FROM public.tcm_user_tally_card_entries
WHERE tally_card_number = 'RTZ-01'
ORDER BY updated_at DESC, id DESC
LIMIT 1;
```

#### Get All Versions (History)

```sql
SELECT *
FROM public.tcm_user_tally_card_entries
WHERE tally_card_number = 'RTZ-01'
ORDER BY updated_at DESC, id DESC;
```

#### Get Children for Current Version

```sql
WITH current_entry AS (
  SELECT id
  FROM public.tcm_user_tally_card_entries
  WHERE tally_card_number = 'RTZ-01'
  ORDER BY updated_at DESC, id DESC
  LIMIT 1
)
SELECT l.*
FROM public.tcm_user_tally_card_entry_locations l
INNER JOIN current_entry ce ON l.entry_id = ce.id
ORDER BY l.pos;
```

#### Verify Configuration

```sql
SELECT 
  table_name,
  anchor_col,
  temporal_col,
  user_scoped,
  jsonb_array_length(hashdiff_columns) as hash_column_count,
  array_length(unique_key, 1) as unique_key_length
FROM public.scd2_resource_config
ORDER BY table_name;
```

#### Check Hashdiff Calculation

```sql
-- Get config
WITH config AS (
  SELECT * FROM public.scd2_resource_config
  WHERE table_name = 'public.tcm_user_tally_card_entries'
),
-- Get current record
current_record AS (
  SELECT to_jsonb(t.*) as rec
  FROM public.tcm_user_tally_card_entries t
  WHERE id = 'abc-123'::uuid
)
-- Calculate hashdiff
SELECT public.fn_scd2_hash(
  (SELECT rec FROM current_record),
  (SELECT row_to_json(c.*)::jsonb FROM config c)
) as calculated_hashdiff;
```

---

## Usage Examples

### Example 1: Simple Update (No Children)

```sql
-- Update note only
SELECT * FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
  p_id := 'abc-123'::uuid,
  p_note := 'Updated note'
);

-- If note didn't change, returns existing row id
-- If note changed, creates new row with new id
```

### Example 2: Multi-Location Update (With Children)

```sql
-- Step 1: Update metadata
SELECT * FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
  p_id := 'abc-123'::uuid,
  p_reason_code := 'DAMAGE',
  p_note := 'Multi-location adjustment',
  p_multi_location := true
);
-- Returns: {id: 'abc-123'}

-- Step 2: Save children
DELETE FROM public.tcm_user_tally_card_entry_locations
WHERE entry_id = 'abc-123'::uuid;

INSERT INTO public.tcm_user_tally_card_entry_locations (entry_id, location, qty, pos)
VALUES
  ('abc-123'::uuid, 'A1', 10, 1),
  ('abc-123'::uuid, 'B2', 20, 2),
  ('abc-123'::uuid, 'C3', 30, 3);

-- Step 3: Aggregate and update
WITH aggregates AS (
  SELECT 
    SUM(qty) as total_qty,
    string_agg(location, ', ' ORDER BY pos) as location_string
  FROM public.tcm_user_tally_card_entry_locations
  WHERE entry_id = 'abc-123'::uuid
)
SELECT * FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
  p_id := 'abc-123'::uuid,
  p_qty := (SELECT total_qty FROM aggregates),
  p_location := (SELECT location_string FROM aggregates),
  p_multi_location := true
);
-- Returns: {id: 'def-456'} (new row created)

-- Step 4: Move children
INSERT INTO public.tcm_user_tally_card_entry_locations (entry_id, location, qty, pos)
SELECT 'def-456'::uuid, location, qty, pos
FROM public.tcm_user_tally_card_entry_locations
WHERE entry_id = 'abc-123'::uuid;

DELETE FROM public.tcm_user_tally_card_entry_locations
WHERE entry_id = 'abc-123'::uuid;
```

---

## Troubleshooting

### Issue: "No SCD2 config found"

**Symptom:**
```
ERROR: No SCD2 config found for public.tcm_user_tally_card_entries
```

**Solution:**
```sql
-- Verify config exists
SELECT * FROM public.scd2_resource_config
WHERE table_name = 'public.tcm_user_tally_card_entries';

-- If missing, re-register
SELECT public.fn_scd2_register_resource(...);
```

### Issue: "function digest(text, unknown) does not exist"

**Symptom:**
```
ERROR: function digest(text, unknown) does not exist
```

**Solution:**
```sql
-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure extensions schema is accessible
GRANT USAGE ON SCHEMA extensions TO public;

-- Verify fn_scd2_hash uses extensions.digest()
-- Should be: extensions.digest(v_payload, 'sha256')
-- NOT: digest(v_payload, 'sha256')
```

### Issue: Hashdiff Mismatch

**Symptom:** New rows created even when data hasn't changed.

**Diagnosis:**
```sql
-- Compare calculated hashdiff with stored hashdiff
WITH config AS (
  SELECT * FROM public.scd2_resource_config
  WHERE table_name = 'public.tcm_user_tally_card_entries'
),
current_record AS (
  SELECT to_jsonb(t.*) as rec, t.hashdiff as stored_hashdiff
  FROM public.tcm_user_tally_card_entries t
  WHERE id = 'abc-123'::uuid
)
SELECT 
  public.fn_scd2_hash(
    (SELECT rec FROM current_record),
    (SELECT row_to_json(c.*)::jsonb FROM config c)
  ) as calculated_hashdiff,
  (SELECT stored_hashdiff FROM current_record) as stored_hashdiff;
```

**Common Causes:**
- Temporal column (`updated_at`) included in hashdiff (should be excluded)
- Normalization mismatch (lower_trim vs none)
- Type conversion issues (numeric → text)

### Issue: Children Not Moving to New Parent Row

**Symptom:** Children remain linked to old `entry_id` after parent update.

**Diagnosis:**
```sql
-- Check if parent created new row
SELECT 
  old_id,
  new_id,
  old_id != new_id as row_changed
FROM (
  SELECT 
    'abc-123'::uuid as old_id,
    (SELECT id FROM public.tcm_user_tally_card_entries 
     WHERE tally_card_number = (
       SELECT tally_card_number FROM public.tcm_user_tally_card_entries WHERE id = 'abc-123'::uuid
     )
     ORDER BY updated_at DESC, id DESC LIMIT 1) as new_id
) x;

-- Check children
SELECT entry_id, COUNT(*) as child_count
FROM public.tcm_user_tally_card_entry_locations
WHERE entry_id IN ('abc-123'::uuid, 'def-456'::uuid)
GROUP BY entry_id;
```

**Solution:** Ensure Phase 4 (move children) is executed when `new_id != old_id`.

### Issue: Idempotency Not Working

**Symptom:** Duplicate rows with same hashdiff.

**Diagnosis:**
```sql
-- Check for duplicates
SELECT 
  updated_by_user_id,
  card_uid,
  hashdiff,
  COUNT(*) as count
FROM public.tcm_user_tally_card_entries
GROUP BY updated_by_user_id, card_uid, hashdiff
HAVING COUNT(*) > 1;

-- Verify unique constraint exists
SELECT 
  conname,
  contype,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.tcm_user_tally_card_entries'::regclass
  AND contype = 'u';
```

**Solution:** Ensure unique constraint matches `unique_key` in config.

---

## Best Practices

1. **Always use `now()` for temporal columns** - Never accept temporal values from client
2. **Strip temporal columns from hashdiff** - They're not part of business data
3. **Use type-safe JSONB operations** - `jsonb_each`, not `jsonb_each_text`
4. **Test idempotency** - Same update twice should return same row id
5. **Move children after parent update** - Check if new row created, move if needed
6. **Use config over code** - All resource definitions in `scd2_resource_config`
7. **One hash function** - `fn_scd2_hash` used by both wrapper and trigger

---

## Migration Checklist

When adding SCD2 to a new table:

- [ ] Create/verify table has `hashdiff` column
- [ ] Add unique constraint matching `unique_key` config
- [ ] Register resource in `scd2_resource_config`
- [ ] Attach trigger using `fn_scd2_attach_trigger`
- [ ] Create wrapper function (v3) with exact table name
- [ ] Test idempotency (same update twice)
- [ ] Test change detection (different update creates new row)
- [ ] Test hashdiff calculation (matches trigger)
- [ ] If parent-child: Test two-phase update flow
- [ ] If parent-child: Test child migration on new parent row

---

## Appendix: Complete Function Signatures

### Core Functions

```sql
-- Config Management
fn_scd2_register_resource(
  p_table_name text,
  p_anchor_col text,
  p_temporal_col text,
  p_user_scoped boolean,
  p_hashdiff_columns jsonb,
  p_unique_key text[]
) RETURNS void

fn_scd2_get_config(p_table regclass) RETURNS jsonb

-- Hash Calculation
fn_scd2_hash(p_record jsonb, p_config jsonb) RETURNS text

-- Base SCD2 Logic
fn_scd2_patch_base(
  p_table regclass,
  p_id uuid,
  p_anchor_col text,
  p_temporal_col text,
  p_user_scoped boolean,
  p_hash_config jsonb,
  p_unique_key text[],
  p_updates jsonb
) RETURNS uuid

-- Trigger
fn_scd2_trigger_hash_shim() RETURNS trigger

-- Trigger Attachment
fn_scd2_attach_trigger(p_table regclass) RETURNS void
```

### Resource Wrappers (Examples)

```sql
-- Stock Adjustments
fn_tcm_user_tally_card_entries_patch_scd2_v3(
  p_id uuid,
  p_reason_code text DEFAULT NULL,
  p_multi_location boolean DEFAULT NULL,
  p_qty integer DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS TABLE(id uuid, ...)

-- Tally Cards
fn_tcm_tally_cards_patch_scd2_v3(
  p_id uuid,
  p_warehouse_id uuid DEFAULT NULL,
  p_tally_card_number text DEFAULT NULL,
  p_item_number bigint DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
) RETURNS TABLE(id uuid, ...)
```

---

**End of Guide**

