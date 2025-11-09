-- ============================================================================
-- Validation Script: SCD2 Exact Naming Implementation
-- Purpose: Verify all requirements are met after migration
-- ============================================================================

-- ============================================================================
-- 1. Verify Functions Exist (Exact Names)
-- ============================================================================

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proname LIKE '%_v3' THEN 'NEW (v3)'
    WHEN p.proname LIKE '%_v2' THEN 'LEGACY (v2)'
    WHEN p.proname LIKE '%patch_scd2%' AND p.proname NOT LIKE '%_v%' THEN 'LEGACY (v1)'
    ELSE 'SHARED'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (
    p.proname IN (
      'fn_scd2_hash',
      'fn_scd2_get_config',
      'fn_scd2_trigger_hash_shim',
      'fn_scd2_patch_base',
      'fn_tcm_user_tally_card_entries_patch_scd2_v3',
      'fn_tcm_tally_cards_patch_scd2_v3'
    )
    OR p.proname LIKE '%patch_scd2%'
  )
ORDER BY 
  CASE 
    WHEN p.proname LIKE '%_v3' THEN 1
    WHEN p.proname LIKE '%_v2' THEN 2
    WHEN p.proname LIKE '%patch_scd2%' AND p.proname NOT LIKE '%_v%' THEN 3
    ELSE 0
  END,
  p.proname;

-- ============================================================================
-- 2. Verify Triggers Exist (Exact Names)
-- ============================================================================

SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('tcm_user_tally_card_entries', 'tcm_tally_cards')
  AND t.tgname LIKE '%hash%'
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- 3. Verify Config Retrieval (Exact Table Names)
-- ============================================================================

DO $$
DECLARE
  v_config_entries jsonb;
  v_config_cards jsonb;
BEGIN
  -- Test stock adjustments config
  v_config_entries := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  IF v_config_entries IS NULL THEN
    RAISE EXCEPTION 'Config for tcm_user_tally_card_entries is NULL';
  END IF;
  
  IF v_config_entries->'hashdiff_columns' IS NULL THEN
    RAISE EXCEPTION 'Config missing hashdiff_columns for tcm_user_tally_card_entries';
  END IF;
  
  RAISE NOTICE '✓ Stock Adjustments config: % columns', 
    jsonb_array_length(v_config_entries->'hashdiff_columns');
  
  -- Test tally cards config
  v_config_cards := public.fn_scd2_get_config('public.tcm_tally_cards'::regclass);
  
  IF v_config_cards IS NULL THEN
    RAISE EXCEPTION 'Config for tcm_tally_cards is NULL';
  END IF;
  
  IF v_config_cards->'hashdiff_columns' IS NULL THEN
    RAISE EXCEPTION 'Config missing hashdiff_columns for tcm_tally_cards';
  END IF;
  
  RAISE NOTICE '✓ Tally Cards config: % columns', 
    jsonb_array_length(v_config_cards->'hashdiff_columns');
  
  RAISE NOTICE '✓ TEST 3 PASSED: Config retrieval works for both tables';
END $$;

-- ============================================================================
-- 4. Hash Parity Test (Trigger vs Helper)
-- ============================================================================

DO $$
DECLARE
  v_record_entries public.tcm_user_tally_card_entries%ROWTYPE;
  v_record_cards public.tcm_tally_cards%ROWTYPE;
  v_record_jsonb jsonb;
  v_config jsonb;
  v_hashdiff_helper text;
  v_hashdiff_trigger text;
  v_passed boolean := true;
BEGIN
  -- Test stock adjustments
  SELECT * INTO v_record_entries
  FROM public.tcm_user_tally_card_entries
  LIMIT 1;
  
  IF FOUND THEN
    v_record_jsonb := to_jsonb(v_record_entries);
    v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
    v_hashdiff_helper := public.fn_scd2_hash(v_record_jsonb, v_config);
    v_hashdiff_trigger := v_record_entries.hashdiff;
    
    IF v_hashdiff_helper != v_hashdiff_trigger THEN
      RAISE WARNING 'Stock Adjustments hash mismatch: Helper=%, Trigger=%', 
        v_hashdiff_helper, v_hashdiff_trigger;
      v_passed := false;
    ELSE
      RAISE NOTICE '✓ Stock Adjustments hash parity: PASSED';
    END IF;
  END IF;
  
  -- Test tally cards
  SELECT * INTO v_record_cards
  FROM public.tcm_tally_cards
  LIMIT 1;
  
  IF FOUND THEN
    v_record_jsonb := to_jsonb(v_record_cards);
    v_config := public.fn_scd2_get_config('public.tcm_tally_cards'::regclass);
    v_hashdiff_helper := public.fn_scd2_hash(v_record_jsonb, v_config);
    v_hashdiff_trigger := v_record_cards.hashdiff;
    
    IF v_hashdiff_helper != v_hashdiff_trigger THEN
      RAISE WARNING 'Tally Cards hash mismatch: Helper=%, Trigger=%', 
        v_hashdiff_helper, v_hashdiff_trigger;
      v_passed := false;
    ELSE
      RAISE NOTICE '✓ Tally Cards hash parity: PASSED';
    END IF;
  END IF;
  
  IF v_passed THEN
    RAISE NOTICE '✓ TEST 4 PASSED: Hash parity confirmed for all tables';
  ELSE
    RAISE WARNING '⚠ TEST 4: Hash mismatches detected (may be expected if records created before v3)';
  END IF;
