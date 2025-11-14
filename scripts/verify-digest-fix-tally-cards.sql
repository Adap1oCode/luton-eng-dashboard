-- ============================================================================
-- Verification Script: Check digest() function fix for tally cards
-- Purpose: Run this after applying 20251114_fix_digest_function_tally_cards.sql
-- ============================================================================

-- ============================================================================
-- Step 1: Check Current Function Definition
-- ============================================================================
-- This shows the actual function definition in the database
SELECT 
  p.proname AS function_name,
  substring(pg_get_functiondef(p.oid), 1, 200) AS definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_scd2_hash';

-- ============================================================================
-- Step 2: Check for Unqualified digest() Calls
-- ============================================================================
-- This finds any functions that use unqualified digest() (should be empty after fix)
SELECT 
  p.proname,
  substring(pg_get_functiondef(p.oid), 1, 300) AS definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) LIKE '%digest(%'
  AND pg_get_functiondef(p.oid) NOT LIKE '%extensions.digest(%'
  AND pg_get_functiondef(p.oid) NOT LIKE '%pg_catalog.digest(%';

-- ============================================================================
-- Step 2b: Check tcm_cards_set_hash() function specifically
-- ============================================================================
-- This is the old function that was causing the issue
SELECT 
  p.proname,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%extensions.digest(%' 
    THEN '✓ Uses extensions.digest() - FIXED!'
    WHEN pg_get_functiondef(p.oid) LIKE '%digest(%' 
    THEN '✗ Uses unqualified digest() - STILL BROKEN!'
    ELSE '⚠ Function not found or no digest() call'
  END AS fix_status,
  substring(pg_get_functiondef(p.oid), 1, 200) AS definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'tcm_cards_set_hash';

-- ============================================================================
-- Step 3: Verify pgcrypto Extension
-- ============================================================================
-- Check if pgcrypto is enabled
SELECT 
  extname,
  extversion,
  CASE 
    WHEN extname = 'pgcrypto' THEN '✓ pgcrypto extension is enabled'
    ELSE '✗ pgcrypto extension is NOT enabled'
  END AS status
FROM pg_extension 
WHERE extname = 'pgcrypto';

-- Test if extensions.digest() is accessible
SELECT 
  'extensions.digest() test' AS test_name,
  encode(extensions.digest('test', 'sha256'), 'hex') AS result,
  CASE 
    WHEN encode(extensions.digest('test', 'sha256'), 'hex') IS NOT NULL 
    THEN '✓ extensions.digest() is accessible'
    ELSE '✗ extensions.digest() is NOT accessible'
  END AS status;

-- ============================================================================
-- Step 4: Check Function Search Path
-- ============================================================================
-- Check search_path for fn_scd2_hash
SELECT 
  p.proname,
  p.proconfig AS search_path_config,
  CASE 
    WHEN p.proconfig IS NULL THEN 'Uses default search_path'
    ELSE 'Custom search_path: ' || array_to_string(p.proconfig, ', ')
  END AS search_path_info
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_scd2_hash';

-- ============================================================================
-- Step 5: Test fn_scd2_hash() Function
-- ============================================================================
-- Test the hash function with a sample config
DO $$
DECLARE
  v_test_config jsonb;
  v_test_record jsonb;
  v_hash text;
  v_test_passed boolean := false;
BEGIN
  -- Try to get a config from scd2_resource_config
  SELECT row_to_json(c.*)::jsonb INTO v_test_config
  FROM public.scd2_resource_config c
  WHERE c.table_name IN ('public.tcm_tally_cards', 'public.tcm_user_tally_card_entries')
  LIMIT 1;
  
  IF v_test_config IS NOT NULL THEN
    -- Create a test record matching the config structure
    v_test_record := jsonb_build_object(
      'card_uid', '00000000-0000-0000-0000-000000000000'::uuid,
      'warehouse_id', '00000000-0000-0000-0000-000000000000'::uuid,
      'tally_card_number', 'TEST',
      'item_number', 123,
      'note', 'test note',
      'is_active', true
    );
    
    -- Test the hash function
    BEGIN
      v_hash := public.fn_scd2_hash(v_test_record, v_test_config);
      RAISE NOTICE '✓ fn_scd2_hash() test PASSED! Generated hash: %', substring(v_hash, 1, 16) || '...';
      v_test_passed := true;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '✗ fn_scd2_hash() test FAILED: %', SQLERRM;
      RAISE NOTICE 'Error details: %', SQLSTATE;
    END;
  ELSE
    RAISE NOTICE '⚠ No SCD2 config found - skipping fn_scd2_hash() test';
    RAISE NOTICE 'This is OK if scd2_resource_config table is empty';
  END IF;
END $$;

-- ============================================================================
-- Step 6: Check for digest() in fn_scd2_hash definition
-- ============================================================================
-- This should show 'extensions.digest' if the fix is applied correctly
SELECT 
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%extensions.digest(%' 
    THEN '✓ Function uses extensions.digest() - FIXED!'
    WHEN pg_get_functiondef(p.oid) LIKE '%digest(%' 
    THEN '✗ Function uses unqualified digest() - STILL BROKEN!'
    ELSE '⚠ Could not determine digest() usage'
  END AS fix_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_scd2_hash';

-- ============================================================================
-- Summary
-- ============================================================================
-- After running this script, you should see:
-- 1. ✓ pgcrypto extension is enabled
-- 2. ✓ extensions.digest() is accessible
-- 3. ✓ fn_scd2_hash() test PASSED!
-- 4. ✓ Function uses extensions.digest() - FIXED!
--
-- If any of these show ✗, the fix may not have been applied correctly.

