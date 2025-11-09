# Production SCD2 Pattern - Rollout Plan

## Overview

This document outlines the safe rollout plan for the production-ready shared SCD2 pattern. The new pattern provides:
- **Config over code**: Hash fields, anchor, temporal, and uniqueness constraints defined in `scd2_resource_config` table
- **Single source of truth**: One hash function (`fn_scd2_hash`) used by both trigger and wrapper
- **Type-safe updates**: JSONB preserves numeric/boolean types (no coercion)
- **Exact naming**: All functions/triggers use exact table names (no aliases)
- **Backward compatible**: v1/v2 functions remain unchanged; v3 added behind feature flag

## Pre-Deployment Checklist

### 1. Verify Prerequisites

```sql
-- Check pgcrypto extension
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- If missing, enable it:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 2. Verify Existing Constraints

```sql
-- Check unique constraints on entries table
SELECT 
  conname,
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.tcm_user_tally_card_entries'::regclass
  AND contype = 'u';

-- Expected: uq_entries_uid_hash UNIQUE (updated_by_user_id, card_uid, hashdiff) WHERE (card_uid IS NOT NULL)

-- Check unique constraints on tally_cards table
SELECT 
  conname,
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.tcm_tally_cards'::regclass
  AND contype = 'u';

-- Expected: Unique constraint on (card_uid, hashdiff) or similar
```

### 3. Backup Current State

```sql
-- Export current function definitions
\df+ public.fn_user_entry_patch_scd2
\df+ public.fn_user_entry_patch_scd2_v2
\df+ public.fn_tally_card_patch_scd2

-- Export current trigger definitions
SELECT 
  tgname,
  tgrelid::regclass,
  pg_get_triggerdef(oid) AS trigger_def
FROM pg_trigger
WHERE tgname IN ('trg_user_entry_set_hashdiff', 'trg_tally_card_set_hashdiff');
```

## Deployment Steps

### Step 1: Apply Migration

```bash
# Apply the production SCD2 migration
supabase migration up 20250202_create_production_scd2_pattern
```

Or via Supabase Dashboard:
1. Navigate to SQL Editor
2. Copy contents of `supabase/migrations/20250202_create_production_scd2_pattern.sql`
3. Execute the migration

### Step 2: Verify Migration Success

```sql
-- Check config table exists and has data
SELECT * FROM public.scd2_resource_config;

-- Expected: 2 rows (entries and tally_cards)

-- Check functions exist
SELECT 
  proname,
  proargnames,
  prorettype::regtype
FROM pg_proc
WHERE proname IN (
  'fn_scd2_hash',
  'fn_scd2_get_config',
  'fn_scd2_register_resource',
  'fn_scd2_trigger_hash_shim',
  'fn_scd2_patch_base',
  'fn_scd2_attach_trigger',
  'fn_tcm_user_tally_card_entries_patch_scd2_v3',
  'fn_tcm_tally_cards_patch_scd2_v3'
);

-- Check triggers exist
SELECT 
  tgname,
  tgrelid::regclass,
  tgenabled
FROM pg_trigger
WHERE tgname IN (
  'trg_tcm_user_tally_card_entries_hash',
  'trg_tcm_tally_cards_hash'
);
```

### Step 3: Run Verification Tests

```bash
# Run test script
psql $DATABASE_URL -f scripts/test-production-scd2-v3.sql
```

Or via Supabase Dashboard:
1. Copy contents of `scripts/test-production-scd2-v3.sql`
2. Execute in SQL Editor
3. Verify all tests pass

### Step 4: Verify Constraint Parity

```sql
-- Check constraint parity view
SELECT * FROM public.v_scd2_constraint_parity;

-- Expected: matches = true for both tables
```

### Step 5: Enable Feature Flag (Optional)

By default, v3 is enabled. To disable and use v2/v1:

```bash
# In .env.local or environment variables
NEXT_PUBLIC_SCD2_USE_V3=false
```

To explicitly enable v3 (default):

```bash
NEXT_PUBLIC_SCD2_USE_V3=true
```

## Post-Deployment Verification

### 1. Hash Parity Test

Verify that trigger-calculated hashdiff matches helper-calculated hashdiff:

```sql
-- Manual test
DO $$
DECLARE
  v_config jsonb;
  v_test_record jsonb;
  v_helper_hash text;
  v_trigger_hash text;
BEGIN
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  v_test_record := jsonb_build_object(
    'updated_by_user_id', (SELECT id FROM public.users LIMIT 1),
    'tally_card_number', 'TEST-HASH',
    'card_uid', NULL,
    'qty', 10,
    'location', 'A1',
    'note', 'Test',
    'role_family', 'test',
    'reason_code', 'TEST',
    'multi_location', false
  );
  
  v_helper_hash := public.fn_scd2_hash(v_test_record, jsonb_build_object('hashdiff_columns', v_config->'hashdiff_columns'));
  
  INSERT INTO public.tcm_user_tally_card_entries (
    updated_by_user_id, role_family, tally_card_number, qty, location, note, reason_code, multi_location
  ) VALUES (
    (SELECT id FROM public.users LIMIT 1), 'test', 'TEST-HASH', 10, 'A1', 'Test', 'TEST', false
  ) RETURNING hashdiff INTO v_trigger_hash;
  
  IF v_helper_hash = v_trigger_hash THEN
    RAISE NOTICE '✓ Hash parity: PASSED';
  ELSE
    RAISE EXCEPTION '✗ Hash parity: FAILED (helper: %, trigger: %)', v_helper_hash, v_trigger_hash;
  END IF;
  
  DELETE FROM public.tcm_user_tally_card_entries WHERE tally_card_number = 'TEST-HASH';
