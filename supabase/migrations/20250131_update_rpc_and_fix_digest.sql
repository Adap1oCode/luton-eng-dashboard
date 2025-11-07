-- ============================================================================
-- Migration: Update RPC Function and Fix pgcrypto Extension
-- Date: 2025-01-31
-- Purpose: 
--   1. Ensure pgcrypto extension is enabled (for digest() function)
--   2. Update fn_user_entry_patch_scd2 to support new fields with backward compatibility
--   3. Align with tcm_entries_skip_noop trigger that checks all fields
-- ============================================================================

-- 1. Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Drop old function signature if it exists (old signature: p_id, p_qty, p_location, p_note)
--    This is necessary because PostgreSQL function overloading requires exact signature match
--    for CREATE OR REPLACE to work. Since we're changing the signature, we must drop first.
DROP FUNCTION IF EXISTS public.fn_user_entry_patch_scd2(uuid, integer, text, text);

-- 3. Create new RPC function with extended signature supporting all fields
--    New signature: (p_id, p_reason_code, p_multi_location, p_qty, p_location, p_note, p_locations)
--    All parameters except p_id are optional (DEFAULT NULL) for flexibility
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
BEGIN
  -- Resolve caller's app user id (users.id) via Supabase auth uid
  SELECT id INTO v_me
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_me IS NULL THEN
    RAISE EXCEPTION 'No app user found for auth uid %', auth.uid()
      USING ERRCODE = 'P0001';
  END IF;

  -- Load the row we're editing
  SELECT * INTO v_old
  FROM public.tcm_user_tally_card_entries
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry % not found', p_id
      USING ERRCODE = 'P0002';  -- NO_DATA_FOUND
  END IF;

  -- Get the current active record for comparison (by tally_card_number)
  -- Current record is the one with the latest updated_at for this tally_card_number
  SELECT * INTO v_old_current
  FROM public.tcm_user_tally_card_entries
  WHERE tally_card_number = v_old.tally_card_number
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback to the row we loaded
    v_old_current := v_old;
  END IF;

  -- Check if any values actually changed (including new fields)
  -- This mirrors the logic in tcm_entries_skip_noop trigger
  v_has_changes := false;
  
  IF (p_qty IS NOT NULL AND (p_qty IS DISTINCT FROM v_old_current.qty)) THEN
    v_has_changes := true;
  ELSIF (p_location IS NOT NULL AND (p_location IS DISTINCT FROM v_old_current.location)) THEN
    v_has_changes := true;
  ELSIF (p_note IS NOT NULL AND (p_note IS DISTINCT FROM v_old_current.note)) THEN
    v_has_changes := true;
  ELSIF (p_reason_code IS NOT NULL AND (p_reason_code IS DISTINCT FROM COALESCE(v_old_current.reason_code, 'UNSPECIFIED'))) THEN
    v_has_changes := true;
  ELSIF (p_multi_location IS NOT NULL AND (p_multi_location IS DISTINCT FROM COALESCE(v_old_current.multi_location, false))) THEN
    v_has_changes := true;
  ELSIF (p_locations IS NOT NULL) THEN
    -- If locations array is provided, always consider it a change (we'll compare child rows separately)
    v_has_changes := true;
  END IF;

  -- If no changes detected, return the current record without creating a new SCD2 row
  IF NOT v_has_changes THEN
    RETURN v_old_current;
  END IF;

  -- No need to mark old record - SCD2 pattern: just insert new row with latest updated_at
  -- The view will automatically show the latest row as "current" based on updated_at DESC

  -- Store anchor values
  v_anchor_value := v_old_current.tally_card_number;
  v_card_uid := v_old_current.card_uid;

  -- Insert new SCD2 row with updated values
  -- Note: updated_by_user_id expects users.id (app_user_id), which we already have in v_me
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

  -- Handle child locations if multi_location is true
  IF COALESCE(p_multi_location, v_old_current.multi_location, false) = true AND p_locations IS NOT NULL THEN
    -- Delete old child rows for all versions of this entry (by tally_card_number)
    DELETE FROM public.tcm_user_tally_card_entry_locations
    WHERE entry_id IN (
      SELECT id FROM public.tcm_user_tally_card_entries
      WHERE tally_card_number = v_anchor_value
    );

    -- Insert new child rows
    v_pos := 0;
    FOR loc IN SELECT * FROM jsonb_array_elements(p_locations)
    LOOP
      v_pos := v_pos + 1;
      INSERT INTO public.tcm_user_tally_card_entry_locations (
        entry_id,
        location,
        qty,
        pos
      ) VALUES (
        v_new.id,
        loc->>'location',
        (loc->>'qty')::integer,
        COALESCE((loc->>'pos')::smallint, v_pos)
      );
    END LOOP;
  ELSIF COALESCE(p_multi_location, v_old_current.multi_location, false) = false THEN
    -- If switching from multi to single, delete any existing child rows
    DELETE FROM public.tcm_user_tally_card_entry_locations
    WHERE entry_id IN (
      SELECT id FROM public.tcm_user_tally_card_entries
      WHERE tally_card_number = v_anchor_value
    );
  END IF;

  RETURN v_new;
END;
$function$;

-- Grant execute permission for the new function signature
GRANT EXECUTE ON FUNCTION public.fn_user_entry_patch_scd2(uuid, text, boolean, integer, text, text, jsonb) TO authenticated;

