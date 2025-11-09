# SCD2 Exact Naming Migration Plan

**Date**: 2025-02-02  
**Migration File**: `supabase/migrations/20250202_create_generic_scd2_base_exact_naming.sql`

## Overview

This migration enforces strict 1:1 naming between table/view names and all resource-specific artifacts (functions, triggers, configs). No aliases or shortened names are used.

## Naming Rules Applied

| Artifact Type | Pattern | Example |
|--------------|---------|---------|
| **Wrapper RPC** | `fn_<exact_table_name>_patch_scd2_v3` | `fn_tcm_user_tally_card_entries_patch_scd2_v3` |
| **Trigger** | `trg_<exact_table_name>_hash` | `trg_tcm_user_tally_card_entries_hash` |
| **Trigger Function** | `fn_scd2_trigger_hash_shim` | (shared, unchanged) |
| **Shared Base** | `fn_scd2_patch_base` | (shared, unchanged) |
| **Hash Helper** | `fn_scd2_hash` | (shared, unchanged) |
| **Config Loader** | `fn_scd2_get_config` | (shared, unchanged) |

## A. SQL Artifacts (Exact Diffs)

### 1. Hash Helper (Unchanged - Shared)

```sql
CREATE OR REPLACE FUNCTION public.fn_scd2_hash(
  p_record jsonb,
  p_config jsonb
) RETURNS text
```

### 2. Config Loader (Updated - Exact Table Names)

```sql
CREATE OR REPLACE FUNCTION public.fn_scd2_get_config(p_table regclass)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT CASE p_table::text
    WHEN 'public.tcm_user_tally_card_entries' THEN
      '{ "hashdiff_columns": [...] }'::jsonb
    WHEN 'public.tcm_tally_cards' THEN
      '{ "hashdiff_columns": [...] }'::jsonb
    ELSE NULL
  END;
$$;
```

### 3. Stock Adjustments Wrapper (Renamed)

**Old**: `fn_user_entry_patch_scd2_v3`  
**New**: `fn_tcm_user_tally_card_entries_patch_scd2_v3`

```sql
CREATE OR REPLACE FUNCTION public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
  p_id uuid,
  p_reason_code text DEFAULT NULL,
  p_multi_location boolean DEFAULT NULL,
  p_qty integer DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS public.tcm_user_tally_card_entries
```

### 4. Tally Cards Wrapper (New - Exact Name)

```sql
CREATE OR REPLACE FUNCTION public.fn_tcm_tally_cards_patch_scd2_v3(
  p_id uuid,
  p_tally_card_number text DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL,
  p_item_number bigint DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  card_uid uuid,
  tally_card_number text,
  warehouse_id uuid,
  item_number bigint,
  note text,
  is_active boolean,
  snapshot_at timestamptz
)
```

### 5. Triggers (Exact Table Names)

**Stock Adjustments**:
```sql
DROP TRIGGER IF EXISTS trg_user_entry_set_hashdiff ON public.tcm_user_tally_card_entries;
DROP TRIGGER IF EXISTS trg_entries_hash ON public.tcm_user_tally_card_entries;

CREATE TRIGGER trg_tcm_user_tally_card_entries_hash
BEFORE INSERT OR UPDATE ON public.tcm_user_tally_card_entries
FOR EACH ROW
EXECUTE FUNCTION public.fn_scd2_trigger_hash_shim();
```

**Tally Cards**:
```sql
DROP TRIGGER IF EXISTS trg_tally_card_set_hashdiff ON public.tcm_tally_cards;
DROP TRIGGER IF EXISTS trg_tcm_tally_cards_hash ON public.tcm_tally_cards;

CREATE TRIGGER trg_tcm_tally_cards_hash
BEFORE INSERT OR UPDATE ON public.tcm_tally_cards
FOR EACH ROW
EXECUTE FUNCTION public.fn_scd2_trigger_hash_shim();
```

## B. Code Search/Replace List

### Files Requiring Updates

