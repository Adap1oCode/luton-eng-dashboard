-- ============================================================================
-- Migration: Update fn_user_entry_patch_scd2 to use updated_by_user_id
-- Date: 2025-01-28
-- Purpose: Fix RPC function to use updated_by_user_id instead of user_id
-- ============================================================================

-- Drop and recreate the function with updated column references
CREATE OR REPLACE FUNCTION fn_user_entry_patch_scd2(
  p_id UUID,
  p_qty NUMERIC DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  updated_by_user_id UUID,
  role_family TEXT,
  tally_card_number TEXT,
  card_uid UUID,
  qty NUMERIC,
  location TEXT,
  note TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_role_family TEXT;
  v_anchor_value TEXT;
  v_card_uid UUID;
  v_old_record RECORD;
  v_new_id UUID;
BEGIN
  -- Get current user from auth context (set by RLS/auth)
  v_current_user_id := auth.uid();
  
  -- Get role_family from current user's role
  SELECT r.role_family INTO v_current_role_family
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.auth_id = v_current_user_id
  LIMIT 1;
  
  -- Fetch current record to get anchor value and card_uid
  SELECT tally_card_number, card_uid INTO v_anchor_value, v_card_uid
  FROM tcm_user_tally_card_entries
  WHERE id = p_id
  LIMIT 1;
  
  IF v_anchor_value IS NULL THEN
    RAISE EXCEPTION 'Record not found or access denied';
  END IF;
  
  -- Get the current active record for comparison
  SELECT * INTO v_old_record
  FROM tcm_user_tally_card_entries
  WHERE tally_card_number = v_anchor_value
    AND is_current = true
  LIMIT 1;
  
  -- Check if any values actually changed
  IF (p_qty IS NULL OR p_qty = COALESCE(v_old_record.qty, 0))
     AND (p_location IS NULL OR p_location = COALESCE(v_old_record.location, ''))
     AND (p_note IS NULL OR p_note = COALESCE(v_old_record.note, '')) THEN
    -- No change, return empty
    RETURN;
  END IF;
  
  -- Mark old record as not current
  UPDATE tcm_user_tally_card_entries
  SET is_current = false,
      updated_at = NOW()
  WHERE id = p_id;
  
  -- Insert new record with updated values
  v_new_id := gen_random_uuid();
  
  INSERT INTO tcm_user_tally_card_entries (
    id,
    updated_by_user_id,  -- Changed from user_id to updated_by_user_id
    role_family,         -- Set from current user's role
    tally_card_number,
    card_uid,
    qty,
    location,
    note,
    is_current,
    updated_at
  ) VALUES (
    v_new_id,
    (SELECT app_user_id FROM users WHERE auth_id = v_current_user_id LIMIT 1), -- Get app_user_id (not auth_id)
    v_current_role_family,
    v_anchor_value,
    v_card_uid,
    COALESCE(p_qty, v_old_record.qty),
    COALESCE(p_location, v_old_record.location),
    COALESCE(p_note, v_old_record.note),
    true,
    NOW()
  );
  
  -- Return the new record
  RETURN QUERY
  SELECT
    t.id,
    t.updated_by_user_id,  -- Changed from user_id
    t.role_family,
    t.tally_card_number,
    t.card_uid,
    t.qty,
    t.location,
    t.note,
    t.updated_at
  FROM tcm_user_tally_card_entries t
  WHERE t.id = v_new_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fn_user_entry_patch_scd2(UUID, NUMERIC, TEXT, TEXT) TO authenticated;

