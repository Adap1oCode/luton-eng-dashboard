-- ============================================================================
-- Migration: Remove p_locations Parameter from SCD2 Function
-- Date: 2025-02-02
-- Purpose: 
--   1. Drop old function signature with p_locations parameter
--   2. Create new simplified function without p_locations
--   3. Child locations are now managed separately via resource API
-- ============================================================================

-- Drop the old function signature that includes p_locations
-- This resolves the ambiguity when calling the function with 6 parameters
DROP FUNCTION IF EXISTS public.fn_user_entry_patch_scd2(uuid, text, boolean, integer, text, text, jsonb);

-- Create new simplified function WITHOUT p_locations parameter
-- Child locations are managed separately via /api/resources/tcm_user_tally_card_entry_locations
CREATE OR REPLACE FUNCTION public.fn_user_entry_patch_scd2(
  p_id uuid,
  p_reason_code text DEFAULT NULL,
  p_multi_location boolean DEFAULT NULL,
  p_qty integer DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS public.tcm_user_tally_card_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.tcm_user_tally_card_entries%ROWTYPE;
  v_new public.tcm_user_tally_card_entries%ROWTYPE;
  v_me uuid;
  v_anchor_value text;
  v_card_uid uuid;
  v_old_current public.tcm_user_tally_card_entries%ROWTYPE;
  v_has_changes boolean := false;
  v_expected_hashdiff text;
  v_payload text;
  v_existing_row public.tcm_user_tally_card_entries%ROWTYPE;
BEGIN
  RAISE NOTICE '[SCD2] Starting for entry_id: %', p_id;
  
  -- Resolve caller's app user id
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
      USING ERRCODE = 'P0002';
  END IF;

  -- Get current active record (latest for this tally_card_number)
  SELECT * INTO v_old_current
  FROM public.tcm_user_tally_card_entries
  WHERE tally_card_number = v_old.tally_card_number
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    v_old_current := v_old;
  END IF;

  RAISE NOTICE '[SCD2] Current entry: id=%, multi_location=%', v_old_current.id, v_old_current.multi_location;

  -- SIMPLIFIED: Only check parent fields for changes
  v_has_changes := false;
  
  IF (p_qty IS NOT NULL AND p_qty IS DISTINCT FROM v_old_current.qty) THEN
    v_has_changes := true;
  END IF;
  
  IF (p_location IS NOT NULL AND p_location IS DISTINCT FROM v_old_current.location) THEN
    v_has_changes := true;
  END IF;
  
  IF (p_note IS NOT NULL AND p_note IS DISTINCT FROM v_old_current.note) THEN
    v_has_changes := true;
  END IF;
  
  IF (p_reason_code IS NOT NULL AND p_reason_code IS DISTINCT FROM COALESCE(v_old_current.reason_code, 'UNSPECIFIED')) THEN
    v_has_changes := true;
  END IF;
  
  IF (p_multi_location IS NOT NULL AND p_multi_location IS DISTINCT FROM COALESCE(v_old_current.multi_location, false)) THEN
    v_has_changes := true;
  END IF;

  RAISE NOTICE '[SCD2] Change detection result: %', v_has_changes;

  -- If no changes, return existing row
  IF NOT v_has_changes THEN
    RAISE NOTICE '[SCD2] No changes - returning existing row';
    RETURN v_old_current;
  END IF;

  -- Calculate expected hashdiff for uniqueness check
  v_anchor_value := v_old_current.tally_card_number;
  v_card_uid := v_old_current.card_uid;
  
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

  -- Check if row with same hashdiff already exists (idempotent check)
  IF v_card_uid IS NOT NULL THEN
    SELECT * INTO v_existing_row
    FROM public.tcm_user_tally_card_entries
    WHERE updated_by_user_id = v_me
      AND card_uid = v_card_uid
      AND hashdiff = v_expected_hashdiff
    ORDER BY updated_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      RAISE NOTICE '[SCD2] Row with same hashdiff exists - returning it';
      RETURN v_existing_row;
    END IF;
  END IF;

  -- Insert new SCD2 row
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
      v_me,
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
    
    RAISE NOTICE '[SCD2] New row inserted: id=%, multi_location=%', v_new.id, v_new.multi_location;
  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition - query for existing row
      IF v_card_uid IS NOT NULL THEN
        SELECT * INTO v_existing_row
        FROM public.tcm_user_tally_card_entries
        WHERE updated_by_user_id = v_me
          AND card_uid = v_card_uid
          AND hashdiff = v_expected_hashdiff
        ORDER BY updated_at DESC
        LIMIT 1;
        
        IF FOUND THEN
          RAISE NOTICE '[SCD2] Found existing row after constraint violation';
          RETURN v_existing_row;
        END IF;
      END IF;
      RAISE;
  END;

  -- NOTE: Child locations are NOT managed by this function
  -- They are handled separately via /api/resources/tcm_user_tally_card_entry_locations
  -- After locations are updated via resource API, they are aggregated and parent is updated via this function
  
  RAISE NOTICE '[SCD2] Function complete. Returning row: id=%', v_new.id;
  RETURN v_new;
END;
$function$;

-- Grant execute permission for the new function signature (6 parameters, no p_locations)
GRANT EXECUTE ON FUNCTION public.fn_user_entry_patch_scd2(uuid, text, boolean, integer, text, text) TO authenticated;

