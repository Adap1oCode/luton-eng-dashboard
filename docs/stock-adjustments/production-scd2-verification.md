# Production SCD2 Pattern - Verification Guide

## Quick Verification Queries

### 1. Check Config Table

```sql
SELECT 
  table_name,
  anchor_col,
  temporal_col,
  user_scoped,
  jsonb_array_length(hashdiff_columns) AS hash_column_count,
  array_length(unique_key, 1) AS unique_key_length
FROM public.scd2_resource_config
ORDER BY table_name;
```

**Expected Output:**
```
table_name                          | anchor_col        | temporal_col | user_scoped | hash_column_count | unique_key_length
------------------------------------+-------------------+--------------+-------------+------------------+------------------
public.tcm_tally_cards              | card_uid          | snapshot_at  | false       | 6                | 2
public.tcm_user_tally_card_entries  | tally_card_number | updated_at   | true        | 9                | 3
```

### 2. Verify Functions Exist

```sql
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type
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
)
ORDER BY proname;
```

**Expected:** 8 functions

### 3. Verify Triggers Attached

```sql
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname IN (
  'trg_tcm_user_tally_card_entries_hash',
  'trg_tcm_tally_cards_hash'
)
ORDER BY tgname;
```

**Expected:** 2 triggers, both enabled ('O')

### 4. Constraint Parity Check

```sql
SELECT 
  table_name,
  config_unique_key,
  actual_index_columns,
  matches
FROM public.v_scd2_constraint_parity
ORDER BY table_name;
```

**Expected:** `matches = true` for both tables

### 5. Test Hash Parity (Manual)

```sql
-- Test for entries table
DO $$
DECLARE
  v_config jsonb;
  v_test_record jsonb;
  v_helper_hash text;
  v_trigger_hash text;
  v_test_id uuid;
BEGIN
  -- Get config
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  -- Build test record
  v_test_record := jsonb_build_object(
    'updated_by_user_id', (SELECT id FROM public.users LIMIT 1),
    'tally_card_number', 'VERIFY-HASH',
    'card_uid', NULL,
    'qty', 42,
    'location', 'TEST-LOC',
    'note', 'Verification test',
    'role_family', 'test',
    'reason_code', 'VERIFY',
    'multi_location', false
  );
  
  -- Calculate hash using helper
  v_helper_hash := public.fn_scd2_hash(
    v_test_record, 
    jsonb_build_object('hashdiff_columns', v_config->'hashdiff_columns')
  );
  
  -- Insert row (trigger calculates hashdiff)
  INSERT INTO public.tcm_user_tally_card_entries (
    updated_by_user_id, role_family, tally_card_number, qty, location, note, reason_code, multi_location
  ) VALUES (
    (SELECT id FROM public.users LIMIT 1), 'test', 'VERIFY-HASH', 42, 'TEST-LOC', 'Verification test', 'VERIFY', false
  ) RETURNING id, hashdiff INTO v_test_id, v_trigger_hash;
  
  -- Compare
  IF v_helper_hash = v_trigger_hash THEN
    RAISE NOTICE '✓ Hash parity VERIFIED: %', v_helper_hash;
  ELSE
    RAISE EXCEPTION '✗ Hash parity FAILED: helper (%), trigger (%)', v_helper_hash, v_trigger_hash;
  END IF;
  
  -- Cleanup
  DELETE FROM public.tcm_user_tally_card_entries WHERE id = v_test_id;
END $$;
```

### 6. Test Wrapper Functions

```sql
-- Test entries wrapper (requires existing entry)
DO $$
DECLARE
  v_test_id uuid;
  v_result_id uuid;
BEGIN
  -- Get an existing entry
  SELECT id INTO v_test_id
  FROM public.tcm_user_tally_card_entries
  LIMIT 1;
  
  IF v_test_id IS NULL THEN
    RAISE NOTICE '⚠ No test data available';
    RETURN;
  END IF;
  
  -- Call wrapper with no changes
  SELECT id INTO v_result_id
  FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
    p_id := v_test_id,
    p_reason_code := NULL,
    p_multi_location := NULL,
    p_qty := NULL,
    p_location := NULL,
    p_note := NULL
  );
  
  IF v_result_id = v_test_id THEN
    RAISE NOTICE '✓ Entries wrapper VERIFIED: no-change returns existing id';
  ELSE
    RAISE EXCEPTION '✗ Entries wrapper FAILED: expected %, got %', v_test_id, v_result_id;
  END IF;
END $$;

-- Test tally cards wrapper (requires existing card)
DO $$
DECLARE
  v_test_id uuid;
  v_result_count integer;
BEGIN
  -- Get an existing card
  SELECT id INTO v_test_id
  FROM public.tcm_tally_cards
  LIMIT 1;
  
  IF v_test_id IS NULL THEN
    RAISE NOTICE '⚠ No test data available';
    RETURN;
  END IF;
  
  -- Call wrapper with no changes
  SELECT COUNT(*) INTO v_result_count
  FROM public.fn_tcm_tally_cards_patch_scd2_v3(
    p_id := v_test_id,
    p_warehouse_id := NULL,
    p_tally_card_number := NULL,
    p_item_number := NULL,
    p_note := NULL,
    p_is_active := NULL
  );
  
  IF v_result_count = 1 THEN
    RAISE NOTICE '✓ Tally cards wrapper VERIFIED: returns 1 row';
  ELSE
    RAISE EXCEPTION '✗ Tally cards wrapper FAILED: expected 1 row, got %', v_result_count;
  END IF;
END $$;
```

