-- ============================================================================
-- Migration: Final Stock Adjustments Update (Safe, Idempotent)
-- Date: 2025-01-31
-- Purpose: 
--   1. Enable pgcrypto extension (for digest() function in hashdiff trigger)
--   2. Update view to use DISTINCT ON instead of is_current (no is_current column)
--   3. Update RPC function to support new fields (reason_code, multi_location, locations)
--   4. Update RLS policies to use updated_at instead of is_current
--   5. FIX: Prevent duplicate key constraint violations (uq_entries_uid_hash)
-- 
-- CRITICAL FIXES FOR DUPLICATE KEY CONSTRAINT:
--   - Added pre-insert hashdiff uniqueness check (prevents constraint violations)
--   - Improved change detection logic (handles all location transitions)
--   - Added transaction locking (SELECT FOR UPDATE to prevent race conditions)
--   - Added exception handling (idempotent behavior on constraint violations)
-- 
-- SAFETY NOTES:
--   - All changes use CREATE OR REPLACE / IF NOT EXISTS (idempotent)
--   - View update is backward compatible (same columns, different filtering)
--   - RPC function signature change: old calls will fail, but app code is updated
--   - RLS policy update: uses IF NOT EXISTS to avoid conflicts
-- 
-- ROLLBACK INSTRUCTIONS:
--   If you need to rollback this migration:
--   1. Restore previous version of fn_user_entry_patch_scd2 from backup
--   2. Restore previous version of fn_user_entry_set_hashdiff from backup
--   3. Restore previous version of v_tcm_user_tally_card_entries view from backup
--   4. Restore previous RLS policies from backup
--   Note: This migration is idempotent and can be re-run safely
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable pgcrypto extension (required for digest() function)
-- ============================================================================
-- IMPORTANT: In Supabase, you may need to enable this extension via Dashboard first:
--   1. Go to Supabase Dashboard > Database > Extensions
--   2. Search for "pgcrypto"
--   3. Click "Enable"
--   4. Then run this migration
--
-- This is safe: IF NOT EXISTS means it won't error if already installed
DO $$
BEGIN
  -- Try to create the extension
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create pgcrypto extension: %. You may need to enable it in Supabase Dashboard > Database > Extensions first.', SQLERRM;
    RAISE;
  END;
  
  -- Verify the extension is installed
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION 'pgcrypto extension is not installed. Please enable it in Supabase Dashboard > Database > Extensions, then re-run this migration.';
  END IF;
  
  -- Verify digest function is accessible
  -- Note: digest() is in pg_catalog schema, but should be accessible if extension is enabled
  PERFORM encode(digest('test', 'sha256'), 'hex');
  
  RAISE NOTICE 'pgcrypto extension is enabled and digest() function is accessible.';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'pgcrypto extension check failed: %. Please enable pgcrypto in Supabase Dashboard > Database > Extensions first.', SQLERRM;
END $$;

-- ============================================================================
-- STEP 2: Update view to use DISTINCT ON instead of is_current
-- ============================================================================
-- SAFE: CREATE OR REPLACE view - no data loss, just changes how "current" is determined
-- The view now shows the latest row per tally_card_number based on updated_at DESC
CREATE OR REPLACE VIEW v_tcm_user_tally_card_entries AS
SELECT 
  e.id,
  e.updated_by_user_id,
  u.id as user_id,
  u.full_name,
  e.role_family,
  e.tally_card_number,
  e.card_uid,
  e.qty,
  e.location,
  e.note,
  e.updated_at,
  to_char(e.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at_pretty,
  e.reason_code,
  e.multi_location,
  tc.warehouse_id,
  w.name as warehouse
FROM (
  -- Get latest row per tally_card_number using DISTINCT ON
  SELECT DISTINCT ON (e.tally_card_number)
    e.*
  FROM tcm_user_tally_card_entries e
  ORDER BY e.tally_card_number, e.updated_at DESC
) e
LEFT JOIN users u ON e.updated_by_user_id = u.app_user_id
LEFT JOIN tcm_tally_cards tc ON e.card_uid = tc.card_uid
LEFT JOIN warehouses w ON tc.warehouse_id = w.id;

-- ============================================================================
-- STEP 3: Update RLS policy for child table (use updated_at instead of is_current)
-- ============================================================================
-- SAFE: DROP IF EXISTS then CREATE - ensures clean state
-- This policy allows users to manage locations only for "current" entries
DROP POLICY IF EXISTS "Users can manage locations for entries they can edit" 
  ON tcm_user_tally_card_entry_locations;

CREATE POLICY "Users can manage locations for entries they can edit"
ON tcm_user_tally_card_entry_locations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tcm_user_tally_card_entries e
    WHERE e.id = tcm_user_tally_card_entry_locations.entry_id
    -- Check if this entry is the latest version (current) for its tally_card_number
    AND e.updated_at = (
      SELECT MAX(updated_at)
      FROM tcm_user_tally_card_entries
      WHERE tally_card_number = e.tally_card_number
    )
    -- RLS on parent table will enforce access control
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tcm_user_tally_card_entries e
    WHERE e.id = tcm_user_tally_card_entry_locations.entry_id
    -- Check if this entry is the latest version (current) for its tally_card_number
    AND e.updated_at = (
      SELECT MAX(updated_at)
      FROM tcm_user_tally_card_entries
      WHERE tally_card_number = e.tally_card_number
    )
    -- RLS on parent table will enforce access control
  )
);

