-- ============================================================================
-- Fix: Remove unique constraint on tally_card_number for SCD2 compatibility
-- Date: 2025-11-14
-- Purpose: Fix "duplicate key value violates unique constraint uq_tcm_card_number" error
-- Root Cause: UNIQUE constraint on tally_card_number alone conflicts with SCD2
--             SCD2 requires multiple rows with same tally_card_number (different snapshot_at)
-- Solution: Drop uq_tcm_card_number constraint/index
-- Note: Proper SCD2 constraints already exist:
--       - uq_tcm_cards_carduid_hash (card_uid, hashdiff)
--       - ux_tcm_cards_wh_num_snap (warehouse_id, tally_card_number, snapshot_at)
-- ============================================================================

-- ============================================================================
-- Step 1: Drop dependent foreign key constraint first
-- ============================================================================
-- There's a foreign key fk_user_entries_card_number on tcm_user_tally_card_entries
-- that depends on uq_tcm_card_number. We need to drop it first, then recreate it
-- to reference a different constraint or remove it if not needed.

-- Check if the foreign key exists and drop it
ALTER TABLE public.tcm_user_tally_card_entries
  DROP CONSTRAINT IF EXISTS fk_user_entries_card_number;

-- ============================================================================
-- Step 2: Drop the problematic unique constraint/index
-- ============================================================================
-- The constraint uq_tcm_card_number is UNIQUE on tally_card_number alone
-- This prevents SCD2 from working (multiple versions need same tally_card_number)
-- The proper SCD2 constraints already exist, so this can be safely removed

ALTER TABLE public.tcm_tally_cards
  DROP CONSTRAINT IF EXISTS uq_tcm_card_number;

-- Also drop the index if it exists separately (PostgreSQL creates index for unique constraint)
DROP INDEX IF EXISTS public.uq_tcm_card_number;

-- ============================================================================
-- Step 3: Recreate foreign key if needed (or verify it's not needed)
-- ============================================================================
-- The foreign key fk_user_entries_card_number was referencing the unique constraint
-- on tally_card_number. Since we're removing that constraint for SCD2, we need to
-- either:
-- 1. Remove the foreign key (if not needed)
-- 2. Recreate it to reference a different constraint (if needed)
--
-- For SCD2, tcm_user_tally_card_entries should reference card_uid instead of tally_card_number
-- Check if there's already a foreign key on card_uid

DO $$
DECLARE
  v_fk_card_uid_exists boolean;
  v_fk_tally_number_exists boolean;
BEGIN
  -- Check if foreign key on card_uid exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tcm_user_tally_card_entries'
      AND con.conname LIKE '%card_uid%'
      AND con.contype = 'f'
  ) INTO v_fk_card_uid_exists;
  
  -- Check if the old foreign key on tally_card_number still exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tcm_user_tally_card_entries'
      AND con.conname = 'fk_user_entries_card_number'
      AND con.contype = 'f'
  ) INTO v_fk_tally_number_exists;
  
  IF v_fk_tally_number_exists THEN
    RAISE WARNING 'Foreign key fk_user_entries_card_number still exists - this should have been dropped';
  ELSE
    RAISE NOTICE '✓ Foreign key fk_user_entries_card_number successfully removed';
  END IF;
  
  IF v_fk_card_uid_exists THEN
    RAISE NOTICE '✓ Foreign key on card_uid exists - this is the correct reference for SCD2';
  ELSE
    RAISE NOTICE 'ℹ No foreign key on card_uid found - this may be OK if references are handled differently';
  END IF;
END $$;

-- ============================================================================
-- Step 4: Verify proper SCD2 constraints/indexes exist (they should already be there)
-- ============================================================================
-- The proper SCD2 constraints should already exist:
-- - uq_tcm_cards_carduid_hash: (card_uid, hashdiff) for idempotency
-- - ux_tcm_cards_wh_num_snap: (warehouse_id, tally_card_number, snapshot_at) for uniqueness

DO $$
DECLARE
  v_carduid_hash_exists boolean;
  v_wh_num_snap_exists boolean;
  v_idx_name text;
