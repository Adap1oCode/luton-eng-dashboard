-- Manually recreate the RPC function to match working pattern exactly
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.fn_tally_card_patch_scd2(UUID, TEXT, UUID, BIGINT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.fn_tally_card_patch_scd2(
  p_id UUID,
  p_tally_card_number TEXT DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_item_number BIGINT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  card_uid UUID,
  tally_card_number TEXT,
  warehouse_id UUID,
  item_number BIGINT,
  note TEXT,
  is_active BOOLEAN,
  snapshot_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card_uid UUID;
  v_old_record RECORD;
  v_old_current RECORD;
  v_new_id UUID;
  v_new_record RECORD;
  v_has_changes boolean := false;
  v_expected_hashdiff text;
  v_payload text;
  v_existing_row RECORD;
BEGIN
  RAISE NOTICE '[SCD2] Starting for tally_card_id: %', p_id;
  
  -- Fetch current record to get card_uid (anchor)
  -- SECURITY DEFINER should bypass RLS, but if it doesn't, this will fail
  -- If this fails, check RLS policies on tcm_tally_cards table
  BEGIN
    SELECT * INTO v_old_record
    FROM public.tcm_tally_cards t
    WHERE t.id = p_id
    LIMIT 1;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Record not found: id=%', p_id
        USING ERRCODE = 'P0002';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'Access denied: RLS policy blocking access to tcm_tally_cards. Check RLS policies.'
        USING ERRCODE = '42501';
    WHEN OTHERS THEN
      RAISE;
  END;
  
  v_card_uid := v_old_record.card_uid;
  
  -- Get the current record for comparison (latest snapshot_at for this card_uid)
  SELECT * INTO v_old_current
  FROM public.tcm_tally_cards t
  WHERE t.card_uid = v_card_uid
  ORDER BY t.snapshot_at DESC
  LIMIT 1
  FOR UPDATE;
  
  IF NOT FOUND THEN
    v_old_current := v_old_record;
  END IF;
  
  RAISE NOTICE '[SCD2] Current record: id=%, card_uid=%', v_old_current.id, v_old_current.card_uid;
  
  -- Check if any values actually changed
  IF (p_tally_card_number IS NOT NULL AND p_tally_card_number IS DISTINCT FROM COALESCE(v_old_current.tally_card_number, '')) THEN
    v_has_changes := true;
  END IF;
  
  IF (p_warehouse_id IS NOT NULL AND p_warehouse_id IS DISTINCT FROM COALESCE(v_old_current.warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    v_has_changes := true;
  END IF;
  
  IF (p_item_number IS NOT NULL AND p_item_number IS DISTINCT FROM COALESCE(v_old_current.item_number, 0)) THEN
    v_has_changes := true;
  END IF;
  
  IF (p_note IS NOT NULL AND p_note IS DISTINCT FROM COALESCE(v_old_current.note, '')) THEN
    v_has_changes := true;
  END IF;
  
  IF (p_is_active IS NOT NULL AND p_is_active IS DISTINCT FROM COALESCE(v_old_current.is_active, true)) THEN
    v_has_changes := true;
  END IF;
  
  RAISE NOTICE '[SCD2] Change detection result: %', v_has_changes;
  
  -- If no changes, return existing row
  IF NOT v_has_changes THEN
    RAISE NOTICE '[SCD2] No changes - returning existing row';
    RETURN QUERY
    SELECT
      t.id,
      t.card_uid,
      t.tally_card_number,
      t.warehouse_id,
      t.item_number,
      t.note,
      t.is_active,
      t.snapshot_at
    FROM public.tcm_tally_cards t
    WHERE t.id = v_old_current.id;
    RETURN;
  END IF;
  
  -- Calculate expected hashdiff for uniqueness check (same logic as trigger function)
  v_payload := concat_ws(' | ',
    coalesce(v_card_uid::text, '∅'),
    coalesce(COALESCE(p_warehouse_id, v_old_current.warehouse_id)::text, '∅'),
    coalesce(lower(btrim(COALESCE(p_tally_card_number, v_old_current.tally_card_number))), '∅'),
    coalesce(COALESCE(p_item_number, v_old_current.item_number)::text, '∅'),
    coalesce(lower(btrim(COALESCE(p_note, v_old_current.note))), '∅'),
    coalesce(COALESCE(p_is_active, v_old_current.is_active, true)::text, 'true')
  );
  
  -- Use extensions.digest() with fully qualified name (matches working function exactly)
  v_expected_hashdiff := encode(extensions.digest(v_payload, 'sha256'), 'hex');
  RAISE NOTICE '[SCD2] Expected hashdiff: %', v_expected_hashdiff;
  
  -- Check if row with same hashdiff already exists (idempotent check)
  IF v_card_uid IS NOT NULL THEN
    SELECT * INTO v_existing_row
    FROM public.tcm_tally_cards t
    WHERE t.card_uid = v_card_uid
      AND t.hashdiff = v_expected_hashdiff
    ORDER BY t.snapshot_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      RAISE NOTICE '[SCD2] Row with same hashdiff exists - returning it';
      RETURN QUERY
      SELECT
        t.id,
        t.card_uid,
        t.tally_card_number,
        t.warehouse_id,
        t.item_number,
        t.note,
        t.is_active,
        t.snapshot_at
      FROM public.tcm_tally_cards t
      WHERE t.id = v_existing_row.id;
      RETURN;
    END IF;
  END IF;
  
  -- Insert new SCD2 row
  BEGIN
    v_new_id := gen_random_uuid();
    
    INSERT INTO public.tcm_tally_cards (
      id,
      card_uid,
      tally_card_number,
      warehouse_id,
      item_number,
      note,
      is_active,
      snapshot_at
    ) VALUES (
      v_new_id,
      v_card_uid,
      COALESCE(p_tally_card_number, v_old_current.tally_card_number),
      COALESCE(p_warehouse_id, v_old_current.warehouse_id),
      COALESCE(p_item_number, v_old_current.item_number),
      COALESCE(p_note, v_old_current.note),
      COALESCE(p_is_active, v_old_current.is_active, true),
      NOW()
    )
    RETURNING * INTO v_new_record;
    
    RAISE NOTICE '[SCD2] New row inserted: id=%', v_new_record.id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition - query for existing row
      IF v_card_uid IS NOT NULL THEN
        SELECT * INTO v_existing_row
        FROM public.tcm_tally_cards t
        WHERE t.card_uid = v_card_uid
          AND t.hashdiff = v_expected_hashdiff
        ORDER BY t.snapshot_at DESC
        LIMIT 1;
        
        IF FOUND THEN
          RAISE NOTICE '[SCD2] Found existing row after constraint violation';
          RETURN QUERY
          SELECT
            t.id,
            t.card_uid,
            t.tally_card_number,
            t.warehouse_id,
            t.item_number,
            t.note,
            t.is_active,
            t.snapshot_at
          FROM public.tcm_tally_cards t
          WHERE t.id = v_existing_row.id;
          RETURN;
        END IF;
      END IF;
      RAISE;
  END;
  
  RAISE NOTICE '[SCD2] Function complete. Returning row: id=%', v_new_record.id;
  
  -- Return the new record
  RETURN QUERY
  SELECT
    t.id,
    t.card_uid,
    t.tally_card_number,
    t.warehouse_id,
    t.item_number,
    t.note,
    t.is_active,
    t.snapshot_at
  FROM public.tcm_tally_cards t
  WHERE t.id = v_new_id;
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_tally_card_patch_scd2(UUID, TEXT, UUID, BIGINT, TEXT, BOOLEAN) TO authenticated;

