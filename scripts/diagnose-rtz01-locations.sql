-- ============================================================================
-- Diagnostic Script: RTZ-01 Location Loading Issue
-- ============================================================================
-- This script helps diagnose why locations aren't loading for RTZ-01
-- Run this in Supabase SQL Editor

SET client_min_messages TO NOTICE;

-- Step 1: Find the entry_id(s) for RTZ-01
SELECT 
  'Step 1: Finding entries for RTZ-01' AS step;

SELECT 
  e.id AS entry_id,
  e.tally_card_number,
  e.multi_location,
  e.location AS aggregated_location,
  e.qty AS aggregated_qty,
  e.updated_at,
  e.updated_at AS updated_at_latest,
  ROW_NUMBER() OVER (ORDER BY e.updated_at DESC, e.id DESC) AS scd2_rank
FROM public.tcm_user_tally_card_entries e
WHERE e.tally_card_number = 'RTZ-01'
ORDER BY e.updated_at DESC, e.id DESC;

-- Step 2: Check if the RPC function exists and get its definition
SELECT 
  'Step 2: Checking RPC function definition' AS step;

SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%all_entry_ids%' THEN 'UPDATED (searches all entries)'
    WHEN pg_get_functiondef(p.oid) LIKE '%v_latest_entry%' AND pg_get_functiondef(p.oid) NOT LIKE '%all_entry_ids%' THEN 'OLD (only latest entry)'
    ELSE 'UNKNOWN'
  END AS version_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_stock_adjustment_load_edit';

-- Step 3: Find all locations for RTZ-01 across ALL entry_ids
SELECT 
  'Step 3: Finding all locations for RTZ-01' AS step;

WITH all_entry_ids AS (
  SELECT e.id, e.updated_at, e.multi_location
  FROM public.tcm_user_tally_card_entries e
  WHERE e.tally_card_number = 'RTZ-01'
)
SELECT 
  l.id AS location_id,
  l.entry_id,
  l.location,
  l.qty,
  l.pos,
  e.updated_at AS entry_updated_at,
  e.multi_location,
  CASE 
    WHEN e.id = (SELECT id FROM all_entry_ids ORDER BY updated_at DESC, id DESC LIMIT 1) THEN 'LATEST'
    ELSE 'OLDER'
  END AS entry_status
FROM public.tcm_user_tally_card_entry_locations l
INNER JOIN all_entry_ids e ON e.id = l.entry_id
ORDER BY e.updated_at DESC, l.pos NULLS LAST, l.id;

-- Step 4: Test the RPC function with the latest entry_id
SELECT 
  'Step 4: Testing RPC function' AS step;

-- First, get the latest entry_id
DO $$
DECLARE
  v_test_entry_id uuid;
  v_result RECORD;
BEGIN
  -- Get the latest entry_id for RTZ-01
  SELECT e.id INTO v_test_entry_id
  FROM public.tcm_user_tally_card_entries e
  WHERE e.tally_card_number = 'RTZ-01'
  ORDER BY e.updated_at DESC, e.id DESC
  LIMIT 1;

  IF v_test_entry_id IS NULL THEN
    RAISE NOTICE '❌ No entry found for RTZ-01';
    RETURN;
  END IF;

  RAISE NOTICE '🧪 Testing RPC with entry_id: %', v_test_entry_id;

  -- Call the RPC function
  SELECT * INTO v_result
  FROM public.fn_stock_adjustment_load_edit(v_test_entry_id);

  RAISE NOTICE '✅ RPC returned:';
  RAISE NOTICE '   entry_id: %', v_result.entry_id;
  RAISE NOTICE '   tally_card_number: %', v_result.tally_card_number;
  RAISE NOTICE '   warehouse_id: %', v_result.warehouse_id;
  RAISE NOTICE '   locations count: %', jsonb_array_length(COALESCE(v_result.locations, '[]'::jsonb));
  
  IF jsonb_array_length(COALESCE(v_result.locations, '[]'::jsonb)) > 0 THEN
    RAISE NOTICE '   locations: %', v_result.locations;
  ELSE
    RAISE NOTICE '   ⚠️  WARNING: RPC returned 0 locations!';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ RPC call failed: %', SQLERRM;
END $$;

-- Step 5: Manual query to see what the RPC logic should return
SELECT 
  'Step 5: Manual verification of RPC logic' AS step;

WITH anchor AS (
  SELECT 'RTZ-01'::text AS v_anchor
),
latest_entry AS (
  SELECT e.id AS v_latest_entry
  FROM public.tcm_user_tally_card_entries e, anchor
  WHERE e.tally_card_number = anchor.v_anchor
  ORDER BY e.updated_at DESC, e.id DESC
  LIMIT 1
),
all_entry_ids AS (
  SELECT e.id, e.updated_at
  FROM public.tcm_user_tally_card_entries e, anchor
  WHERE e.tally_card_number = anchor.v_anchor
),
locations_found AS (
  SELECT 
    l.id,
    l.entry_id,
    l.location,
    l.qty,
    l.pos,
    e.updated_at,
    CASE WHEN l.entry_id = (SELECT v_latest_entry FROM latest_entry) THEN 1 ELSE 2 END AS priority
  FROM public.tcm_user_tally_card_entry_locations l
  INNER JOIN all_entry_ids e ON e.id = l.entry_id
)
SELECT 
  'Manual RPC Logic Result' AS test_name,
  (SELECT v_latest_entry FROM latest_entry) AS latest_entry_id,
  (SELECT COUNT(*) FROM all_entry_ids) AS total_entries_in_chain,
  (SELECT COUNT(*) FROM locations_found) AS total_locations_found,
  jsonb_build_object(
    'latest_entry_id', (SELECT v_latest_entry FROM latest_entry),
    'locations_grouped', (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'entry_id', lf.entry_id,
                 'priority', lf.priority,
                 'locations', (
                   SELECT jsonb_agg(
                            jsonb_build_object(
                              'id', l.id,
                              'entry_id', l.entry_id,
                              'location', l.location,
                              'qty', l.qty,
                              'pos', l.pos
                            )
                            ORDER BY COALESCE(l.pos, 32767), l.id
                          )
                   FROM locations_found l
                   WHERE l.entry_id = lf.entry_id
                 )
               )
               ORDER BY lf.priority ASC, lf.updated_at DESC, lf.entry_id DESC
             )
      FROM (
        SELECT DISTINCT entry_id, priority, updated_at
        FROM locations_found
      ) lf
    )
  ) AS grouped_locations_detail,
  COALESCE(
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id', l.id,
                 'entry_id', l.entry_id,
                 'location', l.location,
                 'qty', l.qty,
                 'pos', l.pos
               )
               ORDER BY l.priority ASC, COALESCE(l.pos, 32767), l.id
             )
      FROM locations_found l
    ),
    '[]'::jsonb
  ) AS expected_locations_result;