END $$;
```

### 2. API Integration Test

Test the API routes with v3 enabled:

```bash
# Test stock adjustments
curl -X POST http://localhost:3000/api/stock-adjustments/{id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -d '{"qty": 10, "note": "Test update"}'

# Test tally cards
curl -X POST http://localhost:3000/api/tally-cards/{id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -d '{"note": "Test update"}'
```

### 3. Monitor for Errors

Check application logs for:
- RPC call failures
- Hash calculation errors
- Unique constraint violations
- Type coercion issues

## Rollback Plan

### Option 1: Disable Feature Flag (Immediate)

```bash
# Set environment variable
NEXT_PUBLIC_SCD2_USE_V3=false
```

This immediately switches API routes back to v2/v1 functions.

### Option 2: Drop v3 Functions (If Needed)

```sql
-- Drop v3 wrappers (triggers and base functions remain)
DROP FUNCTION IF EXISTS public.fn_tcm_user_tally_card_entries_patch_scd2_v3;
DROP FUNCTION IF EXISTS public.fn_tcm_tally_cards_patch_scd2_v3;

-- Re-attach old triggers (if they were dropped)
-- Note: Old trigger functions should still exist
CREATE TRIGGER trg_user_entry_set_hashdiff
  BEFORE INSERT OR UPDATE ON public.tcm_user_tally_card_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_user_entry_set_hashdiff();

CREATE TRIGGER trg_tally_card_set_hashdiff
  BEFORE INSERT OR UPDATE ON public.tcm_tally_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_tally_card_set_hashdiff();
```

### Option 3: Full Rollback (Nuclear Option)

```sql
-- Drop all v3 artifacts
DROP FUNCTION IF EXISTS public.fn_tcm_user_tally_card_entries_patch_scd2_v3;
DROP FUNCTION IF EXISTS public.fn_tcm_tally_cards_patch_scd2_v3;
DROP FUNCTION IF EXISTS public.fn_scd2_patch_base;
DROP FUNCTION IF EXISTS public.fn_scd2_attach_trigger;
DROP FUNCTION IF EXISTS public.fn_scd2_trigger_hash_shim;
DROP FUNCTION IF EXISTS public.fn_scd2_get_config;
DROP FUNCTION IF EXISTS public.fn_scd2_register_resource;
DROP FUNCTION IF EXISTS public.fn_scd2_hash;
DROP VIEW IF EXISTS public.v_scd2_constraint_parity;
DROP TABLE IF EXISTS public.scd2_resource_config;

-- Re-attach old triggers
DROP TRIGGER IF EXISTS trg_tcm_user_tally_card_entries_hash ON public.tcm_user_tally_card_entries;
DROP TRIGGER IF EXISTS trg_tcm_tally_cards_hash ON public.tcm_tally_cards;

CREATE TRIGGER trg_user_entry_set_hashdiff
  BEFORE INSERT OR UPDATE ON public.tcm_user_tally_card_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_user_entry_set_hashdiff();

CREATE TRIGGER trg_tally_card_set_hashdiff
  BEFORE INSERT OR UPDATE ON public.tcm_tally_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_tally_card_set_hashdiff();
```

## Performance Notes

### Hash Calculation
- **One digest() per write**: Both trigger and wrapper use the same `fn_scd2_hash` function
- **JSONB operations only**: No text coercion; types preserved
- **Config-driven**: Hash columns defined in config table, not hardcoded

### Lock Scope
- **FOR UPDATE on latest by anchor+temporal**: Prevents race conditions
- **Idempotency check before insert**: Reduces unnecessary inserts

### Expected Performance
- **Hash calculation**: ~0.1ms per record
- **Idempotency check**: ~1-5ms (depends on index)
- **Insert**: ~2-5ms (depends on table size)

## Verification Checklist

- [ ] Migration applied successfully
- [ ] Config table populated with 2 resources
- [ ] All functions created and callable
- [ ] Triggers attached to both tables
- [ ] Hash parity test passes
- [ ] No-change test passes
- [ ] Single change test passes
- [ ] Duplicate submit test passes
- [ ] Constraint parity view shows matches=true
- [ ] API routes callable with v3
- [ ] Feature flag works (can toggle v3 on/off)
- [ ] No regressions in existing functionality
- [ ] Application logs show no errors

## Support

If issues arise:
1. Check application logs for RPC errors
2. Verify config table has correct data
3. Run constraint parity view to check index alignment
4. Test hash parity manually
5. Verify feature flag is set correctly
6. Check that triggers are enabled and attached

## Next Steps

After successful rollout:
1. Monitor for 1-2 weeks
2. Remove v1/v2 functions (optional, after validation period)
3. Document pattern for future resources
4. Create template for adding new SCD2 resources



