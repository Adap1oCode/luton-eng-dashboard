-- ============================================================================
-- Migration: Add Reason Code and Multi-Location Support
-- Date: 2025-01-30
-- Purpose: Update view, add RLS policies for child table, update RPC function
-- ============================================================================

-- 1. Update view to include reason_code and multi_location
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
  SELECT DISTINCT ON (e.tally_card_number)
    e.*
  FROM tcm_user_tally_card_entries e
  ORDER BY e.tally_card_number, e.updated_at DESC
) e
LEFT JOIN users u ON e.updated_by_user_id = u.app_user_id
LEFT JOIN tcm_tally_cards tc ON e.card_uid = tc.card_uid
LEFT JOIN warehouses w ON tc.warehouse_id = w.id;

-- 2. RLS Policies for child table
-- Allow users to manage locations for entries they can edit (mirror parent table RLS)
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

-- 3. Update RPC function to handle new fields and child rows
CREATE OR REPLACE FUNCTION fn_user_entry_patch_scd2(
  p_id UUID,
  p_reason_code TEXT DEFAULT NULL,
  p_multi_location BOOLEAN DEFAULT NULL,
  p_qty NUMERIC DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_locations JSONB DEFAULT NULL
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
  reason_code TEXT,
  multi_location BOOLEAN,
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
  loc JSONB;
  v_pos SMALLINT;
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
  -- Include new fields in comparison
  IF (p_qty IS NULL OR p_qty = COALESCE(v_old_record.qty, 0))
     AND (p_location IS NULL OR p_location = COALESCE(v_old_record.location, ''))
     AND (p_note IS NULL OR p_note = COALESCE(v_old_record.note, ''))
     AND (p_reason_code IS NULL OR p_reason_code = COALESCE(v_old_record.reason_code, 'UNSPECIFIED'))
     AND (p_multi_location IS NULL OR p_multi_location = COALESCE(v_old_record.multi_location, false))
     AND (p_locations IS NULL) THEN
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
    updated_by_user_id,
    role_family,
    tally_card_number,
    card_uid,
    qty,
    location,
    note,
    reason_code,
    multi_location,
    is_current,
    updated_at
  ) VALUES (
    v_new_id,
    (SELECT app_user_id FROM users WHERE auth_id = v_current_user_id LIMIT 1),
    v_current_role_family,
    v_anchor_value,
    v_card_uid,
    COALESCE(p_qty, v_old_record.qty),
    COALESCE(p_location, v_old_record.location),
    COALESCE(p_note, v_old_record.note),
    COALESCE(p_reason_code, v_old_record.reason_code, 'UNSPECIFIED'),
    COALESCE(p_multi_location, v_old_record.multi_location, false),
    true,
    NOW()
  );
  
  -- If multi_location=true, handle child rows
  IF COALESCE(p_multi_location, v_old_record.multi_location, false) = true AND p_locations IS NOT NULL THEN
    -- Delete old child rows for this entry (by entry_id from old record)
    DELETE FROM tcm_user_tally_card_entry_locations
    WHERE entry_id IN (
      SELECT id FROM tcm_user_tally_card_entries
      WHERE tally_card_number = v_anchor_value
    );
    
    -- Insert new child rows
    v_pos := 0;
    FOR loc IN SELECT * FROM jsonb_array_elements(p_locations)
    LOOP
      v_pos := v_pos + 1;
      INSERT INTO tcm_user_tally_card_entry_locations (
        entry_id,
        location,
        qty,
        pos
      ) VALUES (
        v_new_id,
        loc->>'location',
        (loc->>'qty')::integer,
        COALESCE((loc->>'pos')::smallint, v_pos)
      );
    END LOOP;
  ELSIF COALESCE(p_multi_location, v_old_record.multi_location, false) = false THEN
    -- If switching from multi to single, delete any existing child rows
    DELETE FROM tcm_user_tally_card_entry_locations
    WHERE entry_id IN (
      SELECT id FROM tcm_user_tally_card_entries
      WHERE tally_card_number = v_anchor_value
    );
  END IF;
  
  -- Return the new record
  RETURN QUERY
  SELECT
    t.id,
    t.updated_by_user_id,
    t.role_family,
    t.tally_card_number,
    t.card_uid,
    t.qty,
    t.location,
    t.note,
    t.reason_code,
    t.multi_location,
    t.updated_at
  FROM tcm_user_tally_card_entries t
  WHERE t.id = v_new_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fn_user_entry_patch_scd2(UUID, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT, JSONB) TO authenticated;