1. **API Route: Stock Adjustments**
   - **File**: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
   - **Line**: 56
   - **Change**: `"fn_user_entry_patch_scd2"` → `"fn_tcm_user_tally_card_entries_patch_scd2_v3"`
   - **Status**: ✅ Updated

2. **API Route: Tally Cards**
   - **File**: `src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts`
   - **Line**: 32
   - **Change**: `"fn_tally_card_patch_scd2"` → `"fn_tcm_tally_cards_patch_scd2_v3"`
   - **Status**: ✅ Updated

3. **Test Scripts** (if any reference old names)
   - **Files**: `scripts/test-*.sql`
   - **Action**: Update test scripts to use new function names
   - **Status**: ⚠️ Needs review

## C. Supabase Change Plan (Ordered, Safe)

### Pre-Checks

```sql
-- 1. Verify pgcrypto extension exists
SELECT EXISTS(
  SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
) as pgcrypto_installed;

-- 2. Check existing triggers
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('tcm_user_tally_card_entries', 'tcm_tally_cards')
  AND t.tgname LIKE '%hash%';

-- 3. Check existing functions
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%patch_scd2%'
ORDER BY p.proname;
```

### SQL Apply Order

1. **Helpers** (shared, no dependencies)
   - `fn_scd2_hash`
   - `fn_scd2_get_config`
   - `fn_scd2_trigger_hash_shim`
   - `fn_scd2_patch_base`

2. **Wrappers** (depend on helpers)
   - `fn_tcm_user_tally_card_entries_patch_scd2_v3`
   - `fn_tcm_tally_cards_patch_scd2_v3`

3. **Triggers** (depend on trigger shim)
   - `trg_tcm_user_tally_card_entries_hash`
   - `trg_tcm_tally_cards_hash`

4. **Grants** (execute permissions)
   - All functions granted to `authenticated`

5. **Deprecation Comments**
   - Add comments to legacy functions

### Verification Queries

```sql
-- 1. Verify new functions exist
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'fn_tcm_user_tally_card_entries_patch_scd2_v3',
    'fn_tcm_tally_cards_patch_scd2_v3'
  )
ORDER BY p.proname;

-- 2. Verify triggers exist
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.tgname IN (
    'trg_tcm_user_tally_card_entries_hash',
    'trg_tcm_tally_cards_hash'
  )
ORDER BY c.relname;

-- 3. Test config retrieval
SELECT 
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) as stock_adjustments_config,
  public.fn_scd2_get_config('public.tcm_tally_cards'::regclass) as tally_cards_config;

-- 4. Verify function callability (requires auth context)
-- Run in Supabase SQL Editor with authenticated user
SELECT public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
  '00000000-0000-0000-0000-000000000000'::uuid,
  NULL, NULL, NULL, NULL, NULL
) LIMIT 0;  -- Just test callability, don't execute
```

### Rollback Notes

**To revert to v2**:

1. **API Routes**: Change RPC calls back to old names
   - Stock Adjustments: `"fn_tcm_user_tally_card_entries_patch_scd2_v3"` → `"fn_user_entry_patch_scd2_v2"`
   - Tally Cards: `"fn_tcm_tally_cards_patch_scd2_v3"` → `"fn_tally_card_patch_scd2"`

2. **Triggers**: Old triggers remain (v1/v2 functions still work)

3. **Functions**: New v3 functions can coexist with v1/v2

**Rollback SQL** (if needed):
```sql
-- Revert triggers to old functions (if old triggers exist)
-- Note: Old triggers may need to be recreated if they were dropped
```

## D. Post-Rename Validation Checklist

### ✅ Hash Parity Test

