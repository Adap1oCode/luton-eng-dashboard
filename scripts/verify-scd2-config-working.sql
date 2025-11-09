-- ============================================================================
-- Verification: Test that fn_scd2_get_config actually works
-- This returns rows so you can see the results in Supabase SQL editor
-- ============================================================================

-- Test 1: Can we retrieve the config for entries?
SELECT 
  'tcm_user_tally_card_entries' AS table_name,
  CASE 
    WHEN public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) IS NOT NULL 
    THEN '✓ FOUND' 
    ELSE '✗ NOT FOUND' 
  END AS lookup_status,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass)->>'table_name' AS config_table_name,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass)->>'anchor_col' AS config_anchor_col;

-- Test 2: Can we retrieve the config for tally cards?
SELECT 
  'tcm_tally_cards' AS table_name,
  CASE 
    WHEN public.fn_scd2_get_config('public.tcm_tally_cards'::regclass) IS NOT NULL 
    THEN '✓ FOUND' 
    ELSE '✗ NOT FOUND' 
  END AS lookup_status,
  public.fn_scd2_get_config('public.tcm_tally_cards'::regclass)->>'table_name' AS config_table_name,
  public.fn_scd2_get_config('public.tcm_tally_cards'::regclass)->>'anchor_col' AS config_anchor_col;

-- Test 3: Show what's actually in the config table (for comparison)
SELECT 
  'Config Table Contents' AS source,
  table_name,
  anchor_col,
  temporal_col,
  user_scoped
FROM public.scd2_resource_config
ORDER BY table_name;

-- Expected Results:
-- Test 1: lookup_status should be '✓ FOUND', config_table_name should be 'public.tcm_user_tally_card_entries'
-- Test 2: lookup_status should be '✓ FOUND', config_table_name should be 'public.tcm_tally_cards'
-- Test 3: Should show both rows


