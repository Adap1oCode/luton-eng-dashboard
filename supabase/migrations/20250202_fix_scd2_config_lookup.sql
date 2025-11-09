-- ============================================================================
-- Fix: SCD2 Config Lookup Issue
-- Purpose: Fix "No SCD2 config found" error by making config lookup more robust
-- ============================================================================

-- ============================================================================
-- Step 1: Verify and Fix Config Table Data
-- ============================================================================

-- First, let's see what's actually in the config table
DO $$
DECLARE
  v_count integer;
  v_table_names text[];
BEGIN
  SELECT COUNT(*), array_agg(table_name) INTO v_count, v_table_names
  FROM public.scd2_resource_config;
  
  RAISE NOTICE 'Config table has % row(s). Table names: %', v_count, v_table_names;
  
  IF v_count = 0 THEN
    RAISE NOTICE 'Config table is empty - re-registering resources...';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Re-register Resources (UPSERT - safe to run multiple times)
-- ============================================================================

-- Register Stock Adjustments (ensure it exists)
SELECT public.fn_scd2_register_resource(
  'public.tcm_user_tally_card_entries',
  'tally_card_number',
  'updated_at',
  true,  -- user_scoped
  '[
    {"name":"updated_by_user_id","type":"uuid","normalize":"none"},
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"card_uid","type":"uuid","normalize":"none"},
    {"name":"qty","type":"integer","normalize":"none"},
    {"name":"location","type":"text","normalize":"lower_trim"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"role_family","type":"text","normalize":"lower_trim"},
    {"name":"reason_code","type":"text","normalize":"lower_trim","default":"unspecified"},
    {"name":"multi_location","type":"boolean","normalize":"none","default":"false"}
  ]'::jsonb,
  ARRAY['updated_by_user_id', 'card_uid', 'hashdiff']::text[]
);

-- Register Tally Cards (ensure it exists)
SELECT public.fn_scd2_register_resource(
  'public.tcm_tally_cards',
  'card_uid',
  'snapshot_at',
  false,  -- not user_scoped
  '[
    {"name":"card_uid","type":"uuid","normalize":"none"},
    {"name":"warehouse_id","type":"uuid","normalize":"none"},
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"item_number","type":"bigint","normalize":"none"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"is_active","type":"boolean","normalize":"none","default":"true"}
  ]'::jsonb,
  ARRAY['card_uid', 'hashdiff']::text[]
);

-- ============================================================================
-- Step 3: Make Config Getter More Robust
-- ============================================================================
-- Handle both 'public.table' and 'table' formats, and add better error messages

CREATE OR REPLACE FUNCTION public.fn_scd2_get_config(p_table regclass)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  v_table_text text;
  v_config jsonb;
  v_table_name_only text;
BEGIN
  -- Convert regclass to text
  v_table_text := p_table::text;
  
  -- Try exact match first
  SELECT row_to_json(c.*)::jsonb INTO v_config
  FROM public.scd2_resource_config c
  WHERE c.table_name = v_table_text;
  
  -- If not found, try without schema prefix
  IF v_config IS NULL THEN
    -- Extract table name without schema (e.g., 'tcm_user_tally_card_entries' from 'public.tcm_user_tally_card_entries')
    v_table_name_only := substring(v_table_text from '\.([^.]+)$');
    
    SELECT row_to_json(c.*)::jsonb INTO v_config
    FROM public.scd2_resource_config c
    WHERE c.table_name = v_table_name_only
       OR c.table_name = 'public.' || v_table_name_only;
  END IF;
  
  -- If still not found, try with schema prefix if it wasn't there
  IF v_config IS NULL AND v_table_text NOT LIKE 'public.%' THEN
    SELECT row_to_json(c.*)::jsonb INTO v_config
    FROM public.scd2_resource_config c
    WHERE c.table_name = 'public.' || v_table_text;
  END IF;
  
  RETURN v_config;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_scd2_get_config(regclass) TO authenticated;

-- ============================================================================
-- Step 4: Verify Config Lookup Works
-- ============================================================================

DO $$
DECLARE
  v_entries_config jsonb;
  v_tally_config jsonb;
BEGIN
  -- Test entries config
  v_entries_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  IF v_entries_config IS NULL THEN
    RAISE WARNING 'Config lookup FAILED for public.tcm_user_tally_card_entries';
    RAISE NOTICE 'Available configs: %', (SELECT array_agg(table_name) FROM public.scd2_resource_config);
  ELSE
    RAISE NOTICE '✓ Config lookup SUCCESS for public.tcm_user_tally_card_entries';
  END IF;
  
  -- Test tally cards config
  v_tally_config := public.fn_scd2_get_config('public.tcm_tally_cards'::regclass);
  
  IF v_tally_config IS NULL THEN
    RAISE WARNING 'Config lookup FAILED for public.tcm_tally_cards';
  ELSE
    RAISE NOTICE '✓ Config lookup SUCCESS for public.tcm_tally_cards';
  END IF;
END $$;

-- ============================================================================
-- Step 5: Show Current Config Table State
-- ============================================================================

SELECT 
  table_name,
  anchor_col,
  temporal_col,
  user_scoped,
  jsonb_array_length(hashdiff_columns) AS hash_column_count,
  array_length(unique_key, 1) AS unique_key_length,
  created_at,
  updated_at
FROM public.scd2_resource_config
ORDER BY table_name;