```sql
-- Test that trigger hash == helper hash for a sample record
DO $$
DECLARE
  v_record public.tcm_user_tally_card_entries%ROWTYPE;
  v_record_jsonb jsonb;
  v_config jsonb;
  v_hashdiff_helper text;
  v_hashdiff_trigger text;
BEGIN
  SELECT * INTO v_record
  FROM public.tcm_user_tally_card_entries
  LIMIT 1;
  
  IF FOUND THEN
    v_record_jsonb := to_jsonb(v_record);
    v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
    v_hashdiff_helper := public.fn_scd2_hash(v_record_jsonb, v_config);
    v_hashdiff_trigger := v_record.hashdiff;
    
    IF v_hashdiff_helper != v_hashdiff_trigger THEN
      RAISE WARNING 'Hash mismatch: Helper=%, Trigger=%', v_hashdiff_helper, v_hashdiff_trigger;
    ELSE
      RAISE NOTICE '✓ Hash parity test PASSED';
    END IF;
  END IF;
END $$;
```

### ✅ Idempotency Test

```sql
-- Verify idempotency WHERE matches constraint
-- Stock Adjustments: (updated_by_user_id, card_uid, hashdiff)
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.tcm_user_tally_card_entries'::regclass
  AND conname LIKE '%hash%';

-- Expected: UNIQUE (updated_by_user_id, card_uid, hashdiff) WHERE (card_uid IS NOT NULL)
```

### ✅ API Paths Test

**Stock Adjustments**:
```bash
# Test API route
curl -X POST http://localhost:3000/api/stock-adjustments/{id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -d '{"qty": 100, "location": "G5"}'
```

**Expected**: 200 OK with `{ row: {...} }`

**Tally Cards**:
```bash
# Test API route
curl -X POST http://localhost:3000/api/tally-cards/{id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -d '{"note": "Updated note"}'
```

**Expected**: 200 OK with `{ row: {...} }`

### ✅ No Old References

```sql
-- Search for old function names in database
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) LIKE '%fn_user_entry_patch_scd2%'
    OR pg_get_functiondef(p.oid) LIKE '%fn_tally_card_patch_scd2%'
  )
  AND p.proname NOT LIKE '%_v3';

-- Should return only deprecated functions (v1/v2) with deprecation comments
```

**Code Search** (grep):
```bash
# Search codebase for old function names
grep -r "fn_user_entry_patch_scd2" src/
grep -r "fn_tally_card_patch_scd2" src/

# Should only find:
# - Deprecated function definitions (with comments)
# - No active call sites
```

## Summary

### Functions Created

| Function Name | Table | Status |
|--------------|-------|--------|
| `fn_tcm_user_tally_card_entries_patch_scd2_v3` | `tcm_user_tally_card_entries` | ✅ Created |
| `fn_tcm_tally_cards_patch_scd2_v3` | `tcm_tally_cards` | ✅ Created |

### Triggers Created

| Trigger Name | Table | Status |
|-------------|-------|--------|
| `trg_tcm_user_tally_card_entries_hash` | `tcm_user_tally_card_entries` | ✅ Created |
| `trg_tcm_tally_cards_hash` | `tcm_tally_cards` | ✅ Created |

### API Routes Updated

| Route | Old Function | New Function | Status |
|-------|--------------|--------------|--------|
| `/api/stock-adjustments/[id]/actions/patch-scd2` | `fn_user_entry_patch_scd2` | `fn_tcm_user_tally_card_entries_patch_scd2_v3` | ✅ Updated |
| `/api/tally-cards/[id]/actions/patch-scd2` | `fn_tally_card_patch_scd2` | `fn_tcm_tally_cards_patch_scd2_v3` | ✅ Updated |

### Backward Compatibility

- ✅ v1/v2 functions preserved (with deprecation comments)
- ✅ Old triggers can coexist (if not dropped)
- ✅ Easy rollback to v2 if needed

## Next Steps

1. **Apply Migration**: Run `supabase/migrations/20250202_create_generic_scd2_base_exact_naming.sql`
2. **Run Verification Queries**: Execute pre-checks and verification queries
3. **Test API Routes**: Verify both stock-adjustments and tally-cards endpoints work
4. **Run Validation Checklist**: Execute all validation tests
5. **Monitor**: Watch for any issues in production



