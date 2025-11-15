-- ============================================================================
-- Debug: Why RPC function fails but direct SELECT works
-- ============================================================================

-- Step 1: Check function owner and if it's a superuser
SELECT
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS function_owner,
  r.rolsuper AS is_superuser,
  r.rolname AS role_name
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'fn_tally_card_patch_scd2'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 2: Check current user context
SELECT 
  current_user AS current_user,
  session_user AS session_user,
  auth.uid() AS auth_uid;

-- Step 3: Test direct SELECT (this works - step 5)
-- Replace <TALLY_CARD_ID> with actual ID
/*
SELECT id, card_uid, tally_card_number
FROM public.tcm_tally_cards
WHERE id = '<TALLY_CARD_ID>'::uuid;
*/

-- Step 4: Test if function can see the table when called
-- This will show what user context the function runs in
SET client_min_messages TO NOTICE;

-- Replace <TALLY_CARD_ID> with actual ID
/*
SELECT * FROM public.fn_tally_card_patch_scd2(
  p_id := '<TALLY_CARD_ID>'::uuid,
  p_tally_card_number := NULL,
  p_warehouse_id := NULL,
  p_item_number := NULL,
  p_note := NULL,
  p_is_active := NULL
);
*/

-- Step 5: Check RLS policies are actually applied
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tcm_tally_cards'
ORDER BY cmd, policyname;

-- Step 6: Check if RLS is actually enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'tcm_tally_cards';

-- Step 7: Test if we can bypass RLS by setting role
-- This simulates what SECURITY DEFINER should do
/*
SET ROLE postgres;
SELECT id, card_uid FROM public.tcm_tally_cards WHERE id = '<TALLY_CARD_ID>'::uuid;
RESET ROLE;
*/















