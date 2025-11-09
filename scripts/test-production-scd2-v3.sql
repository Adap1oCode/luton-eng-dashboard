-- ============================================================================
-- Test Script: Production SCD2 v3 Pattern
-- Purpose: Verify hash parity, idempotency, no-change detection, and duplicate handling
-- ============================================================================

-- ============================================================================
-- Setup: Create test user and test data
-- ============================================================================

-- Note: This assumes you have a test user and test data
-- Adjust auth.uid() and test data as needed for your environment

\echo '============================================================================'
\echo 'Test 1: Hash Parity (Trigger vs Helper)'
\echo '============================================================================'

-- Test that trigger-calculated hashdiff matches helper-calculated hashdiff
DO $$
DECLARE
  v_test_record jsonb;
  v_config jsonb;
  v_trigger_hash text;
  v_helper_hash text;
BEGIN
  -- Get config for entries table
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  -- Build a test record
  v_test_record := jsonb_build_object(
    'updated_by_user_id', '00000000-0000-0000-0000-000000000001'::uuid,
    'tally_card_number', 'TEST-001',
    'card_uid', NULL,
    'qty', 10,
    'location', 'A1',
    'note', 'Test note',
    'role_family', 'test',
    'reason_code', 'TEST',
    'multi_location', false
  );
  
  -- Calculate hash using helper
  v_helper_hash := public.fn_scd2_hash(v_test_record, jsonb_build_object('hashdiff_columns', v_config->'hashdiff_columns'));
  
  -- Insert a row (trigger will calculate hashdiff)
  INSERT INTO public.tcm_user_tally_card_entries (
    updated_by_user_id,
    role_family,
    card_uid,
    tally_card_number,
    qty,
    location,
    note,
    reason_code,
    multi_location
  ) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test',
    NULL,
    'TEST-001',
    10,
    'A1',
    'Test note',
    'TEST',
    false
  ) RETURNING hashdiff INTO v_trigger_hash;
  
  -- Compare hashes
  IF v_trigger_hash = v_helper_hash THEN
    RAISE NOTICE '✓ Hash parity test PASSED: trigger hash = helper hash = %', v_trigger_hash;
  ELSE
    RAISE EXCEPTION '✗ Hash parity test FAILED: trigger hash (%) != helper hash (%)', v_trigger_hash, v_helper_hash;
  END IF;
  
  -- Cleanup
  DELETE FROM public.tcm_user_tally_card_entries WHERE tally_card_number = 'TEST-001';
END $$;

\echo ''
\echo '============================================================================'
\echo 'Test 2: No Change Detection'
\echo '============================================================================'

-- Test that calling wrapper with no changes returns existing row
DO $$
DECLARE
  v_test_id uuid;
  v_result_id uuid;
  v_initial_hash text;
  v_final_hash text;
BEGIN
  -- Insert a test row
  INSERT INTO public.tcm_user_tally_card_entries (
    updated_by_user_id,
    role_family,
    tally_card_number,
    qty,
    location,
    note,
    reason_code,
    multi_location
  ) VALUES (
    (SELECT id FROM public.users LIMIT 1),
    'test',
    'TEST-NOCHANGE',
    5,
    'B1',
    'Initial note',
    'TEST',
    false
  ) RETURNING id, hashdiff INTO v_test_id, v_initial_hash;
  
  -- Call wrapper with no changes (all NULLs)
  SELECT id INTO v_result_id
  FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
    p_id := v_test_id,
    p_reason_code := NULL,
    p_multi_location := NULL,
    p_qty := NULL,
    p_location := NULL,
    p_note := NULL
  );
  
  -- Verify same ID returned
  IF v_result_id = v_test_id THEN
    RAISE NOTICE '✓ No-change test PASSED: returned existing id %', v_result_id;
  ELSE
    RAISE EXCEPTION '✗ No-change test FAILED: expected id %, got %', v_test_id, v_result_id;
  END IF;
  
  -- Verify hashdiff unchanged
  SELECT hashdiff INTO v_final_hash
  FROM public.tcm_user_tally_card_entries
  WHERE id = v_test_id;
  
  IF v_final_hash = v_initial_hash THEN
    RAISE NOTICE '✓ Hashdiff unchanged: %', v_final_hash;
  ELSE
    RAISE EXCEPTION '✗ Hashdiff changed: initial (%), final (%)', v_initial_hash, v_final_hash;
  END IF;
  
  -- Cleanup
  DELETE FROM public.tcm_user_tally_card_entries WHERE id = v_test_id;
END $$;

\echo ''
\echo '============================================================================'
\echo 'Test 3: Single Change Detection'
\echo '============================================================================'

-- Test that a single change creates a new row with new hashdiff
DO $$
DECLARE
  v_test_id uuid;
  v_new_id uuid;
  v_initial_hash text;
  v_new_hash text;
