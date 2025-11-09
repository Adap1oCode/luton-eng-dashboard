-- ============================================================================
-- Quick Fix: Re-register Stock Adjustments SCD2 Config
-- Run this if you get "No SCD2 config found for public.tcm_user_tally_card_entries"
-- ============================================================================

-- Re-register Stock Adjustments (this uses UPSERT, so safe to run multiple times)
SELECT public.fn_scd2_register_resource(
  'public.tcm_user_tally_card_entries',
  'tally_card_number',
  'updated_at',
  true,  -- user_scoped
  '[
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"qty","type":"integer","normalize":"none"},
    {"name":"location","type":"text","normalize":"lower_trim"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"reason_code","type":"text","normalize":"upper_trim"},
    {"name":"multi_location","type":"boolean","normalize":"none","default":"false"},
    {"name":"updated_by_user_id","type":"uuid","normalize":"none"},
    {"name":"role_family","type":"text","normalize":"upper_trim"},
    {"name":"card_uid","type":"uuid","normalize":"none"}
  ]'::jsonb,
  ARRAY['updated_by_user_id', 'tally_card_number', 'hashdiff']::text[]
);

-- Verify it worked
SELECT 
  'Registration result' as status,
  table_name,
  anchor_col,
  temporal_col,
  user_scoped
FROM public.scd2_resource_config
WHERE table_name = 'public.tcm_user_tally_card_entries';

-- Test the lookup function
SELECT 
  'Lookup test' as test,
  CASE 
    WHEN public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) IS NOT NULL 
    THEN '✓ SUCCESS - Config found!' 
    ELSE '✗ FAILED - Still not found' 
  END as result;

