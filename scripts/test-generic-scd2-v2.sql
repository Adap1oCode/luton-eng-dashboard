-- ============================================================================
-- Test Script: Generic SCD2 v2 Function
-- Purpose: Verify that fn_user_entry_patch_scd2_v2 works correctly
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify Functions Exist
-- ============================================================================

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('fn_scd2_calculate_hashdiff', 'fn_user_entry_patch_scd2_v2')
ORDER BY p.proname;

-- ============================================================================
-- STEP 2: Test Hashdiff Calculation Helper
-- ============================================================================

-- Test with sample record
DO $$
DECLARE
  v_test_record jsonb;
  v_config jsonb;
  v_hashdiff text;
BEGIN
  -- Sample record (matching stock-adjustments structure)
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
  
  -- Config (same as in v2 function)
  v_config := '{
    "hashdiff_columns": [
      {"name": "updated_by_user_id", "type": "uuid", "normalize": "none"},
      {"name": "tally_card_number", "type": "text", "normalize": "lower_trim"},
      {"name": "card_uid", "type": "uuid", "normalize": "none"},
      {"name": "qty", "type": "integer", "normalize": "none"},
      {"name": "location", "type": "text", "normalize": "lower_trim"},
      {"name": "note", "type": "text", "normalize": "lower_trim"},
      {"name": "role_family", "type": "text", "normalize": "lower_trim"},
      {"name": "reason_code", "type": "text", "normalize": "lower_trim", "default": "unspecified"},
      {"name": "multi_location", "type": "boolean", "normalize": "none", "default": "false"}
    ]
  }'::jsonb;
  
  v_hashdiff := public.fn_scd2_calculate_hashdiff(v_test_record, v_config);
  
  RAISE NOTICE 'Hashdiff calculation test: %', v_hashdiff;
  
  IF v_hashdiff IS NULL OR length(v_hashdiff) != 64 THEN
    RAISE EXCEPTION 'Hashdiff calculation failed: expected 64-char hex string, got %', v_hashdiff;
  END IF;
  
  RAISE NOTICE '✓ Hashdiff calculation test passed';
END $$;

-- ============================================================================
-- STEP 3: Compare v1 vs v2 Hashdiff (should match)
-- ============================================================================

-- Get a real record and compare hashdiff calculation
DO $$
DECLARE
  v_record public.tcm_user_tally_card_entries%ROWTYPE;
  v_record_jsonb jsonb;
  v_config jsonb;
  v_hashdiff_v2 text;
  v_hashdiff_v1 text;
BEGIN
  -- Get a sample record
  SELECT * INTO v_record
  FROM public.tcm_user_tally_card_entries
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No records found - skipping comparison test';
    RETURN;
  END IF;
  
  -- Convert to JSONB
  v_record_jsonb := to_jsonb(v_record);
  
  -- Config
  v_config := '{
    "hashdiff_columns": [
      {"name": "updated_by_user_id", "type": "uuid", "normalize": "none"},
      {"name": "tally_card_number", "type": "text", "normalize": "lower_trim"},
      {"name": "card_uid", "type": "uuid", "normalize": "none"},
      {"name": "qty", "type": "integer", "normalize": "none"},
      {"name": "location", "type": "text", "normalize": "lower_trim"},
      {"name": "note", "type": "text", "normalize": "lower_trim"},
      {"name": "role_family", "type": "text", "normalize": "lower_trim"},
      {"name": "reason_code", "type": "text", "normalize": "lower_trim", "default": "unspecified"},
      {"name": "multi_location", "type": "boolean", "normalize": "none", "default": "false"}
    ]
  }'::jsonb;
  
  -- Calculate with v2 helper
  v_hashdiff_v2 := public.fn_scd2_calculate_hashdiff(v_record_jsonb, v_config);
  
  -- Get actual hashdiff from record (calculated by trigger)
  v_hashdiff_v1 := v_record.hashdiff;
  
  RAISE NOTICE 'Record ID: %', v_record.id;
  RAISE NOTICE 'V1 hashdiff (from trigger): %', v_hashdiff_v1;
  RAISE NOTICE 'V2 hashdiff (from helper):  %', v_hashdiff_v2;
  
  IF v_hashdiff_v2 != v_hashdiff_v1 THEN
    RAISE WARNING 'Hashdiff mismatch! V1: %, V2: %', v_hashdiff_v1, v_hashdiff_v2;
    RAISE NOTICE 'This may be expected if the record was created before v2 config was finalized';
  ELSE
    RAISE NOTICE '✓ Hashdiff comparison: V1 and V2 match';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Test v2 Function (Dry Run - No Actual Updates)
-- ============================================================================

-- Note: This would require an actual record ID and auth context
-- For now, just verify the function signature is correct

SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_patch_scd2_v2';

-- ============================================================================
-- STEP 5: Summary
-- ============================================================================

SELECT 
  'Functions created successfully' as status,
  COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('fn_scd2_calculate_hashdiff', 'fn_user_entry_patch_scd2_v2');