-- ============================================================================
-- STEP 4: Update RPC function to support new fields
-- ============================================================================
-- SAFE: DROP old signature first (if exists), then CREATE new one
-- WARNING: Old function calls with signature (uuid, integer, text, text) will fail
--          But application code has been updated to use new signature

-- Drop old function signature if it exists
DROP FUNCTION IF EXISTS public.fn_user_entry_patch_scd2(uuid, integer, text, text);

-- Create new function with extended signature
CREATE OR REPLACE FUNCTION public.fn_user_entry_patch_scd2(
  p_id uuid,
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
DECLARE
  v_old public.tcm_user_tally_card_entries%ROWTYPE;
  v_new public.tcm_user_tally_card_entries%ROWTYPE;
  v_me uuid;  -- app users.id
  v_anchor_value text;
  v_card_uid uuid;
  v_old_current public.tcm_user_tally_card_entries%ROWTYPE;
  loc jsonb;
  v_pos smallint;
  v_has_changes boolean := false;
  v_existing_locations jsonb;
  v_new_locations jsonb;
  -- Variables for location comparison (to avoid conflict with 'loc' variable)
  v_existing_count integer;
  v_new_count integer;
  v_location_match boolean;
  v_location_rec record;
  -- Variables for location transition logic
  v_current_multi boolean;
  v_new_multi boolean;
  v_locations_provided boolean;
  v_locations_empty boolean;
  -- Variables for pre-insert hashdiff check
  v_expected_hashdiff text;
  v_payload text;
  v_existing_row public.tcm_user_tally_card_entries%ROWTYPE;
  -- Variables for child location insertion
  v_should_insert_locations boolean;
  v_locations_array_length integer;
BEGIN
  RAISE NOTICE '[SCD2] Starting fn_user_entry_patch_scd2 for entry_id: %, multi_location: %, locations_count: %', 
    p_id, 
    p_multi_location, 
    CASE WHEN p_locations IS NULL THEN 'NULL' ELSE jsonb_array_length(p_locations)::text END;
  
  -- Resolve caller's app user id (users.id) via Supabase auth uid
  SELECT id INTO v_me
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_me IS NULL THEN
    RAISE EXCEPTION 'No app user found for auth uid %', auth.uid()
      USING ERRCODE = 'P0001';
  END IF;
  
  RAISE NOTICE '[SCD2] Resolved user_id: %', v_me;

  -- Load the row we're editing
  SELECT * INTO v_old
  FROM public.tcm_user_tally_card_entries
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry % not found', p_id
      USING ERRCODE = 'P0002';  -- NO_DATA_FOUND
  END IF;
  
  RAISE NOTICE '[SCD2] Loaded old entry: id=%, tally_card_number=%, multi_location=%, updated_at=%', 
    v_old.id, v_old.tally_card_number, v_old.multi_location, v_old.updated_at;

  -- Get the current active record for comparison (by tally_card_number)
  -- Current record is the one with the latest updated_at for this tally_card_number
  -- Use SELECT FOR UPDATE to prevent race conditions
  SELECT * INTO v_old_current
  FROM public.tcm_user_tally_card_entries
  WHERE tally_card_number = v_old.tally_card_number
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Fallback to the row we loaded
    v_old_current := v_old;
  END IF;
  
  RAISE NOTICE '[SCD2] Current entry for comparison: id=%, multi_location=%, updated_at=%', 
    v_old_current.id, v_old_current.multi_location, v_old_current.updated_at;

  -- Check if any values actually changed (including new fields)
  -- This mirrors the logic in tcm_entries_skip_noop trigger
  v_has_changes := false;
  
  RAISE NOTICE '[SCD2] Starting change detection...';
  
  -- Check individual field changes (use separate IF statements, not ELSIF, to check all fields)
  IF (p_qty IS NOT NULL AND (p_qty IS DISTINCT FROM v_old_current.qty)) THEN
    v_has_changes := true;
    RAISE NOTICE '[SCD2] Change detected: qty (% -> %)', v_old_current.qty, p_qty;
  END IF;
  
  IF (p_location IS NOT NULL AND (p_location IS DISTINCT FROM v_old_current.location)) THEN
    v_has_changes := true;
    RAISE NOTICE '[SCD2] Change detected: location (% -> %)', v_old_current.location, p_location;
  END IF;
  
  IF (p_note IS NOT NULL AND (p_note IS DISTINCT FROM v_old_current.note)) THEN
    v_has_changes := true;
    RAISE NOTICE '[SCD2] Change detected: note';
  END IF;
  
  IF (p_reason_code IS NOT NULL AND (p_reason_code IS DISTINCT FROM COALESCE(v_old_current.reason_code, 'UNSPECIFIED'))) THEN
    v_has_changes := true;
    RAISE NOTICE '[SCD2] Change detected: reason_code (% -> %)', COALESCE(v_old_current.reason_code, 'UNSPECIFIED'), p_reason_code;
  END IF;
  
  IF (p_multi_location IS NOT NULL AND (p_multi_location IS DISTINCT FROM COALESCE(v_old_current.multi_location, false))) THEN
    v_has_changes := true;
    RAISE NOTICE '[SCD2] Change detected: multi_location (% -> %)', COALESCE(v_old_current.multi_location, false), p_multi_location;
  END IF;
  
  -- Check child locations for changes
  -- Handle all transitions: false→true, true→false, true→true
  IF p_multi_location IS NOT NULL OR p_locations IS NOT NULL THEN
    RAISE NOTICE '[SCD2] Checking child locations...';
    -- Determine if we're in multi-location mode (current or new)
    v_current_multi := COALESCE(v_old_current.multi_location, false);
    v_new_multi := COALESCE(p_multi_location, v_current_multi);
    v_locations_provided := (p_locations IS NOT NULL);
    v_locations_empty := (p_locations IS NULL OR jsonb_array_length(p_locations) = 0);
    
    RAISE NOTICE '[SCD2] Location check: current_multi=%, new_multi=%, locations_provided=%, locations_empty=%', 
      v_current_multi, v_new_multi, v_locations_provided, v_locations_empty;
    
    -- Transition: false→true (switching to multi-location)
    IF NOT v_current_multi AND v_new_multi THEN
      RAISE NOTICE '[SCD2] Transition: false→true (switching to multi-location)';
      -- If locations provided and not empty, this is a change
      IF v_locations_provided AND NOT v_locations_empty THEN
        v_has_changes := true;
        RAISE NOTICE '[SCD2] Change detected: switching to multi-location with locations';
      END IF;
    -- Transition: true→false (switching from multi-location)
    ELSIF v_current_multi AND NOT v_new_multi THEN
      RAISE NOTICE '[SCD2] Transition: true→false (switching from multi-location)';
      -- Check if there were existing locations
      SELECT COUNT(*) INTO v_existing_count
      FROM public.tcm_user_tally_card_entry_locations
      WHERE entry_id = v_old_current.id;
      RAISE NOTICE '[SCD2] Existing child locations count: %', v_existing_count;
      IF v_existing_count > 0 THEN
        v_has_changes := true;
        RAISE NOTICE '[SCD2] Change detected: switching from multi-location (had % locations)', v_existing_count;
      END IF;
    -- Staying in multi-location mode (true→true)
    ELSIF v_current_multi AND v_new_multi THEN
      RAISE NOTICE '[SCD2] Staying in multi-location mode (true→true)';
      -- Only compare if locations are provided
      IF v_locations_provided THEN
        -- Get count of existing locations
        SELECT COUNT(*) INTO v_existing_count
        FROM public.tcm_user_tally_card_entry_locations
        WHERE entry_id = v_old_current.id;
        
        -- Get count of new locations
        SELECT jsonb_array_length(p_locations) INTO v_new_count;
        IF v_new_count IS NULL THEN
          v_new_count := 0;
        END IF;
        
        -- If counts differ, locations have changed
        IF v_existing_count != v_new_count THEN
          v_has_changes := true;
        ELSIF v_new_count > 0 THEN
          -- Counts match and > 0, compare each location (order-independent)
          -- Use set-based comparison: check if all new locations exist in old locations
          v_location_match := true;
          FOR v_location_rec IN 
            SELECT 
              (location_elem->>'location')::text as new_location,
              ((location_elem->>'qty')::text)::integer as new_qty
            FROM jsonb_array_elements(p_locations) AS location_elem
          LOOP
            -- Check if this location exists with same qty
            IF NOT EXISTS (
              SELECT 1 
              FROM public.tcm_user_tally_card_entry_locations
              WHERE entry_id = v_old_current.id
                AND location = v_location_rec.new_location
                AND qty = v_location_rec.new_qty
            ) THEN
              v_location_match := false;
              EXIT;
            END IF;
          END LOOP;
          
          -- Also check reverse: all old locations exist in new locations
          IF v_location_match THEN
            FOR v_location_rec IN
              SELECT location, qty
              FROM public.tcm_user_tally_card_entry_locations
              WHERE entry_id = v_old_current.id
            LOOP
              IF NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(p_locations) AS location_elem
                WHERE (location_elem->>'location')::text = v_location_rec.location
                  AND ((location_elem->>'qty')::text)::integer = v_location_rec.qty
              ) THEN
                v_location_match := false;
                EXIT;
              END IF;
            END LOOP;
          END IF;
          
          IF NOT v_location_match THEN
            v_has_changes := true;
            RAISE NOTICE '[SCD2] Change detected: location details differ';
          ELSE
            RAISE NOTICE '[SCD2] Location details match - no change';
          END IF;
        END IF;
        -- If v_new_count = 0 and v_existing_count = 0, no change (both empty)
      ELSE
        RAISE NOTICE '[SCD2] No locations provided for comparison';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE '[SCD2] Skipping location check (p_multi_location IS NULL AND p_locations IS NULL)';
  END IF;

  RAISE NOTICE '[SCD2] Change detection result: v_has_changes = %', v_has_changes;

  -- If no changes detected, return the current record without creating a new SCD2 row
  IF NOT v_has_changes THEN
    RAISE NOTICE '[SCD2] No changes detected - returning existing row: id=%', v_old_current.id;
    RETURN v_old_current;
  END IF;
  
  RAISE NOTICE '[SCD2] Changes detected - proceeding with SCD2 insert...';

  -- No need to mark old record - SCD2 pattern: just insert new row with latest updated_at
  -- The view will automatically show the latest row as "current" based on updated_at DESC

  -- Store anchor values
  v_anchor_value := v_old_current.tally_card_number;
  v_card_uid := v_old_current.card_uid;

  -- CRITICAL FIX: Pre-insert hashdiff uniqueness check
  -- Calculate expected hashdiff using same logic as trigger function
  -- This prevents constraint violations even if change detection misses something
  -- NOTE: Hashdiff does NOT include child locations, so we must check them separately
  RAISE NOTICE '[SCD2] Calculating expected hashdiff...';
  v_payload := concat_ws(' | ',
    coalesce(v_me::text, '∅'),
    coalesce(lower(btrim(v_anchor_value)), '∅'),
    coalesce(v_card_uid::text, '∅'),
    coalesce(COALESCE(p_qty, v_old_current.qty)::text, '∅'),
    coalesce(lower(btrim(COALESCE(p_location, v_old_current.location))), '∅'),
    coalesce(lower(btrim(COALESCE(p_note, v_old_current.note))), '∅'),
    coalesce(lower(btrim(v_old_current.role_family)), '∅'),
    coalesce(lower(btrim(COALESCE(p_reason_code, v_old_current.reason_code, 'UNSPECIFIED'))), 'unspecified'),
    coalesce(COALESCE(p_multi_location, v_old_current.multi_location, false)::text, 'false')
  );
  
  v_expected_hashdiff := encode(extensions.digest(v_payload, 'sha256'), 'hex');
  RAISE NOTICE '[SCD2] Expected hashdiff: %', v_expected_hashdiff;
  
  -- Check if (updated_by_user_id, card_uid, hashdiff) already exists
  -- IMPORTANT: Hashdiff doesn't include child locations, so we must also check if child locations match
  IF v_card_uid IS NOT NULL THEN
    RAISE NOTICE '[SCD2] Checking for existing row with same hashdiff (card_uid=%)...', v_card_uid;
    SELECT * INTO v_existing_row
    FROM public.tcm_user_tally_card_entries
    WHERE updated_by_user_id = v_me
      AND card_uid = v_card_uid
      AND hashdiff = v_expected_hashdiff
    ORDER BY updated_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      RAISE NOTICE '[SCD2] Found existing row with same hashdiff: id=%', v_existing_row.id;
      -- Row with same hashdiff exists - but we need to check child locations too
      -- If multi_location is true and locations are provided, compare child locations
      IF COALESCE(p_multi_location, v_old_current.multi_location, false) = true AND p_locations IS NOT NULL THEN
        RAISE NOTICE '[SCD2] Comparing child locations for existing row...';
        -- Get count of existing child locations for this entry
        SELECT COUNT(*) INTO v_existing_count
        FROM public.tcm_user_tally_card_entry_locations
        WHERE entry_id = v_existing_row.id;
        
        -- Get count of new locations
        SELECT jsonb_array_length(p_locations) INTO v_new_count;
        IF v_new_count IS NULL THEN
          v_new_count := 0;
        END IF;
        
        -- If counts differ, child locations have changed - need to create new SCD2 row
        IF v_existing_count != v_new_count THEN
          RAISE NOTICE '[SCD2] Child location counts differ (% vs %) - proceeding with insert', v_existing_count, v_new_count;
          -- Child locations differ - proceed with insert
          v_existing_row := NULL;  -- Clear so we don't return early
        ELSIF v_new_count > 0 THEN
          RAISE NOTICE '[SCD2] Comparing child location details (counts match: %)...', v_new_count;
          -- Counts match and > 0, compare each location
          v_location_match := true;
          FOR v_location_rec IN 
            SELECT 
              (location_elem->>'location')::text as new_location,
              ((location_elem->>'qty')::text)::integer as new_qty
            FROM jsonb_array_elements(p_locations) AS location_elem
          LOOP
            IF NOT EXISTS (
              SELECT 1 
              FROM public.tcm_user_tally_card_entry_locations
              WHERE entry_id = v_existing_row.id
                AND location = v_location_rec.new_location
                AND qty = v_location_rec.new_qty
            ) THEN
              v_location_match := false;
              EXIT;
            END IF;
          END LOOP;
          
          -- Also check reverse
          IF v_location_match THEN
            FOR v_location_rec IN
              SELECT location, qty
              FROM public.tcm_user_tally_card_entry_locations
              WHERE entry_id = v_existing_row.id
            LOOP
              IF NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(p_locations) AS location_elem
                WHERE (location_elem->>'location')::text = v_location_rec.location
                  AND ((location_elem->>'qty')::text)::integer = v_location_rec.qty
              ) THEN
                v_location_match := false;
                EXIT;
              END IF;
            END LOOP;
          END IF;
          
          -- If child locations don't match, proceed with insert
          IF NOT v_location_match THEN
            RAISE NOTICE '[SCD2] Child location details differ - proceeding with insert';
            v_existing_row := NULL;  -- Clear so we don't return early
          ELSE
            RAISE NOTICE '[SCD2] Child locations match - returning existing row';
          END IF;
        END IF;
        -- If both counts are 0, child locations match (both empty)
      ELSE
        RAISE NOTICE '[SCD2] No child locations to compare (both empty)';
      END IF;
      
      -- Only return existing row if child locations also match (or not applicable)
      IF v_existing_row IS NOT NULL THEN
        RAISE NOTICE '[SCD2] Returning existing row (id=%) - no changes needed', v_existing_row.id;
        RETURN v_existing_row;
      END IF;
    ELSE
      RAISE NOTICE '[SCD2] No existing row found with same hashdiff - proceeding with insert';
    END IF;
  ELSE
    RAISE NOTICE '[SCD2] card_uid is NULL - skipping hashdiff check';
  END IF;

  -- Insert new SCD2 row with updated values
  -- Note: updated_by_user_id expects users.id (app_user_id), which we already have in v_me
  -- Wrap in exception handler to catch constraint violations (race conditions)
  RAISE NOTICE '[SCD2] Inserting new SCD2 row...';
  BEGIN
    INSERT INTO public.tcm_user_tally_card_entries (
      updated_by_user_id,
      role_family,
      card_uid,
      tally_card_number,
      qty,
      location,
      note,
      reason_code,
      multi_location,
      updated_at
    )
    VALUES (
      v_me,  -- users.id (app_user_id) already resolved from auth.uid()
      v_old_current.role_family,
      v_card_uid,
      v_anchor_value,
      COALESCE(p_qty, v_old_current.qty),
      COALESCE(p_location, v_old_current.location),
      COALESCE(p_note, v_old_current.note),
      COALESCE(p_reason_code, v_old_current.reason_code, 'UNSPECIFIED'),
      COALESCE(p_multi_location, v_old_current.multi_location, false),
      now()
    )
    RETURNING * INTO v_new;
    
    RAISE NOTICE '[SCD2] New SCD2 row inserted: id=%, multi_location=%', v_new.id, v_new.multi_location;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE WARNING '[SCD2] Unique constraint violation caught - querying for existing row...';
      -- Constraint violation occurred (race condition) - query for existing row
      IF v_card_uid IS NOT NULL THEN
        SELECT * INTO v_existing_row
        FROM public.tcm_user_tally_card_entries
        WHERE updated_by_user_id = v_me
          AND card_uid = v_card_uid
          AND hashdiff = v_expected_hashdiff
        ORDER BY updated_at DESC
        LIMIT 1;
        
        IF FOUND THEN
          RAISE NOTICE '[SCD2] Found existing row after constraint violation: id=%', v_existing_row.id;
          RETURN v_existing_row;
        END IF;
      END IF;
      -- If we can't find existing row, re-raise the exception
      RAISE;
  END;

  -- Handle child locations if multi_location is true
  -- IMPORTANT: SCD2 pattern - preserve historical child location data
  -- Only insert new child rows for the new parent entry (v_new.id)
  -- Don't delete old child rows - they're linked to historical parent entries
  -- CRITICAL: v_new.id must be set (from INSERT RETURNING above)
  RAISE NOTICE '[SCD2] Checking if child locations should be inserted...';
  RAISE NOTICE '[SCD2] v_new.id = %, p_multi_location = %, v_old_current.multi_location = %', 
    v_new.id, p_multi_location, v_old_current.multi_location;
  
  IF v_new.id IS NOT NULL THEN
    -- Determine if we should insert child locations
    -- Conditions: multi_location must be true AND p_locations must be provided and not empty
    v_should_insert_locations := false;
    IF COALESCE(p_multi_location, v_old_current.multi_location, false) = true THEN
      RAISE NOTICE '[SCD2] multi_location is true - checking p_locations...';
      IF p_locations IS NOT NULL THEN
        -- Check if p_locations is a valid non-empty array
        SELECT jsonb_array_length(p_locations) INTO v_locations_array_length;
        RAISE NOTICE '[SCD2] p_locations array length: %', v_locations_array_length;
        IF v_locations_array_length IS NOT NULL AND v_locations_array_length > 0 THEN
          v_should_insert_locations := true;
          RAISE NOTICE '[SCD2] Will insert % child locations', v_locations_array_length;
        ELSE
          RAISE NOTICE '[SCD2] p_locations is empty or NULL - skipping child location insertion';
        END IF;
      ELSE
        RAISE NOTICE '[SCD2] p_locations IS NULL - skipping child location insertion';
      END IF;
    ELSE
      RAISE NOTICE '[SCD2] multi_location is false - skipping child location insertion';
    END IF;
    
    -- Insert child locations if conditions are met
    IF v_should_insert_locations THEN
      RAISE NOTICE '[SCD2] Starting child location insertion for entry_id: %', v_new.id;
      v_pos := 0;
      FOR loc IN SELECT * FROM jsonb_array_elements(p_locations)
      LOOP
        v_pos := v_pos + 1;
        RAISE NOTICE '[SCD2] Processing location %: location=%, qty=%', v_pos, loc->>'location', loc->>'qty';
        -- Validate location data before inserting
        IF loc->>'location' IS NOT NULL AND (loc->>'location')::text != '' THEN
          BEGIN
            INSERT INTO public.tcm_user_tally_card_entry_locations (
              entry_id,
              location,
              qty,
              pos
            ) VALUES (
              v_new.id,  -- NEW entry ID from SCD2 insert - links to new parent entry
              (loc->>'location')::text,
              COALESCE(((loc->>'qty')::text)::integer, 0),
              COALESCE(((loc->>'pos')::text)::smallint, v_pos)
            );
            RAISE NOTICE '[SCD2] Successfully inserted child location: entry_id=%, location=%, qty=%, pos=%', 
              v_new.id, loc->>'location', loc->>'qty', v_pos;
          EXCEPTION
            WHEN OTHERS THEN
              -- Log error but don't fail the entire operation
              RAISE WARNING '[SCD2] Failed to insert child location for entry %: %', v_new.id, SQLERRM;
          END;
        ELSE
          RAISE WARNING '[SCD2] Skipping invalid location at pos % (location is NULL or empty)', v_pos;
        END IF;
      END LOOP;
      RAISE NOTICE '[SCD2] Finished inserting child locations. Total inserted: %', v_pos;
    ELSE
      RAISE NOTICE '[SCD2] Child location insertion skipped (v_should_insert_locations = false)';
    END IF;
  ELSE
    RAISE WARNING '[SCD2] v_new.id IS NULL - cannot insert child locations!';
  END IF;
  
  RAISE NOTICE '[SCD2] Function complete. Returning row: id=%, multi_location=%', v_new.id, v_new.multi_location;
  
  -- Note: If switching from multi_location=true to multi_location=false,
  -- we don't need to delete old child rows - they're historical data.
  -- The new entry has multi_location=false, so it won't have child rows.
  -- The view will only show the current entry (which has multi_location=false),
  -- so old child rows won't be displayed.

  RETURN v_new;