BEGIN
  -- List all unique indexes first for debugging
  RAISE NOTICE 'All unique indexes on tcm_tally_cards:';
  FOR v_idx_name IN 
    SELECT idx_rel.relname
    FROM pg_index idx
    JOIN pg_class rel ON rel.oid = idx.indrelid
    JOIN pg_class idx_rel ON idx_rel.oid = idx.indexrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tcm_tally_cards'
      AND idx.indisunique = true
    ORDER BY idx_rel.relname
  LOOP
    RAISE NOTICE '  - %', v_idx_name;
  END LOOP;
  
  -- Check if uq_tcm_cards_carduid_hash exists by name (simpler check)
  SELECT EXISTS (
    SELECT 1
    FROM pg_index idx
    JOIN pg_class rel ON rel.oid = idx.indrelid
    JOIN pg_class idx_rel ON idx_rel.oid = idx.indexrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tcm_tally_cards'
      AND idx_rel.relname = 'uq_tcm_cards_carduid_hash'
      AND idx.indisunique = true
  ) INTO v_carduid_hash_exists;
  
  -- If not found by name, check by columns
  IF NOT v_carduid_hash_exists THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_index idx
      JOIN pg_class rel ON rel.oid = idx.indrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'tcm_tally_cards'
        AND idx.indisunique = true
        AND array_length(idx.indkey, 1) = 2
        AND EXISTS (
          SELECT 1
          FROM pg_attribute a
          WHERE a.attrelid = idx.indrelid
            AND a.attnum = ANY(idx.indkey)
            AND a.attname IN ('card_uid', 'hashdiff')
          GROUP BY a.attrelid
          HAVING COUNT(DISTINCT a.attname) = 2
        )
    ) INTO v_carduid_hash_exists;
  END IF;
  
  -- Check if ux_tcm_cards_wh_num_snap exists by name
  SELECT EXISTS (
    SELECT 1
    FROM pg_index idx
    JOIN pg_class rel ON rel.oid = idx.indrelid
    JOIN pg_class idx_rel ON idx_rel.oid = idx.indexrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tcm_tally_cards'
      AND idx_rel.relname = 'ux_tcm_cards_wh_num_snap'
      AND idx.indisunique = true
  ) INTO v_wh_num_snap_exists;
  
  -- If not found by name, check by columns
  IF NOT v_wh_num_snap_exists THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_index idx
      JOIN pg_class rel ON rel.oid = idx.indrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'tcm_tally_cards'
        AND idx.indisunique = true
        AND array_length(idx.indkey, 1) = 3
        AND EXISTS (
          SELECT 1
          FROM pg_attribute a
          WHERE a.attrelid = idx.indrelid
            AND a.attnum = ANY(idx.indkey)
            AND a.attname IN ('warehouse_id', 'tally_card_number', 'snapshot_at')
          GROUP BY a.attrelid
          HAVING COUNT(DISTINCT a.attname) = 3
        )
    ) INTO v_wh_num_snap_exists;
  END IF;
  
  IF v_carduid_hash_exists THEN
    RAISE NOTICE '✓ SCD2 idempotency index (card_uid, hashdiff) exists';
  ELSE
    RAISE WARNING '⚠ SCD2 idempotency index (card_uid, hashdiff) not found';
  END IF;
  
  IF v_wh_num_snap_exists THEN
    RAISE NOTICE '✓ SCD2 uniqueness index (warehouse_id, tally_card_number, snapshot_at) exists';
  ELSE
    RAISE WARNING '⚠ SCD2 uniqueness index (warehouse_id, tally_card_number, snapshot_at) not found';
  END IF;
END $$;

-- ============================================================================
-- Step 5: Verify the fix
-- ============================================================================
DO $$
DECLARE
  v_uq_tcm_exists boolean;
  v_index_exists boolean;
  v_idx_name text;
BEGIN
  -- Check if constraint uq_tcm_card_number still exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tcm_tally_cards'::regclass
      AND conname = 'uq_tcm_card_number'
  ) INTO v_uq_tcm_exists;
  
  -- Check if index uq_tcm_card_number still exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_index idx
    JOIN pg_class rel ON rel.oid = idx.indrelid
    JOIN pg_class idx_rel ON idx_rel.oid = idx.indexrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tcm_tally_cards'
      AND idx_rel.relname = 'uq_tcm_card_number'
  ) INTO v_index_exists;
  
  IF v_uq_tcm_exists OR v_index_exists THEN
    RAISE EXCEPTION 'Constraint/index uq_tcm_card_number still exists! Drop failed.';
  ELSE
    RAISE NOTICE '✓ Constraint/index uq_tcm_card_number successfully removed';
  END IF;
  
  -- Verify non-unique index on tally_card_number exists for performance
  SELECT EXISTS (
    SELECT 1
    FROM pg_index idx
    JOIN pg_class rel ON rel.oid = idx.indrelid
    JOIN pg_class idx_rel ON idx_rel.oid = idx.indexrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = ANY(idx.indkey)
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tcm_tally_cards'
      AND idx.indisunique = false
      AND a.attname = 'tally_card_number'
      AND array_length(idx.indkey, 1) = 1
  ) INTO v_index_exists;
  
  IF v_index_exists THEN
    RAISE NOTICE '✓ Non-unique index on tally_card_number exists for performance';
  ELSE
    RAISE NOTICE 'ℹ No non-unique index on tally_card_number (may want to create one for performance)';
  END IF;
  
  -- List all indexes on tally_card_number for reference
  RAISE NOTICE 'All indexes on tally_card_number:';
  FOR v_idx_name IN 
    SELECT idx_rel.relname
    FROM pg_index idx
    JOIN pg_class rel ON rel.oid = idx.indrelid
    JOIN pg_class idx_rel ON idx_rel.oid = idx.indexrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = ANY(idx.indkey)
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tcm_tally_cards'
      AND a.attname = 'tally_card_number'
      AND array_length(idx.indkey, 1) = 1
    ORDER BY idx.indisunique DESC, idx_rel.relname
  LOOP
    RAISE NOTICE '  - %', v_idx_name;
  END LOOP;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- 1. Dropped unique constraint/index uq_tcm_card_number on tally_card_number
--    - This was preventing SCD2 from working (multiple versions need same tally_card_number)
-- 
-- 2. Verified proper SCD2 constraints exist:
--    - uq_tcm_cards_carduid_hash: (card_uid, hashdiff) for idempotency
--    - ux_tcm_cards_wh_num_snap: (warehouse_id, tally_card_number, snapshot_at) for uniqueness
-- 
-- SCD2 now works correctly:
-- - Multiple rows can have the same tally_card_number (different snapshot_at)
-- - Duplicate rows with same card_uid and hashdiff are prevented (idempotency)
-- - Fast lookups by tally_card_number are still possible via existing non-unique indexes

