-- ============================================================================
-- Simple Verification: Test fn_scd2_get_config in one query
-- ============================================================================

SELECT 
  'tcm_user_tally_card_entries' AS table_name,
  CASE 
    WHEN public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) IS NOT NULL 
    THEN '✓ FOUND' 
    ELSE '✗ NOT FOUND - THIS IS THE PROBLEM!' 
  END AS lookup_status,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass)->>'table_name' AS config_table_name,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass)->>'anchor_col' AS config_anchor_col

UNION ALL

SELECT 
  'tcm_tally_cards' AS table_name,
  CASE 
    WHEN public.fn_scd2_get_config('public.tcm_tally_cards'::regclass) IS NOT NULL 
    THEN '✓ FOUND' 
    ELSE '✗ NOT FOUND - THIS IS THE PROBLEM!' 
  END AS lookup_status,
  public.fn_scd2_get_config('public.tcm_tally_cards'::regclass)->>'table_name' AS config_table_name,
  public.fn_scd2_get_config('public.tcm_tally_cards'::regclass)->>'anchor_col' AS config_anchor_col;

-- Expected: Both rows should show lookup_status = '✓ FOUND'
-- If either shows '✗ NOT FOUND', the function isn't working and we need to debug


