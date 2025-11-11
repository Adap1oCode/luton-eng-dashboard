-- ============================================================================
-- Migration: Add helper RPC to load stock adjustment edit payload
-- Date:     2025-11-11
-- Purpose:  Provide a reusable, single-call lookup for edit screens that
--           resolves the latest SCD2 entry, associated warehouse, and the
--           current child locations.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_stock_adjustment_load_edit(p_id uuid)
RETURNS TABLE (
  entry_id uuid,
  tally_card_number text,
  warehouse_id uuid,
  locations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_anchor text;
  v_latest_entry uuid;
BEGIN
  -- Resolve the anchor tally card number for the provided entry id.
  SELECT e.tally_card_number
  INTO v_anchor
  FROM public.tcm_user_tally_card_entries e
  WHERE e.id = p_id;

  IF v_anchor IS NULL THEN
    RAISE EXCEPTION 'Stock adjustment % not found', p_id;
  END IF;

  -- Locate the latest SCD2 row for the anchor. Fallback to the provided id.
  SELECT e.id
  INTO v_latest_entry
  FROM public.tcm_user_tally_card_entries e
  WHERE e.tally_card_number = v_anchor
  ORDER BY e.updated_at DESC, e.id DESC
  LIMIT 1;

  IF v_latest_entry IS NULL THEN
    v_latest_entry := p_id;
  END IF;

  RETURN QUERY
  SELECT
    v_latest_entry,
    v_anchor,
    (
      SELECT COALESCE(tc_uid.warehouse_id, tc_num.warehouse_id)
      FROM public.tcm_user_tally_card_entries e
        LEFT JOIN public.tcm_tally_cards tc_uid ON tc_uid.card_uid = e.card_uid
        LEFT JOIN public.tcm_tally_cards tc_num
          ON e.card_uid IS NULL AND tc_num.tally_card_number = e.tally_card_number
      WHERE e.id = v_latest_entry
      LIMIT 1
    ) AS warehouse_id,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'id', l.id,
                   'entry_id', l.entry_id,
                   'location', l.location,
                   'qty', l.qty,
                   'pos', l.pos
                 )
                 ORDER BY COALESCE(l.pos, 32767), l.id
               )
        FROM public.tcm_user_tally_card_entry_locations l
        WHERE l.entry_id = v_latest_entry
      ),
      '[]'::jsonb
    ) AS locations;
END;
$function$;

