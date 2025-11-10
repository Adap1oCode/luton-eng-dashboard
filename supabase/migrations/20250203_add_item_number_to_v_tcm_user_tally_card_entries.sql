-- ============================================================================
-- Migration: Add item_number to v_tcm_user_tally_card_entries view
-- Date: 2025-02-03
-- Purpose: Add item_number column from v_tcm_tally_cards_current to the view for stock-adjustments screen
-- ============================================================================

-- NOTE: We need to drop the dependent materialized view first, then recreate it after
-- This is because PostgreSQL doesn't allow CREATE OR REPLACE VIEW when dependent objects exist

-- Step 1: Drop the materialized view that depends on this view
-- (We'll recreate it after updating the view)
DROP MATERIALIZED VIEW IF EXISTS public.mv_tcm_compare_stock CASCADE;

-- Step 2: Update view to include item_number from v_tcm_tally_cards_current
-- This preserves the existing complex CTE structure and adds item_number via LEFT JOIN
-- Column order doesn't matter - we're adding item_number after card_uid for logical grouping
CREATE OR REPLACE VIEW v_tcm_user_tally_card_entries AS
WITH base AS (
  SELECT 
    e.id,
    e.updated_by_user_id,
    u.full_name,
    e.role_family,
    e.tally_card_number,
    e.card_uid,
    e.qty,
    e.location,
    e.note,
    e.updated_at,
    to_char(e.updated_at, 'YYYY-MM-DD HH24:MI:SS'::text) AS updated_at_pretty,
    c_uid.warehouse_id AS wh_id_uid,
    c_uid.warehouse AS wh_uid,
    c_num.warehouse_id AS wh_id_num,
    c_num.warehouse AS wh_num,
    e.reason_code,
    e.multi_location
  FROM tcm_user_tally_card_entries e
    LEFT JOIN users u ON u.id = e.updated_by_user_id
    LEFT JOIN tcm_tally_cards c_uid ON c_uid.card_uid = e.card_uid
    LEFT JOIN tcm_tally_cards c_num ON e.card_uid IS NULL AND c_num.tally_card_number = e.tally_card_number
), unified AS (
  SELECT 
    b.id,
    b.updated_by_user_id,
    b.updated_by_user_id AS user_id,
    b.full_name,
    b.role_family,
    b.tally_card_number,
    b.card_uid,
    b.qty,
    b.location,
    b.note,
    b.updated_at,
    b.updated_at_pretty,
    COALESCE(b.wh_id_uid, b.wh_id_num) AS warehouse_id,
    COALESCE(b.wh_uid, b.wh_num) AS warehouse,
    COALESCE(b.card_uid::text, 'NUM:'::text || b.tally_card_number) AS card_key,
    b.reason_code,
    b.multi_location
  FROM base b
), ranked AS (
  SELECT 
    u.id,
    u.updated_by_user_id,
    u.user_id,
    u.full_name,
    u.role_family,
    u.tally_card_number,
    u.card_uid,
    u.qty,
    u.location,
    u.note,
    u.updated_at,
    u.updated_at_pretty,
    u.warehouse_id,
    u.warehouse,
    u.card_key,
    u.reason_code,
    u.multi_location,
    row_number() OVER (PARTITION BY u.role_family, u.card_key ORDER BY u.updated_at DESC, u.id DESC) AS rn
  FROM unified u
), child_agg AS (
  SELECT 
    l.entry_id,
    sum(l.qty) AS child_qty,
    string_agg(l.location, ', '::text ORDER BY (COALESCE(l.pos::integer, 32767))) AS child_locations_text
  FROM tcm_user_tally_card_entry_locations l
  GROUP BY l.entry_id
)
SELECT 
  r.id,
  r.updated_by_user_id,
  r.user_id,
  r.full_name,
  r.role_family,
  r.tally_card_number,
  r.card_uid,
  r.qty,
  r.location,
  r.note,
  r.updated_at,
  r.updated_at_pretty,
  r.warehouse_id,
  r.warehouse,
  r.reason_code,
  r.multi_location,
  CASE
    WHEN r.multi_location THEN COALESCE(ca.child_qty, 0::bigint)
    ELSE r.qty::bigint
  END AS effective_qty,
  CASE
    WHEN r.multi_location THEN COALESCE(ca.child_locations_text, r.location)
    ELSE r.location
  END AS effective_location,
  -- Add item_number at the end (column order doesn't matter in views)
  -- Join on card_uid first, then fallback to tally_card_number if card_uid is NULL
  COALESCE(tc_uid.item_number, tc_num.item_number) AS item_number
FROM ranked r
  LEFT JOIN child_agg ca ON ca.entry_id = r.id
  -- Join with v_tcm_tally_cards_current to get item_number
  -- Try card_uid first (most reliable)
  LEFT JOIN v_tcm_tally_cards_current tc_uid ON tc_uid.card_uid = r.card_uid
  -- Fallback to tally_card_number if card_uid is NULL
  LEFT JOIN v_tcm_tally_cards_current tc_num ON r.card_uid IS NULL AND tc_num.tally_card_number = r.tally_card_number
WHERE r.rn = 1;

-- Step 3: Recreate the materialized view mv_tcm_compare_stock
CREATE MATERIALIZED VIEW public.mv_tcm_compare_stock AS
WITH latest_so AS (
  SELECT 
    s.entry_id,
    s.tally_card_number,
    s.card_uid,
    s.updated_by_user_id,
    s.role_family,
    s.qty,
    s.location,
    s.effective_qty,
    s.effective_location,
    s.multi_location,
    s.updated_at,
    s.warehouse_id,
    s.rn
  FROM (
    SELECT 
      e.id AS entry_id,
      e.tally_card_number,
      e.card_uid,
      e.updated_by_user_id,
      e.role_family,
      e.qty,
      e.location,
      e.effective_qty,
      e.effective_location,
      e.multi_location,
      e.updated_at,
      e.warehouse_id,
      row_number() OVER (PARTITION BY e.tally_card_number ORDER BY e.updated_at DESC) AS rn
    FROM v_tcm_user_tally_card_entries e
    WHERE upper(e.role_family) = 'STORE_OFFICER'::text
  ) s
  WHERE s.rn = 1
), entry_locs AS (
  SELECT 
    l.entry_id,
    upper(btrim(l.location)) AS loc_up,
    (l.qty)::bigint AS loc_qty
  FROM tcm_user_tally_card_entry_locations l
), so_with_item AS (
  SELECT 
    s.entry_id,
    s.tally_card_number,
    s.card_uid,
    s.updated_by_user_id,
    s.role_family,
    s.qty,
    s.location,
    s.effective_qty,
    s.effective_location,
    s.multi_location,
    s.updated_at,
    s.warehouse_id,
    s.rn,
    tc.item_number,
    w.name AS warehouse_name
  FROM latest_so s
    LEFT JOIN tcm_tally_cards tc ON tc.card_uid = s.card_uid AND tc.is_active = true
    LEFT JOIN warehouses w ON w.id = s.warehouse_id
), so_detail_rows AS (
  SELECT 
    si.tally_card_number,
    si.item_number,
    si.warehouse_name,
    si.multi_location,
    el.loc_up AS so_location,
    el.loc_qty AS so_qty
  FROM so_with_item si
    JOIN entry_locs el ON el.entry_id = si.entry_id
), so_parent_fallback AS (
  SELECT 
    si.tally_card_number,
    si.item_number,
    si.warehouse_name,
    si.multi_location,
    upper(btrim(COALESCE(NULLIF(si.effective_location, ''::text), si.location))) AS so_location,
    COALESCE(si.effective_qty, (si.qty)::bigint) AS so_qty
  FROM so_with_item si
  WHERE NOT EXISTS (
    SELECT 1
    FROM entry_locs el
    WHERE el.entry_id = si.entry_id
  )
), so_rows AS (
  SELECT 
    so_detail_rows.tally_card_number,
    so_detail_rows.item_number,
    so_detail_rows.warehouse_name,
    so_detail_rows.multi_location,
    so_detail_rows.so_location,
    so_detail_rows.so_qty
  FROM so_detail_rows
  UNION ALL
  SELECT 
    so_parent_fallback.tally_card_number,
    so_parent_fallback.item_number,
    so_parent_fallback.warehouse_name,
    so_parent_fallback.multi_location,
    so_parent_fallback.so_location,
    so_parent_fallback.so_qty
  FROM so_parent_fallback
), so_rows_agg AS (
  SELECT 
    so_rows.tally_card_number,
    so_rows.item_number,
    so_rows.warehouse_name,
    so_rows.so_location,
    sum(so_rows.so_qty) AS so_qty,
    bool_or(COALESCE(so_rows.multi_location, false)) AS multi_location
  FROM so_rows
  GROUP BY so_rows.tally_card_number, so_rows.item_number, so_rows.warehouse_name, so_rows.so_location
), ims_rows AS (
  SELECT 
    i.item_number,
    i.warehouse AS ims_warehouse,
    upper(btrim(i.location)) AS ims_location,
    (i.total_available)::bigint AS ims_qty
  FROM v_inventory_current i
), ims_rows_agg AS (
  SELECT 
    ims_rows.item_number,
    ims_rows.ims_warehouse,
    ims_rows.ims_location,
    sum(ims_rows.ims_qty) AS ims_qty
  FROM ims_rows
  GROUP BY ims_rows.item_number, ims_rows.ims_warehouse, ims_rows.ims_location
), so_item_wh AS (
  SELECT DISTINCT 
    so_rows_agg.item_number,
    so_rows_agg.warehouse_name
  FROM so_rows_agg
), ims_item_wh AS (
  SELECT DISTINCT 
    ims_rows_agg.item_number,
    ims_rows_agg.ims_warehouse
  FROM ims_rows_agg
), matched AS (
  SELECT 
    so.tally_card_number,
    COALESCE(so.item_number, i.item_number) AS item_number,
    so.warehouse_name AS so_warehouse,
    i.ims_warehouse,
    so.so_location,
    i.ims_location,
    so.so_qty,
    i.ims_qty,
    COALESCE(so.multi_location, false) AS multi_location
  FROM so_rows_agg so
    FULL JOIN ims_rows_agg i ON i.item_number = so.item_number 
      AND i.ims_warehouse = so.warehouse_name 
      AND i.ims_location = so.so_location
), final_rows AS (
  SELECT 
    m.tally_card_number AS tally_card,
    m.item_number,
    COALESCE(m.so_warehouse, m.ims_warehouse) AS warehouse,
    m.so_location AS location,
    m.ims_location,
    m.so_qty,
    m.ims_qty,
    m.multi_location,
    (m.so_warehouse IS NOT NULL) AS has_so_wh,
    (m.ims_warehouse IS NOT NULL) AS has_ims_wh,
    EXISTS (
      SELECT 1
      FROM ims_item_wh x
      WHERE x.item_number = m.item_number 
        AND x.ims_warehouse = COALESCE(m.so_warehouse, m.ims_warehouse)
    ) AS ims_has_item_wh,
    EXISTS (
      SELECT 1
      FROM so_item_wh y
      WHERE y.item_number = m.item_number 
        AND y.warehouse_name = COALESCE(m.so_warehouse, m.ims_warehouse)
    ) AS so_has_item_wh
  FROM matched m
)
SELECT 
  md5(concat_ws('|'::text, 
    COALESCE(f.tally_card, ''::text), 
    COALESCE((f.item_number)::text, ''::text), 
    COALESCE(f.warehouse, ''::text), 
    COALESCE(COALESCE(f.location, f.ims_location), ''::text)
  )) AS row_key,
  f.tally_card,
  f.item_number,
  f.warehouse,
  f.location,
  f.ims_location,
  CASE
    WHEN f.so_qty IS NULL THEN '--'::text
    ELSE (f.so_qty)::text
  END AS so_qty,
  CASE
    WHEN f.ims_qty IS NULL THEN '--'::text
    ELSE (f.ims_qty)::text
  END AS ims_qty,
  CASE
    WHEN (f.so_qty IS NULL AND f.ims_qty IS NULL) THEN '--'::text
    ELSE
      CASE
        WHEN (COALESCE(f.so_qty, 0::numeric) - COALESCE(f.ims_qty, 0::numeric)) > 0::numeric 
          THEN ('+'::text || (COALESCE(f.so_qty, 0::numeric) - COALESCE(f.ims_qty, 0::numeric))::text)
        WHEN (COALESCE(f.so_qty, 0::numeric) - COALESCE(f.ims_qty, 0::numeric)) < 0::numeric 
          THEN (COALESCE(f.so_qty, 0::numeric) - COALESCE(f.ims_qty, 0::numeric))::text
        ELSE '0'::text
      END
  END AS qty_diff,
  f.multi_location,
  CASE
    WHEN (f.so_qty IS NOT NULL AND f.ims_qty IS NOT NULL) THEN
      CASE
        WHEN f.so_qty = f.ims_qty THEN 'Exact Match'::text
        ELSE 'Quantity Mismatch'::text
      END
    WHEN (f.so_qty IS NOT NULL AND f.ims_qty IS NULL) THEN
      CASE
        WHEN f.ims_has_item_wh THEN 'Location Mismatch'::text
        ELSE 'No Match'::text
      END
    WHEN (f.so_qty IS NULL AND f.ims_qty IS NOT NULL) THEN
      CASE
        WHEN f.so_has_item_wh THEN 'Location Mismatch'::text
        ELSE 'No Match'::text
      END
    ELSE 'No Match'::text
  END AS status
FROM final_rows f
ORDER BY f.tally_card, f.warehouse, f.location;

-- Step 4: Create index on row_key for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_tcm_compare_stock_row_key 
  ON public.mv_tcm_compare_stock (row_key);

-- Step 5: Grant SELECT permission to authenticated role
GRANT SELECT ON TABLE public.mv_tcm_compare_stock TO authenticated;

-- Step 6: Refresh the materialized view to populate it with data
REFRESH MATERIALIZED VIEW public.mv_tcm_compare_stock;
