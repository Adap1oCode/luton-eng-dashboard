-- ============================================================================
-- Migration: Create fn_tally_card_patch_scd2 function
-- Date: 2025-01-29
-- Purpose: SCD-2 patch function for tally cards using card_uid as anchor
-- ============================================================================

-- Create the SCD-2 patch function for tally cards
CREATE OR REPLACE FUNCTION fn_tally_card_patch_scd2(
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
AS $$
DECLARE
  v_card_uid UUID;
  v_old_record RECORD;
  v_new_id UUID;
  v_anchor_record RECORD;
BEGIN
  -- Fetch current record to get card_uid (anchor)
  SELECT card_uid INTO v_card_uid
  FROM tcm_tally_cards
  WHERE id = p_id
  LIMIT 1;
  
  IF v_card_uid IS NULL THEN
    RAISE EXCEPTION 'Record not found or access denied';
  END IF;
  
  -- Get the current record for comparison
  -- Current record is the one with the latest snapshot_at for this card_uid
  SELECT * INTO v_old_record
  FROM tcm_tally_cards
  WHERE card_uid = v_card_uid
  ORDER BY snapshot_at DESC
  LIMIT 1;
  
  -- Check if any values actually changed
  IF (p_tally_card_number IS NULL OR p_tally_card_number = COALESCE(v_old_record.tally_card_number, ''))
     AND (p_warehouse_id IS NULL OR p_warehouse_id = COALESCE(v_old_record.warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid))
     AND (p_item_number IS NULL OR p_item_number = COALESCE(v_old_record.item_number, 0))
     AND (p_note IS NULL OR p_note = COALESCE(v_old_record.note, ''))
     AND (p_is_active IS NULL OR p_is_active = COALESCE(v_old_record.is_active, true)) THEN
    -- No change, return empty
    RETURN;
  END IF;
  
  -- Insert new record with updated values (SCD-2: don't update old, insert new)
  v_new_id := gen_random_uuid();
  
  INSERT INTO tcm_tally_cards (
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
    COALESCE(p_tally_card_number, v_old_record.tally_card_number),
    COALESCE(p_warehouse_id, v_old_record.warehouse_id),
    COALESCE(p_item_number, v_old_record.item_number),
    COALESCE(p_note, v_old_record.note),
    COALESCE(p_is_active, v_old_record.is_active),
    NOW()
  );
  
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
  FROM tcm_tally_cards t
  WHERE t.id = v_new_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fn_tally_card_patch_scd2(UUID, TEXT, UUID, BIGINT, TEXT, BOOLEAN) TO authenticated;

