-- ============================================================================
-- FULL DIAGNOSTIC: Why is updated_at still using old timestamp?
-- ============================================================================

-- Step 1: Check ALL triggers on tcm_user_tally_card_entries
SELECT 
  'TRIGGERS' as diagnostic_step,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement,
  action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'tcm_user_tally_card_entries'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- Step 2: Get the full trigger function definitions
SELECT 
  'TRIGGER FUNCTIONS' as diagnostic_step,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'tcm_user_tally_card_entries'
  AND c.relnamespace = 'public'::regnamespace;

-- Step 3: Check what fn_scd2_patch_base is actually doing
-- Look at the INSERT statement in the function
SELECT 
  'FUNCTION INSERT LOGIC' as diagnostic_step,
  proname,
  CASE 
    WHEN prosrc LIKE '%now()%' THEN '✓ Uses now()'
    WHEN prosrc LIKE '%updated_at%' THEN '⚠ References updated_at'
    ELSE '✗ No now() found'
  END as uses_now,
  CASE 
    WHEN prosrc LIKE '%COALESCE.*updated_at.*now%' THEN '⚠ COALESCE with updated_at'
    WHEN prosrc LIKE '%v_updated_jsonb->>''updated_at''%' THEN '⚠ Uses updated_at from JSONB'
    ELSE '✓ No updated_at from payload'
  END as payload_check
FROM pg_proc
WHERE proname = 'fn_scd2_patch_base'
  AND pronamespace = 'public'::regnamespace;

-- Step 4: Check the actual INSERT statement in fn_scd2_patch_base
-- Extract just the INSERT section
SELECT 
  'INSERT STATEMENT' as diagnostic_step,
  substring(
    prosrc 
    from 'INSERT INTO public\.tcm_user_tally_card_entries[^;]+updated_at[^;]+;'
  ) as insert_statement
FROM pg_proc
WHERE proname = 'fn_scd2_patch_base'
  AND pronamespace = 'public'::regnamespace;

-- Step 5: Check if there's a BEFORE INSERT trigger that sets updated_at
SELECT 
  'BEFORE INSERT TRIGGERS' as diagnostic_step,
  t.trigger_name,
  t.event_manipulation,
  t.action_timing,
  p.proname as function_name,
  CASE 
    WHEN p.prosrc LIKE '%updated_at%' AND p.prosrc LIKE '%now()%' THEN '⚠ Sets updated_at to now()'
    WHEN p.prosrc LIKE '%updated_at%' THEN '⚠ Modifies updated_at'
    ELSE '✓ No updated_at modification'
  END as trigger_behavior
FROM information_schema.triggers t
JOIN pg_trigger pt ON pt.tgname = t.trigger_name
JOIN pg_proc p ON p.oid = pt.tgfoid
WHERE t.event_object_table = 'tcm_user_tally_card_entries'
  AND t.event_object_schema = 'public'
  AND t.action_timing = 'BEFORE'
  AND t.event_manipulation = 'INSERT';

-- Step 6: Check the latest rows to see their updated_at values
SELECT 
  'LATEST ROWS' as diagnostic_step,
  id,
  updated_at,
  location,
  qty,
  hashdiff,
  EXTRACT(EPOCH FROM (now() - updated_at)) / 3600 as hours_old
FROM public.tcm_user_tally_card_entries
WHERE tally_card_number = 'RTZ-01'
ORDER BY updated_at DESC, id DESC
LIMIT 5;

-- Step 7: Test what now() returns vs what's in the database
SELECT 
  'TIMESTAMP COMPARISON' as diagnostic_step,
  now() as current_time,
  MAX(updated_at) as latest_updated_at,
  now() - MAX(updated_at) as time_difference
FROM public.tcm_user_tally_card_entries
WHERE tally_card_number = 'RTZ-01';

-- Step 8: Check if there's a DEFAULT on the updated_at column
SELECT 
  'COLUMN DEFAULT' as diagnostic_step,
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tcm_user_tally_card_entries'
  AND column_name = 'updated_at';

-- Step 9: Check the actual function source code for the INSERT
SELECT 
  'FUNCTION SOURCE EXTRACT' as diagnostic_step,
  substring(
    prosrc 
    from 'updated_at[^,)]+'
  ) as updated_at_clause
FROM pg_proc
WHERE proname = 'fn_scd2_patch_base'
  AND pronamespace = 'public'::regnamespace
LIMIT 1;

