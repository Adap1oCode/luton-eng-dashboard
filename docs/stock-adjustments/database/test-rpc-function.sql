-- ============================================================================
-- Test Script: fn_user_entry_patch_scd2 with Logging
-- ============================================================================
-- This script tests the RPC function with comprehensive logging enabled
-- Replace <ENTRY_ID> with an actual entry ID from your database
-- Replace <USER_AUTH_ID> if testing directly in SQL Editor (otherwise use application)

-- Step 1: Enable notice output so we can see RAISE NOTICE messages
SET client_min_messages TO NOTICE;

-- Step 2: Get a valid entry ID to test with
-- Run this first to get an entry ID:
/*
SELECT 
  id,
  tally_card_number,
  multi_location,
  reason_code,
  updated_at
FROM tcm_user_tally_card_entries
ORDER BY updated_at DESC
LIMIT 5;
*/

-- Step 3: Test the RPC function with your payload
-- Replace <ENTRY_ID> with an actual UUID from step 2
-- Example: '09b2b436-d6b6-409f-8d95-54ca4ff89b47'

-- Test Case 1: Multi-location update with child locations
SELECT * FROM fn_user_entry_patch_scd2(
  p_id := '<ENTRY_ID>'::uuid,  -- Replace with actual entry ID
  p_reason_code := 'DAMAGE',
  p_multi_location := true,
  p_qty := NULL,
  p_location := NULL,
  p_note := 'Checking if notes comes up in history',
  p_locations := '[
    {"location": "B5", "qty": 50, "pos": 1},
    {"location": "B6", "qty": 120, "pos": 2}
  ]'::jsonb
);

-- Test Case 2: Single location update
/*
SELECT * FROM fn_user_entry_patch_scd2(
  p_id := '<ENTRY_ID>'::uuid,
  p_reason_code := 'DAMAGE',
  p_multi_location := false,
  p_qty := 100,
  p_location := 'G5',
  p_note := 'Single location test',
  p_locations := NULL
);
*/

-- Test Case 3: No changes (should return existing row)
/*
SELECT * FROM fn_user_entry_patch_scd2(
  p_id := '<ENTRY_ID>'::uuid,
  p_reason_code := NULL,  -- No change
  p_multi_location := NULL,  -- No change
  p_qty := NULL,
  p_location := NULL,
  p_note := NULL,
  p_locations := NULL
);
*/

-- Step 4: Verify child locations were inserted
-- Replace <NEW_ENTRY_ID> with the ID returned from the function above
/*
SELECT 
  l.entry_id,
  l.location,
  l.qty,
  l.pos,
  e.multi_location,
  e.updated_at
FROM tcm_user_tally_card_entry_locations l
JOIN tcm_user_tally_card_entries e ON l.entry_id = e.id
WHERE l.entry_id = '<NEW_ENTRY_ID>'::uuid
ORDER BY l.pos;
*/

-- Step 5: Check the view to see effective_qty and effective_location
/*
SELECT 
  id,
  tally_card_number,
  multi_location,
  reason_code,
  qty,
  location,
  effective_qty,
  effective_location,
  updated_at
FROM v_tcm_user_tally_card_entries
WHERE id = '<NEW_ENTRY_ID>'::uuid;
*/

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. When testing in Supabase SQL Editor, you may get:
--    "ERROR: P0001: No app user found for auth uid <NULL>"
--    This is because auth.uid() returns NULL in SQL Editor.
--    Solution: Test via the application API instead, or create a test helper function.
--
-- 2. To see the NOTICE messages in Supabase SQL Editor:
--    - They appear in the "Messages" tab below the query results
--    - Look for lines starting with "[SCD2]"
--
-- 3. If you need to test with a specific user context, you can temporarily modify
--    the function to accept a user_id parameter, or use the application API.
-- ============================================================================