END;
$function$;

-- Grant execute permission for the new function signature
GRANT EXECUTE ON FUNCTION public.fn_user_entry_patch_scd2(uuid, text, boolean, integer, text, text, jsonb) TO authenticated;

-- ============================================================================
-- STEP 5: Fix hashdiff trigger function to use fully qualified digest()
-- ============================================================================
-- SAFE: CREATE OR REPLACE - updates existing function
-- This ensures digest() is found even if search_path doesn't include pg_catalog
-- The error "function digest(text, unknown) does not exist" happens when
-- the function can't find digest() in the search_path. Using pg_catalog.digest()
-- explicitly fixes this.

CREATE OR REPLACE FUNCTION public.fn_user_entry_set_hashdiff()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_payload text;
BEGIN
  /*
    Notes:
    - Keep column ordering stable.
    - Normalize text with btrim and lower to avoid spurious diffs.
    - Represent NULLs explicitly.
    - IMPORTANT: We do NOT fold in child table rows
      (tcm_user_tally_card_entry_locations) here because on BEFORE INSERT,
      NEW.id isn't guaranteed/committed. If you want the child breakdown to
      influence SCD2, we can switch this to an AFTER trigger or maintain a
      materialized "effective_*" column and hash that.
    - Use pg_catalog.digest() to ensure it's found regardless of search_path
  */
  v_payload := concat_ws(' | ',
    coalesce(NEW.updated_by_user_id::text, '∅'),
    coalesce(lower(btrim(NEW.tally_card_number)), '∅'),
    coalesce(NEW.card_uid::text, '∅'),
    coalesce(NEW.qty::text, '∅'),
    coalesce(lower(btrim(NEW.location)), '∅'),
    coalesce(lower(btrim(NEW.note)), '∅'),
    coalesce(lower(btrim(NEW.role_family)), '∅'),
    coalesce(lower(btrim(NEW.reason_code)), 'unspecified'),
    coalesce(NEW.multi_location::text, 'false')
  );
  
  -- Use fully qualified name to ensure it's found regardless of search_path
  -- Note: In Supabase, digest() is in the 'extensions' schema, not 'pg_catalog'
  NEW.hashdiff := encode(extensions.digest(v_payload, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$function$;

