-- ============================================================================
-- Diagnostic Script: Check v_tcm_user_tally_card_entries view
-- Purpose: Verify if item_number column exists in the view
-- ============================================================================

-- 1. Check if the view exists
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'v_tcm_user_tally_card_entries';

-- 2. List all columns in the view
SELECT 
  column_name,
  data_type,
  is_nullable,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_tcm_user_tally_card_entries'
ORDER BY ordinal_position;

-- 3. Check if item_number column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'v_tcm_user_tally_card_entries'
        AND column_name = 'item_number'
    ) THEN '✅ item_number column EXISTS'
    ELSE '❌ item_number column MISSING - Run migration: 20250203_add_item_number_to_v_tcm_user_tally_card_entries.sql'
  END as item_number_status;

-- 4. Test query (will fail if item_number doesn't exist)
SELECT 
  id,
  tally_card_number,
  item_number,  -- This will error if column doesn't exist
  warehouse
FROM v_tcm_user_tally_card_entries
LIMIT 1;

