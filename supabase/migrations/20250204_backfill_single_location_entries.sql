-- ============================================================================
-- Migration: Backfill Single-Location Entries with Child Location Rows
-- Date: 2025-02-04
-- Purpose: 
--   Standardize all entries to use the locations table, even for single-location entries.
--   This creates child location rows for all existing single-location entries that don't
--   already have child locations, using the parent's qty and location values.
-- 
-- SAFETY NOTES:
--   - Only processes latest entry per tally_card_number (SCD2 pattern)
--   - Only creates rows where parent has both qty and location
--   - Skips entries that already have child locations
--   - Idempotent: safe to run multiple times
-- ============================================================================

-- Step 1: Insert child location rows for single-location entries
-- For each entry where:
--   - multi_location = false (or NULL, treated as false)
--   - No child locations exist
--   - Parent has both qty and location values
--   - Is the latest entry for its tally_card_number (SCD2)
INSERT INTO tcm_user_tally_card_entry_locations (entry_id, location, qty, pos)
SELECT 
  e.id as entry_id,
  e.location,
  e.qty,
  1 as pos
FROM tcm_user_tally_card_entries e
WHERE (e.multi_location = false OR e.multi_location IS NULL)
  AND e.location IS NOT NULL
  AND e.location != ''
  AND e.qty IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM tcm_user_tally_card_entry_locations l 
    WHERE l.entry_id = e.id
  )
  -- Only process latest entry per tally_card_number (SCD2 pattern)
  -- This ensures we only backfill the "current" version of each entry
  AND e.updated_at = (
    SELECT MAX(updated_at)
    FROM tcm_user_tally_card_entries
    WHERE tally_card_number = e.tally_card_number
  )
ON CONFLICT DO NOTHING; -- Idempotent: skip if somehow duplicate

-- Step 2: Update multi_location flag for entries that now have child locations
-- This ensures the flag accurately reflects the data structure
UPDATE tcm_user_tally_card_entries e
SET multi_location = (
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM tcm_user_tally_card_entry_locations l 
      WHERE l.entry_id = e.id
    ) > 1 THEN true
    WHEN (
      SELECT COUNT(*) 
      FROM tcm_user_tally_card_entry_locations l 
      WHERE l.entry_id = e.id
    ) = 1 THEN false  -- Has exactly 1 location
    ELSE e.multi_location  -- Keep existing value if no locations
  END
)
WHERE e.updated_at = (
  SELECT MAX(updated_at)
  FROM tcm_user_tally_card_entries
  WHERE tally_card_number = e.tally_card_number
);

-- Log summary
DO $$
DECLARE
  v_inserted_count INTEGER;
  v_updated_count INTEGER;
BEGIN
  -- Count how many rows were inserted (approximate, since we can't get exact count from INSERT)
  SELECT COUNT(*) INTO v_inserted_count
  FROM tcm_user_tally_card_entry_locations l
  WHERE l.pos = 1
    AND EXISTS (
      SELECT 1 
      FROM tcm_user_tally_card_entries e
      WHERE e.id = l.entry_id
        AND (e.multi_location = false OR e.multi_location IS NULL)
    );
  
  -- Count how many entries were updated
  SELECT COUNT(*) INTO v_updated_count
  FROM tcm_user_tally_card_entries e
  WHERE EXISTS (
    SELECT 1 
    FROM tcm_user_tally_card_entry_locations l 
    WHERE l.entry_id = e.id
  )
  AND e.updated_at = (
    SELECT MAX(updated_at)
    FROM tcm_user_tally_card_entries
    WHERE tally_card_number = e.tally_card_number
  );
  
  RAISE NOTICE '[Backfill] Inserted approximately % child location rows', v_inserted_count;
  RAISE NOTICE '[Backfill] Updated multi_location flag for % entries', v_updated_count;
END $$;

