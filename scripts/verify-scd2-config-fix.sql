-- Quick verification: Test that config lookup works
-- Run this to confirm the fix is working

SELECT 
  'Testing config lookup...' AS status;

-- Test 1: Direct lookup
SELECT 
  'Test 1: Direct lookup' AS test,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) IS NOT NULL AS entries_found,
  public.fn_scd2_get_config('public.tcm_tally_cards'::regclass) IS NOT NULL AS tally_found;

-- Test 2: Check what the function returns
SELECT 
  'Test 2: Config data for entries' AS test,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass)->>'table_name' AS table_name,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass)->>'anchor_col' AS anchor_col;

-- Test 3: Verify both configs exist
SELECT 
  'Test 3: All registered resources' AS test,
  table_name,
  anchor_col,
  temporal_col,
  user_scoped
FROM public.scd2_resource_config
ORDER BY table_name;

-- Expected result:
-- ✓ entries_found = true
-- ✓ tally_found = true
-- ✓ Both table names should appear in Test 3


