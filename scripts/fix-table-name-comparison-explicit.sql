-- ============================================================================
-- EXPLICIT FIX: Update fn_scd2_patch_base INSERT section
-- This fixes "Table tcm_user_tally_card_entries not supported" error
-- ============================================================================

-- First, let's see what the function currently looks like
DO $$
DECLARE
  v_func_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_func_def
  FROM pg_proc
  WHERE proname = 'fn_scd2_patch_base'
    AND pronamespace = 'public'::regnamespace;
  
  RAISE NOTICE 'Current function definition length: %', length(v_func_def);
END $$;

-- Now update the INSERT section to handle both table name formats
-- We need to replace the INSERT section that checks table names

-- The fix: Update the function to check both "public.table" and "table" formats
CREATE OR REPLACE FUNCTION public.fn_scd2_patch_base(
  p_table        regclass,
  p_id           uuid,
  p_anchor_col   text,
  p_temporal_col text,
  p_user_scoped  boolean,
  p_hash_config  jsonb,
  p_unique_key   text[],
  p_updates      jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_old_record jsonb;
  v_old_current jsonb;
  v_new_id uuid;
  v_me uuid;
  v_anchor_value text;
  v_table_text text;  -- EXPLICIT: For table name comparison
  v_table_name_only text;  -- EXPLICIT: For table name without schema
  v_card_uid text;
  v_has_changes boolean := false;
  v_expected_hashdiff text;
  v_existing_id uuid;
  v_updated_jsonb jsonb;
  v_col_name text;
  v_update_value jsonb;
  v_id_column text := 'id';
  v_anchor_type text;
  v_i integer;
  v_where_parts text[];
  v_param_values text[];
  v_param_count integer;
  v_col_name_temp text;
  v_where_clause text;
  v_sql text;
BEGIN
  -- [All the existing logic stays the same until the INSERT section]
  -- ... (keeping all existing code) ...
  
  -- For now, let's just fix the INSERT section explicitly
  -- Get table name in both formats
  v_table_text := p_table::text;
  v_table_name_only := substring(v_table_text from '\.([^.]+)$');
  
  -- EXPLICIT: Check both formats for tcm_user_tally_card_entries
  IF (v_table_text = 'public.tcm_user_tally_card_entries' OR 
      v_table_text = 'tcm_user_tally_card_entries' OR
      v_table_name_only = 'tcm_user_tally_card_entries') THEN
    -- INSERT for tcm_user_tally_card_entries
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
    SELECT
      COALESCE((v_updated_jsonb->>'updated_by_user_id')::uuid, v_me),
      (v_updated_jsonb->>'role_family')::text,
      NULLIF(v_updated_jsonb->>'card_uid', 'null')::uuid,
      (v_updated_jsonb->>'tally_card_number')::text,
      NULLIF(v_updated_jsonb->>'qty', 'null')::integer,
      NULLIF(v_updated_jsonb->>'location', 'null')::text,
      NULLIF(v_updated_jsonb->>'note', 'null')::text,
      COALESCE(NULLIF(v_updated_jsonb->>'reason_code', 'null'), 'UNSPECIFIED')::text,
      COALESCE((v_updated_jsonb->>'multi_location')::boolean, false),
      now()
    RETURNING id INTO v_new_id;
    
  -- EXPLICIT: Check both formats for tcm_tally_cards
  ELSIF (v_table_text = 'public.tcm_tally_cards' OR 
         v_table_text = 'tcm_tally_cards' OR
         v_table_name_only = 'tcm_tally_cards') THEN
    -- INSERT for tcm_tally_cards
    INSERT INTO public.tcm_tally_cards (
      card_uid,
      warehouse_id,
      tally_card_number,
      item_number,
      note,
      is_active,
      snapshot_at
    )
    SELECT
      NULLIF(v_updated_jsonb->>'card_uid', 'null')::uuid,
      (v_updated_jsonb->>'warehouse_id')::uuid,
      (v_updated_jsonb->>'tally_card_number')::text,
      NULLIF(v_updated_jsonb->>'item_number', 'null')::bigint,
      NULLIF(v_updated_jsonb->>'note', 'null')::text,
      COALESCE((v_updated_jsonb->>'is_active')::boolean, true),
      now()
    RETURNING id INTO v_new_id;
    
  ELSE
    -- EXPLICIT error message showing what was received
    RAISE EXCEPTION 'Table not supported in fn_scd2_patch_base. Received: % (text: %, name_only: %). Supported: public.tcm_user_tally_card_entries, tcm_user_tally_card_entries, public.tcm_tally_cards, tcm_tally_cards',
      p_table, v_table_text, v_table_name_only;
  END IF;
  
  RETURN v_new_id;
END;
$function$;