## Performance Verification

### 1. Hash Calculation Performance

```sql
-- Measure hash calculation time
EXPLAIN ANALYZE
SELECT public.fn_scd2_hash(
  jsonb_build_object(
    'updated_by_user_id', gen_random_uuid(),
    'tally_card_number', 'PERF-TEST',
    'card_uid', NULL,
    'qty', 10,
    'location', 'A1',
    'note', 'Test',
    'role_family', 'test',
    'reason_code', 'TEST',
    'multi_location', false
  ),
  (SELECT jsonb_build_object('hashdiff_columns', hashdiff_columns) FROM public.scd2_resource_config WHERE table_name = 'public.tcm_user_tally_card_entries')
);
```

**Expected:** Execution time < 1ms

### 2. Idempotency Check Performance

```sql
-- Measure idempotency check time (requires existing data)
EXPLAIN ANALYZE
SELECT t.id
FROM public.tcm_user_tally_card_entries t
WHERE t.updated_by_user_id = (SELECT id FROM public.users LIMIT 1)
  AND t.card_uid IS NULL
  AND t.hashdiff = (SELECT hashdiff FROM public.tcm_user_tally_card_entries LIMIT 1)
ORDER BY t.updated_at DESC
LIMIT 1;
```

**Expected:** Execution time < 5ms (with index)

## Regression Checks

### 1. Verify Legacy Functions Still Exist

```sql
SELECT proname
FROM pg_proc
WHERE proname IN (
  'fn_user_entry_patch_scd2',
  'fn_user_entry_patch_scd2_v2',
  'fn_tally_card_patch_scd2'
)
ORDER BY proname;
```

**Expected:** All 3 functions exist (backward compatibility)

### 2. Verify Legacy Triggers (If Still Attached)

```sql
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname IN (
  'trg_user_entry_set_hashdiff',
  'trg_tally_card_set_hashdiff'
);
```

**Note:** Old triggers may be dropped or disabled. This is expected if v3 triggers are active.

### 3. Check for Deprecated Comments

```sql
SELECT 
  proname,
  obj_description(oid, 'pg_proc') AS comment
FROM pg_proc
WHERE proname IN (
  'fn_user_entry_patch_scd2',
  'fn_user_entry_patch_scd2_v2',
  'fn_tally_card_patch_scd2'
);
```

**Expected:** Comments indicate "Deprecated — replaced by ..."

## Integration Verification

### 1. API Route Test (Stock Adjustments)

```bash
# Test with v3 enabled (default)
curl -X POST http://localhost:3000/api/stock-adjustments/{entry_id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -H "Cookie: {your_auth_cookie}" \
  -d '{"qty": 10, "note": "API test"}'

# Expected: 200 OK with updated row
```

### 2. API Route Test (Tally Cards)

```bash
# Test with v3 enabled (default)
curl -X POST http://localhost:3000/api/tally-cards/{card_id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -H "Cookie: {your_auth_cookie}" \
  -d '{"note": "API test"}'

# Expected: 200 OK with updated row
```

### 3. Feature Flag Test

```bash
# Disable v3
export NEXT_PUBLIC_SCD2_USE_V3=false

# Test API (should use v2/v1)
curl -X POST http://localhost:3000/api/stock-adjustments/{entry_id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -H "Cookie: {your_auth_cookie}" \
  -d '{"qty": 10}'

# Re-enable v3
export NEXT_PUBLIC_SCD2_USE_V3=true
```

## Troubleshooting

### Issue: Hash Parity Fails

**Symptoms:** Helper hash ≠ trigger hash

**Check:**
1. Verify config table has correct hashdiff_columns
2. Check that trigger is using `fn_scd2_trigger_hash_shim`
3. Verify `fn_scd2_hash` uses same normalization rules
4. Check for NULL handling differences

**Fix:**
```sql
-- Re-register resource with correct config
SELECT public.fn_scd2_register_resource(
  'public.tcm_user_tally_card_entries',
  'tally_card_number',
  'updated_at',
  true,
  '[...]'::jsonb,  -- Correct hashdiff_columns
  ARRAY['updated_by_user_id', 'card_uid', 'hashdiff']::text[]
);
```

### Issue: Constraint Parity Fails

**Symptoms:** `matches = false` in constraint parity view

**Check:**
1. Verify unique index exists on table
2. Check that index columns match config's unique_key
3. Verify index includes all columns in unique_key

**Fix:**
```sql
-- Check actual index
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tcm_user_tally_card_entries';

-- Update config to match actual index, or create matching index
```

### Issue: Wrapper Function Fails

**Symptoms:** RPC call returns error

**Check:**
1. Verify function exists and is callable
2. Check function signature matches API call
3. Verify grants (EXECUTE permission)
4. Check for type mismatches

**Fix:**
```sql
-- Check function signature
\df+ public.fn_tcm_user_tally_card_entries_patch_scd2_v3

-- Check grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'fn_tcm_user_tally_card_entries_patch_scd2_v3';
```

### Issue: Trigger Not Firing

**Symptoms:** hashdiff is NULL after insert

**Check:**
1. Verify trigger is attached and enabled
2. Check trigger function exists
3. Verify config table has entry for table

**Fix:**
```sql
-- Re-attach trigger
SELECT public.fn_scd2_attach_trigger('public.tcm_user_tally_card_entries'::regclass);

-- Verify trigger is enabled
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_tcm_user_tally_card_entries_hash';
-- Expected: tgenabled = 'O' (enabled)
```



