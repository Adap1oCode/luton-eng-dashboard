-- ============================================================================
-- Test Script: fn_tally_card_patch_scd2 with Logging
-- ============================================================================
-- This script tests the RPC function with comprehensive logging enabled
-- Replace <TALLY_CARD_ID> with an actual tally card ID from your database

-- Step 1: Enable notice output so we can see RAISE NOTICE messages
SET client_min_messages TO NOTICE;

-- Step 2: Verify function exists and check its definition
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_tally_card_patch_scd2';

-- Step 3: Get a valid tally card ID to test with
-- Run this first to get a tally card ID:
SELECT 
  id,
  card_uid,
  tally_card_number,
  warehouse_id,
  item_number,
  note,
  is_active,
  snapshot_at,
  hashdiff
FROM public.tcm_tally_cards
ORDER BY snapshot_at DESC
LIMIT 5;

-- Step 4: Verify extensions.digest() is accessible
-- This should return a hash without errors
SELECT encode(extensions.digest('test payload', 'sha256'), 'hex') AS test_hash;

-- Step 5: Test hashdiff calculation logic (matches trigger function)
-- Replace <CARD_UID> with an actual card_uid from step 3
/*
SELECT 
  encode(extensions.digest(
    concat_ws(' | ',
      coalesce('b91022bf-1dab-4fec-935d-3cb70d6e3c7f'::uuid::text, '∅'),
      coalesce('00000000-0000-0000-0000-000000000000'::uuid::text, '∅'),
      coalesce(lower(btrim('TEST-123')), '∅'),
      coalesce(12345::text, '∅'),
      coalesce(lower(btrim('Test note')), '∅'),
      coalesce(true::text, 'true')
    ),
    'sha256'
  ), 'hex') AS calculated_hashdiff;
*/

-- ============================================================================
-- STEP 6: Test the RPC Function
-- ============================================================================
-- Replace <TALLY_CARD_ID> with an actual UUID from step 3
-- Example: '7b9730e8-c574-4a1a-9b9f-35dab671770f'

-- Test Case 1: No changes (should return existing row without creating new one)
/*
SELECT * FROM public.fn_tally_card_patch_scd2(
  p_id := 'b91022bf-1dab-4fec-935d-3cb70d6e3c7f'::uuid,
  p_tally_card_number := NULL,  -- No change
  p_warehouse_id := NULL,        -- No change
  p_item_number := NULL,         -- No change
  p_note := NULL,                -- No change
  p_is_active := NULL            -- No change
);
*/

-- Test Case 2: Update note only
/*
SELECT * FROM public.fn_tally_card_patch_scd2(
  p_id := '<TALLY_CARD_ID>'::uuid,
  p_tally_card_number := NULL,
  p_warehouse_id := NULL,
  p_item_number := NULL,
  p_note := 'Updated note from SQL test',
  p_is_active := NULL
);
*/

-- Test Case 3: Update multiple fields
/*
SELECT * FROM public.fn_tally_card_patch_scd2(
  p_id := '<TALLY_CARD_ID>'::uuid,
  p_tally_card_number := 'TEST-UPDATED',
  p_warehouse_id := NULL,  -- Keep existing
  p_item_number := 99999,
  p_note := 'Multiple field update test',
  p_is_active := true
);
*/

-- Test Case 4: Toggle is_active
/*
SELECT * FROM public.fn_tally_card_patch_scd2(
  p_id := '<TALLY_CARD_ID>'::uuid,
  p_tally_card_number := NULL,
  p_warehouse_id := NULL,
  p_item_number := NULL,
  p_note := NULL,
  p_is_active := false  -- Toggle to inactive
);
*/

-- ============================================================================
-- STEP 7: Verify SCD2 behavior
-- ============================================================================
-- After running a test case, check that:
-- 1. A new row was created (if changes were made)
-- 2. The new row has a different id but same card_uid
-- 3. The new row has a new snapshot_at timestamp
-- 4. The new row has a calculated hashdiff

-- Replace <CARD_UID> with the card_uid from step 3
/*
SELECT 
  id,
  card_uid,
  tally_card_number,
  warehouse_id,
  item_number,
  note,
  is_active,
  snapshot_at,
  hashdiff,
  ROW_NUMBER() OVER (ORDER BY snapshot_at DESC) AS version_number
FROM public.tcm_tally_cards
WHERE card_uid = '<CARD_UID>'::uuid
ORDER BY snapshot_at DESC;
*/

-- ============================================================================
-- STEP 8: Test idempotency (same update twice should return same row)
-- ============================================================================
-- Run the same update twice - second call should return existing row
-- (because hashdiff will match)

-- First call (creates new row):
/*
SELECT * FROM public.fn_tally_card_patch_scd2(
  p_id := '<TALLY_CARD_ID>'::uuid,
  p_note := 'Idempotency test note'
);
*/

-- Second call with same values (should return existing row, not create duplicate):
/*
SELECT * FROM public.fn_tally_card_patch_scd2(
  p_id := '<TALLY_CARD_ID>'::uuid,
  p_note := 'Idempotency test note'  -- Same value
);
*/

-- Verify only one row exists with this hashdiff:
/*
SELECT COUNT(*) AS row_count
FROM public.tcm_tally_cards
WHERE card_uid = '<CARD_UID>'::uuid
  AND note = 'Idempotency test note';
*/




