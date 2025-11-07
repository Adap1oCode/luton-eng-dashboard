-- ============================================================================
-- SCD2 Validation Script for Stock Adjustments
-- Purpose: Validate RPC function, check for duplicates, verify triggers
-- Run this in Supabase SQL Editor before implementing fixes
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify Constraint Definition
-- ============================================================================
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'uq_entries_uid_hash';

-- Expected: (updated_by_user_id, card_uid, hashdiff) WHERE (card_uid IS NOT NULL)

-- ============================================================================
-- STEP 2: Get All Trigger Function Definitions
-- ============================================================================

-- 2.1: Get tcm_entries_skip_noop function (BEFORE UPDATE trigger)
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'tcm_entries_skip_noop';

-- 2.2: Get fn_user_entry_set_hashdiff function (BEFORE INSERT/UPDATE trigger)
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_set_hashdiff';

-- 2.3: Get set_entry_user_id function (BEFORE INSERT trigger)
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'set_entry_user_id';

-- 2.4: Get fn_user_entry_patch_scd2 function (RPC function)
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_patch_scd2';

-- ============================================================================
-- STEP 3: Check for Existing Duplicate Hashdiffs
-- ============================================================================
-- This query finds any existing duplicate (updated_by_user_id, card_uid, hashdiff) combinations
-- There should be NONE - if any exist, they indicate a bug

SELECT 
  updated_by_user_id,
  card_uid,
  hashdiff,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY updated_at DESC) as entry_ids,
  array_agg(updated_at ORDER BY updated_at DESC) as updated_times
FROM tcm_user_tally_card_entries
WHERE card_uid IS NOT NULL
  AND hashdiff IS NOT NULL
GROUP BY updated_by_user_id, card_uid, hashdiff
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, updated_by_user_id, card_uid;

-- Expected: 0 rows (no duplicates)

-- ============================================================================
-- STEP 4: Test Hashdiff Calculation Consistency
-- ============================================================================
-- Verify that hashdiff calculation is consistent
-- This tests the hashdiff function logic manually

DO $$
DECLARE
  v_test_payload text;
  v_test_hashdiff text;
  v_sample_row record;
BEGIN
  -- Get a sample row
  SELECT * INTO v_sample_row
  FROM tcm_user_tally_card_entries
  WHERE hashdiff IS NOT NULL
  LIMIT 1;
  
  IF v_sample_row IS NULL THEN
    RAISE NOTICE 'No sample row found with hashdiff';
    RETURN;
  END IF;
  
  -- Calculate hashdiff using same logic as trigger
  v_test_payload := concat_ws(' | ',
    coalesce(v_sample_row.updated_by_user_id::text, '∅'),
    coalesce(lower(btrim(v_sample_row.tally_card_number)), '∅'),
    coalesce(v_sample_row.card_uid::text, '∅'),
    coalesce(v_sample_row.qty::text, '∅'),
    coalesce(lower(btrim(v_sample_row.location)), '∅'),
    coalesce(lower(btrim(v_sample_row.note)), '∅'),
    coalesce(lower(btrim(v_sample_row.role_family)), '∅'),
    coalesce(lower(btrim(v_sample_row.reason_code)), 'unspecified'),
    coalesce(v_sample_row.multi_location::text, 'false')
  );
  
  v_test_hashdiff := encode(extensions.digest(v_test_payload, 'sha256'), 'hex');
  
  -- Compare with stored hashdiff
  IF v_test_hashdiff = v_sample_row.hashdiff THEN
    RAISE NOTICE 'Hashdiff calculation is consistent for entry %', v_sample_row.id;
  ELSE
    RAISE WARNING 'Hashdiff mismatch for entry %: calculated=%, stored=%', 
      v_sample_row.id, v_test_hashdiff, v_sample_row.hashdiff;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Get Test Entry ID and User ID
-- ============================================================================
-- IMPORTANT: The RPC function requires authenticated user context (auth.uid())
-- In SQL Editor, auth.uid() returns NULL, so we need to test via API or use a helper

-- First, get a test entry ID and the user who created it:
SELECT 
  id as entry_id,
  tally_card_number,
  card_uid,
  updated_by_user_id as test_user_id,
  reason_code,
  multi_location,
  qty,
  location,
  note,
  updated_at
FROM tcm_user_tally_card_entries
WHERE tally_card_number = 'RTZ-01'
ORDER BY updated_at DESC
LIMIT 1;

