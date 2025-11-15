-- ============================================================================
-- Verify that warehouse column has been removed from tcm_tally_cards
-- Run this in Supabase SQL Editor to check if the migration was applied
-- ============================================================================

-- Check if warehouse column exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tcm_tally_cards'
  AND column_name = 'warehouse';

-- Expected result: 0 rows (column should not exist)

-- If the query returns a row, the migration 20251114_remove_warehouse_column_tally_cards.sql
-- has not been run. Run it in Supabase SQL Editor.

-- Also verify that warehouse_id exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tcm_tally_cards'
  AND column_name = 'warehouse_id';

-- Expected result: 1 row with warehouse_id (uuid, nullable or not-null)





