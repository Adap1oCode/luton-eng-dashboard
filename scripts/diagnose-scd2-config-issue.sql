-- ============================================================================
-- Diagnostic Script: SCD2 Config Issue
-- Purpose: Diagnose why "No SCD2 config found for public.tcm_user_tally_card_entries"
-- ============================================================================

\echo '============================================================================'
\echo 'Step 1: Check what is in the config table'
\echo '============================================================================'

SELECT 
  table_name,
  anchor_col,
  temporal_col,
  user_scoped,
  jsonb_array_length(hashdiff_columns) AS hash_column_count,
  array_length(unique_key, 1) AS unique_key_length
FROM public.scd2_resource_config
ORDER BY table_name;

\echo ''
\echo '============================================================================'
\echo 'Step 2: Check what regclass::text produces for the table'
\echo '============================================================================'

SELECT 
  'public.tcm_user_tally_card_entries'::regclass::text AS regclass_to_text,
  'public.tcm_tally_cards'::regclass::text AS regclass_to_text_tally;

\echo ''
\echo '============================================================================'
\echo 'Step 3: Test fn_scd2_get_config directly'
\echo '============================================================================'

SELECT 
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) AS entries_config,
  public.fn_scd2_get_config('public.tcm_tally_cards'::regclass) AS tally_config;

\echo ''
\echo '============================================================================'
\echo 'Step 4: Check exact string comparison'
\echo '============================================================================'

-- Check if there are any whitespace or case differences
SELECT 
  table_name,
  length(table_name) AS name_length,
  table_name = 'public.tcm_user_tally_card_entries' AS exact_match,
  table_name = 'public.tcm_user_tally_card_entries'::text AS exact_match_cast,
  quote_literal(table_name) AS quoted_name
FROM public.scd2_resource_config
WHERE table_name LIKE '%tcm_user_tally_card_entries%'
   OR table_name LIKE '%tcm_tally_cards%';

\echo ''
\echo '============================================================================'
\echo 'Step 5: Test wrapper function directly (if config exists)'
\echo '============================================================================'

-- This will fail if config is missing, which is expected
-- Get a test ID first
DO $$
DECLARE
  v_test_id uuid;
  v_config jsonb;
BEGIN
  -- Get any existing entry ID
  SELECT id INTO v_test_id
  FROM public.tcm_user_tally_card_entries
  LIMIT 1;
  
  IF v_test_id IS NULL THEN
    RAISE NOTICE 'No test data available - skipping wrapper test';
    RETURN;
  END IF;
  
  -- Test config retrieval
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  IF v_config IS NULL THEN
    RAISE WARNING 'Config is NULL - this is the problem!';
    RAISE NOTICE 'Table name in config: %', (SELECT table_name FROM public.scd2_resource_config LIMIT 1);
    RAISE NOTICE 'Regclass to text: %', 'public.tcm_user_tally_card_entries'::regclass::text;
  ELSE
    RAISE NOTICE 'Config found: %', v_config->>'table_name';
  END IF;
END $$;

\echo ''
\echo '============================================================================'
\echo 'Diagnostic Complete'
\echo '============================================================================'