-- Also get your current user ID (if you're logged in via Supabase Dashboard):
-- Note: This will only work if you're authenticated in the SQL Editor
-- If NULL, you'll need to test via the application API instead
SELECT 
  id as current_user_id,
  auth_id,
  full_name
FROM public.users
WHERE auth_id = auth.uid()
LIMIT 1;

-- ============================================================================
-- STEP 5A: Test RPC Function (Requires Authenticated Context)
-- ============================================================================
-- IMPORTANT: The RPC function uses auth.uid() which is NULL in SQL Editor
-- You have two options:
--
-- OPTION 1: Test via Application API (Recommended)
--   - Use the application's API endpoint: POST /api/stock-adjustments/[id]/actions/patch-scd2
--   - This will have proper authentication context
--   - Use the entry_id from the query above
--
-- OPTION 2: Create a test helper function (see STEP 5B below)
--   - This allows testing in SQL Editor by accepting user_id as parameter
--   - Only for testing purposes, not for production use

-- ============================================================================
-- STEP 5B: Create Test Helper Function (Optional - for SQL Editor testing)
-- ============================================================================
-- This helper function allows testing in SQL Editor by accepting user_id directly
-- WARNING: This is for testing only - do not use in production

CREATE OR REPLACE FUNCTION public.fn_user_entry_patch_scd2_test(
  p_id uuid,
  p_user_id uuid,  -- Explicit user ID for testing
  p_reason_code text DEFAULT NULL,
  p_multi_location boolean DEFAULT NULL,
  p_qty integer DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_locations jsonb DEFAULT NULL
)
RETURNS public.tcm_user_tally_card_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- This is a copy of fn_user_entry_patch_scd2 but uses p_user_id instead of auth.uid()
-- See the main migration file for the full implementation
-- For testing purposes only
$function$;

-- Note: The test helper function implementation would be identical to fn_user_entry_patch_scd2
-- but replace "auth.uid()" with "p_user_id". However, for now, we recommend testing via API.

-- ============================================================================
-- STEP 6: Check Child Locations Table Integrity
-- ============================================================================
-- Verify that child locations are properly linked to parent entries

SELECT 
  l.entry_id,
  COUNT(*) as location_count,
  e.tally_card_number,
  e.multi_location,
  e.updated_at
FROM tcm_user_tally_card_entry_locations l
LEFT JOIN tcm_user_tally_card_entries e ON l.entry_id = e.id
GROUP BY l.entry_id, e.tally_card_number, e.multi_location, e.updated_at
ORDER BY e.updated_at DESC
LIMIT 20;

-- Check for orphaned child locations (entries that don't exist)
SELECT 
  l.entry_id,
  COUNT(*) as orphaned_count
FROM tcm_user_tally_card_entry_locations l
LEFT JOIN tcm_user_tally_card_entries e ON l.entry_id = e.id
WHERE e.id IS NULL
GROUP BY l.entry_id;

-- Expected: 0 rows (no orphaned locations)

-- ============================================================================
-- STEP 7: Verify Trigger Execution Order
-- ============================================================================
-- Check trigger definitions and their execution order

SELECT
  t.tgname as trigger_name,
  CASE t.tgtype & 2
    WHEN 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE t.tgtype & 4
    WHEN 4 THEN 'ROW'
    ELSE 'STATEMENT'
  END as level,
  CASE t.tgtype & 8
    WHEN 8 THEN 'INSERT'
    ELSE ''
  END ||
  CASE t.tgtype & 16
    WHEN 16 THEN ' UPDATE'
    ELSE ''
  END ||
  CASE t.tgtype & 32
    WHEN 32 THEN ' DELETE'
    ELSE ''
  END as events,
  p.proname as function_name,
  t.tgpriority as priority
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'tcm_user_tally_card_entries'
  AND NOT t.tgisinternal
ORDER BY t.tgpriority, t.tgname;

-- ============================================================================
-- STEP 8: Test No-Op Update (should be prevented by trigger)
-- ============================================================================
-- This test verifies that tcm_entries_skip_noop prevents no-op updates
-- IMPORTANT: Replace <ENTRY_ID> with an actual entry ID

-- First, get current values:
-- SELECT id, qty, location, note, reason_code, multi_location, hashdiff
-- FROM tcm_user_tally_card_entries
-- WHERE id = '<ENTRY_ID>'::uuid;

-- Then try a no-op update (should be prevented):
-- UPDATE tcm_user_tally_card_entries
-- SET updated_at = now()
-- WHERE id = '<ENTRY_ID>'::uuid;

-- Check if row was actually updated (should not be):
-- SELECT id, qty, location, note, reason_code, multi_location, hashdiff, updated_at
-- FROM tcm_user_tally_card_entries
-- WHERE id = '<ENTRY_ID>'::uuid;

-- ============================================================================
-- STEP 9: Summary Report
-- ============================================================================
-- Generate a summary of findings

SELECT 
  'Constraint Definition' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'uq_entries_uid_hash'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as status
UNION ALL
SELECT 
  'Duplicate Hashdiffs' as check_type,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1
      FROM tcm_user_tally_card_entries
      WHERE card_uid IS NOT NULL AND hashdiff IS NOT NULL
      GROUP BY updated_by_user_id, card_uid, hashdiff
      HAVING COUNT(*) > 1
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as status
UNION ALL
SELECT 
  'Orphaned Child Locations' as check_type,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1
      FROM tcm_user_tally_card_entry_locations l
      LEFT JOIN tcm_user_tally_card_entries e ON l.entry_id = e.id
      WHERE e.id IS NULL
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as status
UNION ALL
SELECT 
  'RPC Function Exists' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'fn_user_entry_patch_scd2'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as status
UNION ALL
SELECT 
  'Hashdiff Function Exists' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'fn_user_entry_set_hashdiff'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as status
UNION ALL
SELECT 
  'Skip Noop Function Exists' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'tcm_entries_skip_noop'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as status;

