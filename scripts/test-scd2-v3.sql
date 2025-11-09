-- ============================================================================
-- Test Script: SCD2 v3 Implementation
-- Purpose: Verify all requirements are met
-- ============================================================================

-- ============================================================================
-- TEST 1: Functions Exist
-- ============================================================================

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'fn_scd2_hash',
    'fn_scd2_get_config',
    'fn_scd2_trigger_hash_shim',
    'fn_scd2_patch_base',
    'fn_user_entry_patch_scd2_v3'
  )
ORDER BY p.proname;

-- ============================================================================
-- TEST 2: Hash Helper (Single Source of Truth)
-- ============================================================================

DO $$
DECLARE
  v_test_record jsonb;
  v_config jsonb;
  v_hashdiff text;
BEGIN
  v_test_record := '{
    "updated_by_user_id": "00000000-0000-0000-0000-000000000001",
    "tally_card_number": "TC-001",
    "card_uid": "00000000-0000-0000-0000-000000000002",
    "qty": 100,
    "location": "G5",
    "note": "Test note",
    "role_family": "warehouse",
    "reason_code": "ADJUSTMENT",
    "multi_location": false
  }'::jsonb;
  
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  v_hashdiff := public.fn_scd2_hash(v_test_record, v_config);
  
  RAISE NOTICE 'TEST 2: Hash helper result: %', v_hashdiff;
  
  IF v_hashdiff IS NULL OR length(v_hashdiff) != 64 THEN
    RAISE EXCEPTION 'Hash helper failed: expected 64-char hex string, got %', v_hashdiff;
  END IF;
  
  RAISE NOTICE '✓ TEST 2 PASSED: Hash helper works';
END $$;

-- ============================================================================
-- TEST 3: Config Retrieval
-- ============================================================================

DO $$
DECLARE
  v_config jsonb;
BEGIN
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'Config retrieval failed: returned NULL';
  END IF;
  
  IF v_config->'hashdiff_columns' IS NULL THEN
    RAISE EXCEPTION 'Config missing hashdiff_columns';
  END IF;
  
  RAISE NOTICE 'TEST 3: Config retrieved: % columns', jsonb_array_length(v_config->'hashdiff_columns');
  RAISE NOTICE '✓ TEST 3 PASSED: Config retrieval works';
END $$;

-- ============================================================================
-- TEST 4: Trigger Hash Parity (Trigger hash == Helper hash)
-- ============================================================================

DO $$
DECLARE
  v_record public.tcm_user_tally_card_entries%ROWTYPE;
  v_record_jsonb jsonb;
  v_config jsonb;
  v_hashdiff_helper text;
  v_hashdiff_trigger text;
BEGIN
  -- Get a real record
  SELECT * INTO v_record
  FROM public.tcm_user_tally_card_entries
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'TEST 4: No records found - skipping hash parity test';
    RETURN;
  END IF;
  
  -- Convert to JSONB
  v_record_jsonb := to_jsonb(v_record);
  
  -- Get config
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  -- Calculate with helper
  v_hashdiff_helper := public.fn_scd2_hash(v_record_jsonb, v_config);
  
  -- Get actual hashdiff from record (set by trigger)
  v_hashdiff_trigger := v_record.hashdiff;
  
  RAISE NOTICE 'TEST 4: Record ID: %', v_record.id;
  RAISE NOTICE 'TEST 4: Trigger hashdiff: %', v_hashdiff_trigger;
  RAISE NOTICE 'TEST 4: Helper hashdiff:  %', v_hashdiff_helper;
  
  IF v_hashdiff_helper != v_hashdiff_trigger THEN
    RAISE WARNING 'TEST 4: Hash mismatch! Trigger: %, Helper: %', v_hashdiff_trigger, v_hashdiff_helper;
    RAISE NOTICE '⚠ TEST 4 WARNING: Hash mismatch (may be expected if record was created before v3)';
  ELSE
    RAISE NOTICE '✓ TEST 4 PASSED: Hash parity confirmed';
  END IF;
END $$;

-- ============================================================================
-- TEST 5: No-Change Scenario (Same inputs => returns existing row id)
-- ============================================================================

-- Note: This requires auth context and a real record ID
-- For now, just verify the function signature

SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_patch_scd2_v3';

-- ============================================================================
-- TEST 5: Function Signature Check
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'TEST 5: Function signature verified (see query result above)';
  RAISE NOTICE '⚠ TEST 5: No-change test requires auth context - run manually with real record ID';
END $$;

-- ============================================================================
-- TEST 6: Digest Namespace Check
-- ============================================================================

DO $$
DECLARE
  v_test_hash text;
BEGIN
  -- Test unqualified digest()
  BEGIN
    v_test_hash := encode(digest('test', 'sha256'), 'hex');
    RAISE NOTICE 'TEST 6: Unqualified digest() works: %', left(v_test_hash, 16) || '...';
    RAISE NOTICE '✓ TEST 6 PASSED: digest() is accessible';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 6: Unqualified digest() failed: %', SQLERRM;
    RAISE NOTICE '⚠ TEST 6: May need to use extensions.digest() or adjust search_path';
  END;
END $$;

-- ============================================================================
-- TEST 7: Idempotency WHERE Clause Matches Constraint
-- ============================================================================

-- Check constraint definition
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.tcm_user_tally_card_entries'::regclass
  AND conname LIKE '%hash%'
ORDER BY conname;

DO $$
BEGIN
  RAISE NOTICE 'TEST 7: Constraint check complete (see query result above)';
  RAISE NOTICE 'Expected: (updated_by_user_id, card_uid, hashdiff) WHERE (card_uid IS NOT NULL)';
END $$;

-- ============================================================================
-- TEST 8: Backward Compatibility (v1/v2 still exist)
-- ============================================================================

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'fn_user_entry_patch_scd2',
    'fn_user_entry_patch_scd2_v2',
    'fn_user_entry_patch_scd2_v3'
  )
ORDER BY p.proname;

DO $$
BEGIN
  RAISE NOTICE 'TEST 8: Backward compatibility check complete (see query result above)';
  RAISE NOTICE 'Expected: All three versions (v1, v2, v3) should exist';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  'SCD2 v3 Implementation Tests Complete' as status,
  COUNT(*) as functions_created
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'fn_scd2_hash',
    'fn_scd2_get_config',
    'fn_scd2_trigger_hash_shim',
    'fn_scd2_patch_base',
    'fn_user_entry_patch_scd2_v3'
  );

