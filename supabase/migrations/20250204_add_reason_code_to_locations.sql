-- ============================================================================
-- Migration: Add reason_code to tcm_user_tally_card_entry_locations
-- Date: 2025-02-04
-- Purpose: 
--   Move reason_code from parent entry to child locations table.
--   Each location entry can now have its own reason code.
-- 
-- SAFETY NOTES:
--   - Adds nullable column (safe, won't break existing data)
--   - Backfills reason_code from parent entry for existing locations
--   - Idempotent: safe to run multiple times
-- ============================================================================

-- Step 1: Add reason_code column to locations table
ALTER TABLE tcm_user_tally_card_entry_locations
ADD COLUMN IF NOT EXISTS reason_code text;

-- Step 2: Backfill reason_code from parent entry for existing locations
UPDATE tcm_user_tally_card_entry_locations l
SET reason_code = COALESCE(
  e.reason_code,
  'UNSPECIFIED'
)
FROM tcm_user_tally_card_entries e
WHERE l.entry_id = e.id
  AND l.reason_code IS NULL;

-- Step 3: Set default for new rows (if not provided)
ALTER TABLE tcm_user_tally_card_entry_locations
ALTER COLUMN reason_code SET DEFAULT 'UNSPECIFIED';

-- Step 4: Add comment for documentation
COMMENT ON COLUMN tcm_user_tally_card_entry_locations.reason_code IS 
  'Reason code for this specific location adjustment. Each location can have a different reason.';

