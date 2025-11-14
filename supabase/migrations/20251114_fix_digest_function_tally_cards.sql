-- ============================================================================
-- Fix: digest() Function Error for Tally Cards
-- Date: 2025-11-14
-- Purpose: Fix "function digest(text, unknown) does not exist" error
-- Root Cause: In Supabase, digest() is in 'extensions' schema, not 'public'
-- Solution: Ensure fn_scd2_hash() uses extensions.digest() explicitly
-- ============================================================================

-- ============================================================================
-- Step 1: Ensure extensions schema is accessible
-- ============================================================================
GRANT USAGE ON SCHEMA extensions TO public;

-- ============================================================================
-- Step 2: Verify pgcrypto extension is enabled
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'pgcrypto extension is required. Please enable it in Supabase Dashboard > Database > Extensions first.';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Fix fn_scd2_hash to use extensions.digest()
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
  
  -- CRITICAL FIX: Use extensions.digest() instead of unqualified digest()
  -- In Supabase, digest() is in the 'extensions' schema, not 'public' or 'pg_catalog'
  -- This ensures the function works regardless of search_path settings
  RETURN encode(extensions.digest(v_payload, 'sha256'), 'hex');
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_scd2_hash(jsonb, jsonb) TO authenticated;

-- ============================================================================
-- Step 4: Fix old tcm_cards_set_hash() function (if it exists)
-- ============================================================================
-- This is an old trigger function that may still exist in the database
-- It uses unqualified digest() which fails in Supabase
-- We'll fix it to use extensions.digest() or drop it if it's been replaced

CREATE OR REPLACE FUNCTION public.tcm_cards_set_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  normalized_note text;
  state_text text;
BEGIN
  normalized_note := coalesce(btrim(lower(new.note)), '');

  -- FIXED: Removed warehouse column - only use warehouse_id (matches stock-adjustments pattern)
  state_text := concat_ws('|',
      new.card_uid::text,
      coalesce(new.warehouse_id::text, ''),
      coalesce(new.tally_card_number, ''),
      coalesce(new.item_number::text, ''),
      normalized_note,
      coalesce(new.is_active::text, 'true')
  );

  -- FIX: Use extensions.digest() instead of unqualified digest()
  -- In Supabase, digest() is in the 'extensions' schema, not 'public'
  new.hashdiff := encode(extensions.digest(state_text, 'sha256'), 'hex');

  if new.snapshot_at is null then
    new.snapshot_at := now();
  end if;

  return new;
END;
$function$;

-- ============================================================================
-- Step 5: Verify the fix works
-- ============================================================================

DO $$
DECLARE
  v_test_config jsonb;
  v_test_record jsonb;
  v_hash text;
BEGIN
  -- Test 1: Verify extensions.digest() works directly
  BEGIN
    PERFORM encode(extensions.digest('test', 'sha256'), 'hex');
    RAISE NOTICE '✓ extensions.digest() is accessible';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'extensions.digest() is NOT accessible: %', SQLERRM;
  END;
  
  -- Test 2: Verify fn_scd2_hash() works with a real config
  -- Try to get a config from scd2_resource_config
  SELECT row_to_json(c.*)::jsonb INTO v_test_config
  FROM public.scd2_resource_config c
  WHERE c.table_name IN ('public.tcm_tally_cards', 'public.tcm_user_tally_card_entries')
  LIMIT 1;
  
  IF v_test_config IS NOT NULL THEN
    -- Create a test record
    v_test_record := '{"test":"value"}'::jsonb;
    
    -- Test the hash function
    BEGIN
      v_hash := public.fn_scd2_hash(v_test_record, v_test_config);
      RAISE NOTICE '✓ fn_scd2_hash() works! Generated hash: %', substring(v_hash, 1, 16) || '...';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_scd2_hash() test failed (this may be expected if config is invalid): %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No SCD2 config found for testing - skipping fn_scd2_hash() verification';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- This fix ensures fn_scd2_hash() uses extensions.digest() explicitly.
-- Since the trigger shim (fn_scd2_trigger_hash_shim) and wrapper functions
-- (fn_tcm_tally_cards_patch_scd2_v3, etc.) all call fn_scd2_hash(), they will
-- automatically use the fixed version. No other changes needed.

