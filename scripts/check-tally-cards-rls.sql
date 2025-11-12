-- ============================================================================
-- Check RLS Status and Policies for tcm_tally_cards
-- ============================================================================

-- Step 1: Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'tcm_tally_cards';

-- Step 2: Get all RLS policies
SELECT
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tcm_tally_cards'
ORDER BY cmd, policyname;

-- Step 3: Check function owner
SELECT
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS function_owner,
  n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_tally_card_patch_scd2';

-- Step 4: Check if function owner is superuser
SELECT
  pg_get_userbyid(p.proowner) AS function_owner,
  r.rolsuper AS is_superuser
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'fn_tally_card_patch_scd2'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 5: Test direct SELECT (should work if RLS allows)
-- Replace <TALLY_CARD_ID> with an actual ID
/*
SELECT id, card_uid, tally_card_number
FROM public.tcm_tally_cards
WHERE id = '<TALLY_CARD_ID>'::uuid;
*/






