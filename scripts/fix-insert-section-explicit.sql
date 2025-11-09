-- ============================================================================
-- EXPLICIT FIX: Update the INSERT section comparison in fn_scd2_patch_base
-- This fixes "Table tcm_user_tally_card_entries not supported" error
-- ============================================================================

-- Step 1: Check what format regclass::text actually returns
SELECT 
  'Diagnostic' as step,
  'public.tcm_user_tally_card_entries'::regclass::text as regclass_with_schema,
  'tcm_user_tally_card_entries'::regclass::text as regclass_without_schema;

-- Step 2: The actual fix - we need to update the function
-- Since the function is complex, we'll use a text replacement approach
-- But first, let's verify the function exists and see its current state

DO $$
DECLARE
  v_func_oid oid;
  v_func_def text;
  v_old_pattern text;
  v_new_pattern text;
BEGIN
  -- Find the function
  SELECT oid INTO v_func_oid
  FROM pg_proc
  WHERE proname = 'fn_scd2_patch_base'
    AND pronamespace = 'public'::regnamespace;
  
  IF v_func_oid IS NULL THEN
    RAISE EXCEPTION 'Function fn_scd2_patch_base not found. Please run the full migration first.';
  END IF;
  
  -- Get function definition
  SELECT pg_get_functiondef(oid) INTO v_func_def
  FROM pg_proc
  WHERE oid = v_func_oid;
  
  -- Check if it has the old pattern
  IF v_func_def LIKE '%IF p_table::text = ''public.tcm_user_tally_card_entries'' THEN%' THEN
    RAISE NOTICE 'Found old pattern - function needs update';
  ELSIF v_func_def LIKE '%v_table_text = ''public.tcm_user_tally_card_entries''%' THEN
    RAISE NOTICE 'Found new pattern - function may already be updated';
  ELSE
    RAISE NOTICE 'Pattern not found - function structure may be different';
  END IF;
  
  RAISE NOTICE 'Function exists. Definition length: %', length(v_func_def);
END $$;

-- Step 3: The EXPLICIT fix - update the comparison to handle BOTH formats
-- We'll use ALTER FUNCTION to update just the problematic section
-- But PostgreSQL doesn't support partial function updates, so we need the full function

-- Since we can't do a partial update, here's what you need to do:
-- 1. The migration file has been updated with the fix
-- 2. You need to re-run the CREATE OR REPLACE FUNCTION statement

-- For now, here's a workaround: Create a simple test to see what's happening
SELECT 
  p_table::text as table_text_format,
  substring(p_table::text from '\.([^.]+)$') as table_name_only
FROM (SELECT 'public.tcm_user_tally_card_entries'::regclass as p_table) t;

-- The REAL fix: The function needs to check ALL these formats:
-- 1. 'public.tcm_user_tally_card_entries' (with schema)
-- 2. 'tcm_user_tally_card_entries' (without schema)  
-- 3. Extract name from 'public.tcm_user_tally_card_entries' -> 'tcm_user_tally_card_entries'

-- The updated comparison should be:
-- IF (v_table_text = 'public.tcm_user_tally_card_entries' OR 
--     v_table_text = 'tcm_user_tally_card_entries' OR
--     v_table_name_only = 'tcm_user_tally_card_entries') THEN

-- Since we can't easily update just that section, you have two options:
-- Option A: Re-run the full migration (recommended - it has all fixes)
-- Option B: Run this complete function replacement (see next file)

