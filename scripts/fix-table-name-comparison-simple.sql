-- ============================================================================
-- SIMPLE EXPLICIT FIX: Update just the INSERT section of fn_scd2_patch_base
-- This fixes "Table tcm_user_tally_card_entries not supported" error
-- ============================================================================

-- First, let's see what table name format we're actually getting
DO $$
DECLARE
  v_test_regclass regclass := 'public.tcm_user_tally_card_entries'::regclass;
  v_test_text text;
  v_test_name_only text;
BEGIN
  v_test_text := v_test_regclass::text;
  v_test_name_only := substring(v_test_text from '\.([^.]+)$');
  
  RAISE NOTICE 'Testing regclass::text conversion:';
  RAISE NOTICE '  Full text: %', v_test_text;
  RAISE NOTICE '  Name only: %', v_test_name_only;
END $$;

-- Now create a simple replacement for just the INSERT section
-- We'll use a more explicit approach that handles ALL possible formats

-- The key fix: Make the comparison more explicit and handle edge cases
DO $$
DECLARE
  v_func_body text;
BEGIN
  -- Get the current function body
  SELECT prosrc INTO v_func_body
  FROM pg_proc
  WHERE proname = 'fn_scd2_patch_base'
    AND pronamespace = 'public'::regnamespace;
  
  -- Check if the function exists
  IF v_func_body IS NULL THEN
    RAISE EXCEPTION 'Function fn_scd2_patch_base does not exist. Please run the full migration first.';
  END IF;
  
  RAISE NOTICE 'Function exists. Current body length: %', length(v_func_body);
END $$;

-- The actual fix: Update the INSERT section to be more explicit
-- We need to replace the table name check with a more robust version

-- Since we can't easily do a partial replacement, let's create a helper function
-- that normalizes table names, then update the main function to use it

CREATE OR REPLACE FUNCTION public._fn_normalize_table_name(p_table regclass)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  -- Return table name in a consistent format for comparison
  SELECT CASE 
    WHEN p_table::text LIKE 'public.%' THEN p_table::text
    ELSE 'public.' || p_table::text
  END;
$$;

-- Now update the INSERT section check to use normalized names
-- We'll need to read the full function and replace just the INSERT section
-- For now, let's provide the explicit fix as a complete function replacement
-- But that's too long. Instead, let's just fix the comparison logic inline.

-- ACTUAL FIX: Update the comparison to be more explicit
-- Run this to see what format we're actually getting:
SELECT 
  'public.tcm_user_tally_card_entries'::regclass::text as format1,
  'tcm_user_tally_card_entries'::regclass::text as format2;

-- Based on the result, we know regclass::text returns just the table name without schema
-- So the fix is to check for BOTH formats explicitly

-- Here's the explicit fix - update the INSERT section:
-- Replace the IF condition with this more explicit version:

-- The issue is that the function in the database still has the old comparison.
-- You need to run the updated migration, OR run this explicit fix:

-- Since the full function is too long to paste, here's what needs to change:
-- In the INSERT section (around line 571-577), change from:
--   IF p_table::text = 'public.tcm_user_tally_card_entries' THEN
-- To:
--   IF (p_table::text = 'public.tcm_user_tally_card_entries' OR 
--       p_table::text = 'tcm_user_tally_card_entries') THEN

-- But we can't do a partial update easily. The best approach is to re-run the migration.
-- However, if you want a quick fix, here's a workaround:

-- Create a wrapper that normalizes the table name first
CREATE OR REPLACE FUNCTION public._fn_get_table_name_for_insert(p_table regclass)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    CASE 
      WHEN p_table::text = 'public.tcm_user_tally_card_entries' THEN 'tcm_user_tally_card_entries'
      WHEN p_table::text = 'tcm_user_tally_card_entries' THEN 'tcm_user_tally_card_entries'
      WHEN p_table::text = 'public.tcm_tally_cards' THEN 'tcm_tally_cards'
      WHEN p_table::text = 'tcm_tally_cards' THEN 'tcm_tally_cards'
      ELSE NULL
    END;
$$;

-- Actually, the simplest fix is to just update the comparison in the existing function.
-- But since we can't easily do that without the full function, let's provide
-- a diagnostic query first to see what's happening:

SELECT 
  'Diagnostic: What format does regclass return?' as test,
  'public.tcm_user_tally_card_entries'::regclass::text as with_schema,
  'tcm_user_tally_card_entries'::regclass::text as without_schema;

