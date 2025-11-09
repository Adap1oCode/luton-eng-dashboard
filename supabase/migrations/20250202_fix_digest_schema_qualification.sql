-- ============================================================================
-- Fix: digest() Schema Qualification
-- Purpose: Fix "function digest(text, unknown) does not exist" error
-- Root Cause: In Supabase, digest() is in 'extensions' schema, not 'public'
-- Solution: Use extensions.digest() instead of unqualified digest()
-- ============================================================================

-- ============================================================================
-- Step 1: Ensure extensions schema is accessible
-- ============================================================================
GRANT USAGE ON SCHEMA extensions TO public;

-- ============================================================================
-- Step 2: Fix fn_scd2_hash to use extensions.digest()
-- ============================================================================
-- This is the ONLY function that calculates hashdiff, so fixing this fixes everything
-- The trigger shim and wrapper both call this function, so they'll inherit the fix

CREATE OR REPLACE FUNCTION public.fn_scd2_hash(
  p_record jsonb,
  p_config jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public
AS $function$
DECLARE
  v_hashdiff_columns jsonb;
  v_payload text := '';
  v_col_config jsonb;
  v_col_name text;
  v_col_type text;
  v_col_normalize text;
  v_col_default text;
  v_col_value text;
  v_i integer;
BEGIN
  v_hashdiff_columns := p_config->'hashdiff_columns';
  
  IF v_hashdiff_columns IS NULL OR jsonb_array_length(v_hashdiff_columns) = 0 THEN
    RAISE EXCEPTION 'hashdiff_columns must be provided in config';
  END IF;
  
  -- Build payload by iterating through configured columns
  FOR v_i IN 0..jsonb_array_length(v_hashdiff_columns) - 1
  LOOP
    v_col_config := v_hashdiff_columns->v_i;
    v_col_name := v_col_config->>'name';
    v_col_type := COALESCE(v_col_config->>'type', 'text');
    v_col_normalize := COALESCE(v_col_config->>'normalize', 'none');
    v_col_default := v_col_config->>'default';
    
    -- Get value from record (preserve JSONB type)
    v_col_value := p_record->>v_col_name;
    
    -- Apply default if NULL and default specified
    IF v_col_value IS NULL AND v_col_default IS NOT NULL THEN
      v_col_value := v_col_default;
    END IF;
    
    -- Normalize based on rule
    IF v_col_normalize = 'lower_trim' THEN
      v_col_value := lower(btrim(COALESCE(v_col_value, '')));
    ELSIF v_col_normalize = 'none' THEN
      v_col_value := COALESCE(v_col_value, '');
    END IF;
    
    -- Convert to text representation based on type
    IF v_col_type = 'uuid' THEN
      v_col_value := COALESCE(v_col_value, '∅');
    ELSIF v_col_type = 'boolean' THEN
      v_col_value := COALESCE(v_col_value, 'false');
    ELSIF v_col_type IN ('integer', 'bigint', 'smallint') THEN
      v_col_value := COALESCE(v_col_value, '∅');
    ELSE
      -- text or other
      v_col_value := COALESCE(v_col_value, '∅');
    END IF;
    
    -- Append to payload
    IF v_payload != '' THEN
      v_payload := v_payload || ' | ';
    END IF;
    v_payload := v_payload || v_col_value;
  END LOOP;
  
  -- FIX: Use extensions.digest() instead of unqualified digest()
  -- In Supabase, digest() is in the 'extensions' schema, not 'public' or 'pg_catalog'
  -- This matches the pattern used in all other migrations (20250131_final_stock_adjustments_update.sql, etc.)
  RETURN encode(extensions.digest(v_payload, 'sha256'), 'hex');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_scd2_hash(jsonb, jsonb) TO authenticated;

-- ============================================================================
-- Step 3: Verify the fix works
-- ============================================================================

DO $$
DECLARE
  v_test_config jsonb;
  v_test_record jsonb;
  v_hash text;
BEGIN
  -- Get a real config to test with
  SELECT row_to_json(c.*)::jsonb INTO v_test_config
  FROM public.scd2_resource_config c
  WHERE c.table_name = 'public.tcm_user_tally_card_entries'
  LIMIT 1;
  
  IF v_test_config IS NULL THEN
    RAISE WARNING 'No config found for testing - skipping verification';
    RETURN;
  END IF;
  
  -- Create a test record
  v_test_record := '{"tally_card_number":"TEST","qty":1,"location":"A1"}'::jsonb;
  
  -- Test the hash function
  BEGIN
    v_hash := public.fn_scd2_hash(v_test_record, v_test_config);
    RAISE NOTICE '✓ Hash function works! Generated hash: %', substring(v_hash, 1, 16) || '...';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Hash function test FAILED: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- This fix changes digest() to extensions.digest() in fn_scd2_hash().
-- Since the trigger shim and wrapper both call fn_scd2_hash(), they will
-- automatically use the fixed version. No other changes needed.


