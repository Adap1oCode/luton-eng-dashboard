-- ============================================================================
-- SQL: Get Latest Parent Record and Latest Location Records
-- Entry ID: 0b45a7da-dded-4551-9c42-ae3c9d5351cc
-- ============================================================================

-- 1. Get the latest parent record for this entry_id
--    (Find the tally_card_number first, then get the latest entry for that tally_card_number)
WITH entry_info AS (
  SELECT tally_card_number
  FROM tcm_user_tally_card_entries
  WHERE id = '0b45a7da-dded-4551-9c42-ae3c9d5351cc'
)
SELECT 
  e.id,
  e.updated_by_user_id,
  e.role_family,
  e.tally_card_number,
  e.card_uid,
  e.qty,
  e.location,
  e.note,
  e.reason_code,
  e.multi_location,
  e.updated_at,
  e.hashdiff
FROM tcm_user_tally_card_entries e
INNER JOIN entry_info ei ON e.tally_card_number = ei.tally_card_number
ORDER BY e.updated_at DESC, e.id DESC
LIMIT 1;

-- Alternative: Using the view (which already shows latest per tally_card_number)
SELECT 
  id,
  updated_by_user_id,
  user_id,
  full_name,
  role_family,
  tally_card_number,
  card_uid,
  qty,
  location,
  note,
  reason_code,
  multi_location,
  updated_at,
  updated_at_pretty,
  warehouse_id,
  warehouse
FROM v_tcm_user_tally_card_entries
WHERE id IN (
  -- Get the latest entry_id for this tally_card_number
  SELECT id
  FROM tcm_user_tally_card_entries
  WHERE tally_card_number = (
    SELECT tally_card_number
    FROM tcm_user_tally_card_entries
    WHERE id = '0b45a7da-dded-4551-9c42-ae3c9d5351cc'
  )
  ORDER BY updated_at DESC, id DESC
  LIMIT 1
);

-- 2. Get the latest location records for the latest parent entry
--    First, find the latest parent entry_id, then get locations for that entry_id
WITH latest_parent AS (
  SELECT 
    e.id as latest_entry_id,
    e.tally_card_number
  FROM tcm_user_tally_card_entries e
  WHERE e.tally_card_number = (
    SELECT tally_card_number
    FROM tcm_user_tally_card_entries
    WHERE id = '0b45a7da-dded-4551-9c42-ae3c9d5351cc'
  )
  ORDER BY e.updated_at DESC, e.id DESC
  LIMIT 1
)
SELECT 
  l.id,
  l.entry_id,
  l.location,
  l.qty,
  l.pos
FROM tcm_user_tally_card_entry_locations l
INNER JOIN latest_parent lp ON l.entry_id = lp.latest_entry_id
ORDER BY COALESCE(l.pos, 32767), l.location;

-- 3. Combined query: Get latest parent + latest locations in one result
WITH latest_parent AS (
  SELECT 
    e.id as latest_entry_id,
    e.tally_card_number,
    e.updated_by_user_id,
    e.role_family,
    e.card_uid,
    e.qty,
    e.location,
    e.note,
    e.reason_code,
    e.multi_location,
    e.updated_at,
    e.hashdiff
  FROM tcm_user_tally_card_entries e
  WHERE e.tally_card_number = (
    SELECT tally_card_number
    FROM tcm_user_tally_card_entries
    WHERE id = '0b45a7da-dded-4551-9c42-ae3c9d5351cc'
  )
  ORDER BY e.updated_at DESC, e.id DESC
  LIMIT 1
)
SELECT 
  'parent' as record_type,
  lp.latest_entry_id as id,
  lp.tally_card_number,
  lp.qty,
  lp.location,
  lp.multi_location,
  lp.updated_at,
  NULL::text as child_location,
  NULL::integer as child_qty,
  NULL::smallint as child_pos
FROM latest_parent lp

UNION ALL

SELECT 
  'location' as record_type,
  lp.latest_entry_id as id,
  lp.tally_card_number,
  NULL::integer as qty,
  NULL::text as location,
  NULL::boolean as multi_location,
  NULL::timestamp with time zone as updated_at,
  l.location as child_location,
  l.qty as child_qty,
  l.pos as child_pos
FROM latest_parent lp
INNER JOIN tcm_user_tally_card_entry_locations l ON l.entry_id = lp.latest_entry_id
ORDER BY record_type, COALESCE(child_pos, 32767), child_location;

-- 4. Simple version: Just get the latest entry_id and its locations
--    (Most useful for debugging)
SELECT 
  'Latest Entry ID:' as label,
  id::text as value
FROM tcm_user_tally_card_entries
WHERE tally_card_number = (
  SELECT tally_card_number
  FROM tcm_user_tally_card_entries
  WHERE id = '0b45a7da-dded-4551-9c42-ae3c9d5351cc'
)
ORDER BY updated_at DESC, id DESC
LIMIT 1;

-- Then use that entry_id to get locations:
-- SELECT * FROM tcm_user_tally_card_entry_locations 
-- WHERE entry_id = '<latest_entry_id_from_above>'
-- ORDER BY COALESCE(pos, 32767), location;