BEGIN
  -- Insert a test row
  INSERT INTO public.tcm_user_tally_card_entries (
    updated_by_user_id,
    role_family,
    tally_card_number,
    qty,
    location,
    note,
    reason_code,
    multi_location
  ) VALUES (
    (SELECT id FROM public.users LIMIT 1),
    'test',
    'TEST-SINGLE',
    5,
    'B1',
    'Initial note',
    'TEST',
    false
  ) RETURNING id, hashdiff INTO v_test_id, v_initial_hash;
  
  -- Call wrapper with a change (qty: 5 -> 10)
  SELECT id INTO v_new_id
  FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
    p_id := v_test_id,
    p_qty := 10
  );
  
  -- Verify new ID returned
  IF v_new_id != v_test_id THEN
    RAISE NOTICE '✓ Single change test PASSED: new id % (was %)', v_new_id, v_test_id;
  ELSE
    RAISE EXCEPTION '✗ Single change test FAILED: expected new id, got same id %', v_test_id;
  END IF;
  
  -- Verify hashdiff changed
  SELECT hashdiff INTO v_new_hash
  FROM public.tcm_user_tally_card_entries
  WHERE id = v_new_id;
  
  IF v_new_hash != v_initial_hash THEN
    RAISE NOTICE '✓ Hashdiff changed: initial (%), new (%)', v_initial_hash, v_new_hash;
  ELSE
    RAISE EXCEPTION '✗ Hashdiff unchanged: %', v_initial_hash;
  END IF;
  
  -- Cleanup
  DELETE FROM public.tcm_user_tally_card_entries WHERE tally_card_number = 'TEST-SINGLE';
END $$;

\echo ''
\echo '============================================================================'
\echo 'Test 4: Duplicate Submit (Idempotency)'
\echo '============================================================================'

-- Test that submitting the same change twice returns the same row
DO $$
DECLARE
  v_test_id uuid;
  v_first_id uuid;
  v_second_id uuid;
BEGIN
  -- Insert a test row
  INSERT INTO public.tcm_user_tally_card_entries (
    updated_by_user_id,
    role_family,
    tally_card_number,
    qty,
    location,
    note,
    reason_code,
    multi_location
  ) VALUES (
    (SELECT id FROM public.users LIMIT 1),
    'test',
    'TEST-DUP',
    5,
    'B1',
    'Initial note',
    'TEST',
    false
  ) RETURNING id INTO v_test_id;
  
  -- First change: qty 5 -> 10
  SELECT id INTO v_first_id
  FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
    p_id := v_test_id,
    p_qty := 10
  );
  
  -- Second change: same qty (10 -> 10, but should be idempotent)
  SELECT id INTO v_second_id
  FROM public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
    p_id := v_first_id,
    p_qty := 10
  );
  
  -- Verify same ID returned (idempotent)
  IF v_first_id = v_second_id THEN
    RAISE NOTICE '✓ Duplicate submit test PASSED: both calls returned id %', v_first_id;
  ELSE
    RAISE EXCEPTION '✗ Duplicate submit test FAILED: first id (%), second id (%)', v_first_id, v_second_id;
  END IF;
  
  -- Verify only one new row created (original + one change)
  DECLARE
    v_row_count integer;
  BEGIN
    SELECT COUNT(*) INTO v_row_count
    FROM public.tcm_user_tally_card_entries
    WHERE tally_card_number = 'TEST-DUP';
    
    IF v_row_count = 2 THEN
      RAISE NOTICE '✓ Row count correct: 2 rows (original + one change)';
    ELSE
      RAISE EXCEPTION '✗ Row count incorrect: expected 2, got %', v_row_count;
    END IF;
  END;
  
  -- Cleanup
  DELETE FROM public.tcm_user_tally_card_entries WHERE tally_card_number = 'TEST-DUP';
END $$;

\echo ''
\echo '============================================================================'
\echo 'Test 5: Constraint Parity Check'
\echo '============================================================================'

-- Verify that configured unique_key matches actual unique indexes
SELECT
  table_name,
  config_unique_key,
  actual_index_columns,
  matches
FROM public.v_scd2_constraint_parity;

\echo ''
\echo '============================================================================'
\echo 'Test 6: Tally Cards SCD2 (Basic)'
\echo '============================================================================'

-- Test tally cards wrapper (simplified - requires existing card_uid)
DO $$
DECLARE
  v_test_card_id uuid;
  v_result_count integer;
BEGIN
  -- Check if any tally cards exist
  SELECT id INTO v_test_card_id
  FROM public.tcm_tally_cards
  LIMIT 1;
  
  IF v_test_card_id IS NULL THEN
    RAISE NOTICE '⚠ Skipping tally cards test: no test data available';
    RETURN;
  END IF;
  
  -- Call wrapper with no changes
  SELECT COUNT(*) INTO v_result_count
  FROM public.fn_tcm_tally_cards_patch_scd2_v3(
    p_id := v_test_card_id,
    p_warehouse_id := NULL,
    p_tally_card_number := NULL,
    p_item_number := NULL,
    p_note := NULL,
    p_is_active := NULL
  );
  
  RAISE NOTICE '✓ Tally cards wrapper callable: returned % row(s)', v_result_count;
END $$;

\echo ''
\echo '============================================================================'
\echo 'All Tests Complete'
\echo '============================================================================'



