-- ============================================================================
-- Simplified SCD2 Function - More Robust and Less Brittle
-- Date: 2025-02-01
-- Purpose: Simplify the RPC function to be more maintainable and reliable
-- ============================================================================

-- This migration replaces the overly complex change detection with a simpler approach:
-- 1. Check if parent fields changed (simple field-by-field comparison)
-- 2. If changed, create new SCD2 row
-- 3. Always manage child locations for the new row (insert new, don't worry about old - they're historical)

CREATE OR REPLACE FUNCTION public.fn_user_entry_patch_scd2(
  p_id uuid,
  p_reason_code text DEFAULT NULL,
  p_multi_location boolean DEFAULT NULL,
  p_qty integer DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_locations jsonb DEFAULT NULL
)
RETURNS tcm_user_tally_card_entries
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
  v_has_changes boolean := false;
  v_expected_hashdiff text;
  v_payload text;
  v_existing_row public.tcm_user_tally_card_entries%ROWTYPE;
  -- Child location variables
  loc jsonb;
  v_pos smallint;
  v_final_multi_location boolean;
BEGIN
  RAISE NOTICE '[SCD2] Starting for entry_id: %, multi_location: %, locations: %', 
    p_id, 
    p_multi_location,
    CASE WHEN p_locations IS NULL THEN 'NULL' ELSE jsonb_array_length(p_locations)::text END;
  
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

  -- SIMPLIFIED: Check if parent fields changed (simple field-by-field)
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
  
  -- SIMPLIFIED: Check child locations - just compare if multi_location is true and locations are provided
  v_final_multi_location := COALESCE(p_multi_location, v_old_current.multi_location, false);
  IF v_final_multi_location = true AND p_locations IS NOT NULL THEN
    -- If we're in multi-location mode and locations are provided, check if they differ
    -- Simple approach: compare count and a hash of the locations
    DECLARE
      v_existing_count integer;
      v_new_count integer;
      v_existing_hash text;
      v_new_hash text;
    BEGIN
      SELECT COUNT(*) INTO v_existing_count
      FROM public.tcm_user_tally_card_entry_locations
      WHERE entry_id = v_old_current.id;
      
      SELECT jsonb_array_length(p_locations) INTO v_new_count;
      IF v_new_count IS NULL THEN v_new_count := 0; END IF;
      
      -- If counts differ, definitely a change
      IF v_existing_count != v_new_count THEN
        v_has_changes := true;
        RAISE NOTICE '[SCD2] Location count changed: % -> %', v_existing_count, v_new_count;
      ELSIF v_new_count > 0 THEN
        -- Counts match, create a simple hash of locations for comparison
        -- Sort locations by location+qty to make comparison order-independent
        SELECT encode(extensions.digest(
          (SELECT string_agg(
            (elem->>'location') || ':' || (elem->>'qty'),
            '|' ORDER BY (elem->>'location'), (elem->>'qty')
          )
          FROM jsonb_array_elements(p_locations) AS elem),
          'sha256'
        ), 'hex') INTO v_new_hash;
        
        SELECT encode(extensions.digest(
          (SELECT string_agg(location || ':' || qty::text, '|' ORDER BY location, qty)
           FROM public.tcm_user_tally_card_entry_locations
           WHERE entry_id = v_old_current.id),
          'sha256'
        ), 'hex') INTO v_existing_hash;
        
        IF v_existing_hash IS DISTINCT FROM v_new_hash THEN
          v_has_changes := true;
          RAISE NOTICE '[SCD2] Location content changed';
        END IF;
      END IF;
    END;
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

  -- SIMPLIFIED: Always insert child locations if multi_location is true and locations provided
  -- Don't worry about old locations - they're historical data (SCD2 pattern)
  v_final_multi_location := COALESCE(p_multi_location, v_old_current.multi_location, false);
  IF v_final_multi_location = true AND p_locations IS NOT NULL THEN
    DECLARE
      v_locations_count integer;
    BEGIN
      SELECT jsonb_array_length(p_locations) INTO v_locations_count;
      
      IF v_locations_count IS NOT NULL AND v_locations_count > 0 THEN
        RAISE NOTICE '[SCD2] Inserting % child locations for entry_id: %', v_locations_count, v_new.id;
        
        v_pos := 0;
        FOR loc IN SELECT * FROM jsonb_array_elements(p_locations)
        LOOP
          v_pos := v_pos + 1;
          
          IF loc->>'location' IS NOT NULL AND (loc->>'location')::text != '' THEN
            BEGIN
              INSERT INTO public.tcm_user_tally_card_entry_locations (
                entry_id,
                location,
                qty,
                pos
              ) VALUES (
                v_new.id,
                (loc->>'location')::text,
                COALESCE(((loc->>'qty')::text)::integer, 0),
                COALESCE(((loc->>'pos')::text)::smallint, v_pos)
              );
              RAISE NOTICE '[SCD2] Inserted location: %, qty: %, pos: %', 
                loc->>'location', loc->>'qty', v_pos;
            EXCEPTION
              WHEN OTHERS THEN
                RAISE WARNING '[SCD2] Failed to insert location %: %', v_pos, SQLERRM;
            END;
          END IF;
        END LOOP;
        
        RAISE NOTICE '[SCD2] Finished inserting child locations';
      ELSE
        RAISE NOTICE '[SCD2] No child locations to insert (empty array)';
      END IF;
    END;
  ELSE
    RAISE NOTICE '[SCD2] Skipping child location insertion (multi_location=false or p_locations=NULL)';
  END IF;
  
  RAISE NOTICE '[SCD2] Function complete. Returning row: id=%', v_new.id;
  RETURN v_new;
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_user_entry_patch_scd2(uuid, text, boolean, integer, text, text, jsonb) TO authenticated;








