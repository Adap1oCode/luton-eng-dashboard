-- ============================================================================
-- Diagnostic Script: Why is SCD2 config not found?
-- ============================================================================

-- Step 1: Check if config table exists and has data
SELECT 
  'Config table exists' as check_name,
  COUNT(*) as row_count,
  array_agg(table_name) as registered_tables
FROM public.scd2_resource_config;

-- Step 2: Check specific table registration
SELECT 
  'Stock Adjustments config' as check_name,
  table_name,
  anchor_col,
  temporal_col,
  user_scoped,
  jsonb_array_length(hashdiff_columns) as hash_column_count,
  array_length(unique_key, 1) as unique_key_length
FROM public.scd2_resource_config
WHERE table_name = 'public.tcm_user_tally_card_entries'
   OR table_name = 'tcm_user_tally_card_entries';

-- Step 3: Test the get_config function directly
SELECT 
  'fn_scd2_get_config test' as check_name,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) as config_result;

-- Step 4: Test with different table name formats
SELECT 
  'Test format: public.table' as format_test,
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) IS NOT NULL as found;

SELECT 
  'Test format: table only' as format_test,
  public.fn_scd2_get_config('tcm_user_tally_card_entries'::regclass) IS NOT NULL as found;

-- Step 5: Check what regclass::text returns
SELECT 
  'regclass::text format' as check_name,
  'public.tcm_user_tally_card_entries'::regclass::text as regclass_text;

-- Step 6: List ALL registered tables (to see what's actually there)
SELECT 
  'All registered tables' as check_name,
  table_name,
  anchor_col,
  temporal_col
FROM public.scd2_resource_config
ORDER BY table_name;