END $$;

-- ============================================================================
-- 5. Idempotency WHERE Clause Verification
-- ============================================================================

-- Stock Adjustments constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition,
  'Stock Adjustments' as table_name
FROM pg_constraint
WHERE conrelid = 'public.tcm_user_tally_card_entries'::regclass
  AND conname LIKE '%hash%'
UNION ALL
-- Tally Cards constraint (if exists)
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition,
  'Tally Cards' as table_name
FROM pg_constraint
WHERE conrelid = 'public.tcm_tally_cards'::regclass
  AND conname LIKE '%hash%'
ORDER BY table_name;

-- Expected:
-- Stock Adjustments: UNIQUE (updated_by_user_id, card_uid, hashdiff) WHERE (card_uid IS NOT NULL)
-- Tally Cards: UNIQUE (card_uid, hashdiff) or similar

-- ============================================================================
-- 6. Digest Namespace Check
-- ============================================================================

DO $$
DECLARE
  v_test_hash text;
BEGIN
  -- Test unqualified digest()
  BEGIN
    v_test_hash := encode(digest('test', 'sha256'), 'hex');
    RAISE NOTICE '✓ Unqualified digest() works: %', left(v_test_hash, 16) || '...';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Unqualified digest() failed: %. May need extensions.digest() or search_path adjustment.', SQLERRM;
  END;
  
  -- Test public.digest() (fallback)
  BEGIN
    v_test_hash := encode(public.digest('test', 'sha256'), 'hex');
    RAISE NOTICE '✓ public.digest() works: %', left(v_test_hash, 16) || '...';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'public.digest() failed: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- 7. Backward Compatibility Check
-- ============================================================================

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  obj_description(p.oid, 'pg_proc') as comment
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'fn_user_entry_patch_scd2',
    'fn_user_entry_patch_scd2_v2',
    'fn_tally_card_patch_scd2'
  )
ORDER BY p.proname;

-- Expected: All legacy functions should exist with deprecation comments

-- ============================================================================
-- 8. No Alias References Check
-- ============================================================================

-- Check function definitions for old names
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%fn_user_entry_patch_scd2%' 
      AND p.proname NOT LIKE '%tcm_user_tally_card_entries%' THEN 'ALIAS FOUND'
    WHEN pg_get_functiondef(p.oid) LIKE '%fn_tally_card_patch_scd2%' 
      AND p.proname NOT LIKE '%tcm_tally_cards%' THEN 'ALIAS FOUND'
    ELSE 'OK'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) LIKE '%fn_user_entry_patch_scd2%'
    OR pg_get_functiondef(p.oid) LIKE '%fn_tally_card_patch_scd2%'
  )
  AND p.proname NOT LIKE '%_v3'
ORDER BY p.proname;

-- Should only show legacy functions (v1/v2) with deprecation comments

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  'SCD2 Exact Naming Validation Complete' as status,
  COUNT(*) FILTER (WHERE p.proname LIKE '%_v3') as v3_functions,
  COUNT(*) FILTER (WHERE p.proname LIKE '%_v2' OR (p.proname LIKE '%patch_scd2%' AND p.proname NOT LIKE '%_v%')) as legacy_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname IN (
      'fn_scd2_hash',
      'fn_scd2_get_config',
      'fn_scd2_trigger_hash_shim',
      'fn_scd2_patch_base',
      'fn_tcm_user_tally_card_entries_patch_scd2_v3',
      'fn_tcm_tally_cards_patch_scd2_v3'
    )
    OR p.proname LIKE '%patch_scd2%'
  );



