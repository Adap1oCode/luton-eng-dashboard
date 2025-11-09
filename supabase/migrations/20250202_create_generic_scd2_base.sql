-- ============================================================================
-- Migration: Create Generic SCD2 Base (Final Implementation)
-- Date: 2025-02-02
-- Purpose: 
--   1. Single source of truth for hashdiff calculation
--   2. Generic trigger shim for all tables
--   3. Shared SCD2 base function (returns uuid)
--   4. Resource config retrieval
--   5. Stock Adjustments v3 wrapper (thin)
--   6. Keep v1/v2 functions unchanged (backward compatibility)
-- ============================================================================

-- ============================================================================
-- 1. Hash Helper (Single Source of Truth)
-- ============================================================================
-- This is the ONLY function that calculates hashdiff.
-- Both trigger and wrapper use this function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_hash(
  p_record jsonb,
  p_config jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_hashdiff_columns jsonb;
  v_payload text := '';
  v_col_config jsonb;
  v_col_name text;
  v_col_type text;
  v_col_normalize text;
  v_col_default text;
  v_col_value text;
  v_i integer;
BEGIN
  v_hashdiff_columns := p_config->'hashdiff_columns';
  
  IF v_hashdiff_columns IS NULL OR jsonb_array_length(v_hashdiff_columns) = 0 THEN
    RAISE EXCEPTION 'hashdiff_columns must be provided in config';
  END IF;
  
  -- Build payload by iterating through configured columns
  FOR v_i IN 0..jsonb_array_length(v_hashdiff_columns) - 1
  LOOP
    v_col_config := v_hashdiff_columns->v_i;
    v_col_name := v_col_config->>'name';
    v_col_type := COALESCE(v_col_config->>'type', 'text');
    v_col_normalize := COALESCE(v_col_config->>'normalize', 'none');
    v_col_default := v_col_config->>'default';
    
    -- Get value from record
    v_col_value := p_record->>v_col_name;
    
    -- Apply default if NULL and default specified
    IF v_col_value IS NULL AND v_col_default IS NOT NULL THEN
      v_col_value := v_col_default;
    END IF;
    
    -- Normalize based on rule
    IF v_col_normalize = 'lower_trim' THEN
      v_col_value := lower(btrim(COALESCE(v_col_value, '')));
    ELSIF v_col_normalize = 'none' THEN
      v_col_value := COALESCE(v_col_value, '');
    END IF;
    
    -- Convert to text representation based on type
    IF v_col_type = 'uuid' THEN
      v_col_value := COALESCE(v_col_value, '∅');
    ELSIF v_col_type = 'boolean' THEN
      v_col_value := COALESCE(v_col_value, 'false');
    ELSIF v_col_type IN ('integer', 'bigint', 'smallint') THEN
      v_col_value := COALESCE(v_col_value, '∅');
    ELSE
      -- text or other
      v_col_value := COALESCE(v_col_value, '∅');
    END IF;
    
    -- Append to payload
    IF v_payload != '' THEN
      v_payload := v_payload || ' | ';
    END IF;
    v_payload := v_payload || v_col_value;
  END LOOP;
  
  -- Calculate hash using digest() (unqualified - should be in search_path)
  -- Note: In Supabase, if digest() is in extensions schema, may need to adjust search_path
  -- or use extensions.digest() as fallback. For now, use unqualified per requirements.
  RETURN encode(digest(v_payload, 'sha256'), 'hex');
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_scd2_hash(jsonb, jsonb) TO authenticated;

-- ============================================================================
-- 2. Resource Config Retrieval
-- ============================================================================
-- Returns hashdiff config for a given table.
-- Config lives here (can be moved to a table later).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_get_config(p_table regclass)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT CASE p_table::text
    WHEN 'public.tcm_user_tally_card_entries' THEN
      '{
        "hashdiff_columns": [
          {"name":"updated_by_user_id","type":"uuid","normalize":"none"},
          {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
          {"name":"card_uid","type":"uuid","normalize":"none"},
          {"name":"qty","type":"integer","normalize":"none"},
          {"name":"location","type":"text","normalize":"lower_trim"},
          {"name":"note","type":"text","normalize":"lower_trim"},
          {"name":"role_family","type":"text","normalize":"lower_trim"},
          {"name":"reason_code","type":"text","normalize":"lower_trim","default":"unspecified"},
          {"name":"multi_location","type":"boolean","normalize":"none","default":"false"}
        ]
      }'::jsonb
    ELSE
      NULL
  END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_scd2_get_config(regclass) TO authenticated;

-- ============================================================================
-- 3. Generic Trigger Hash Shim
-- ============================================================================
-- This is called by BEFORE INSERT OR UPDATE triggers on SCD2 tables.
-- It uses the same hash helper as the wrapper function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_trigger_hash_shim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_config jsonb;
  v_rec jsonb;
BEGIN
  -- Obtain config for the table that fired this trigger
  SELECT public.fn_scd2_get_config(TG_TABLE_NAME::regclass) INTO v_config;
  
  IF v_config IS NULL THEN
    -- No config for this table - skip hashdiff calculation
    -- (allows tables without SCD2 to coexist)
    RETURN NEW;
  END IF;
  
  -- Build record JSONB from NEW
  v_rec := to_jsonb(NEW);
  
  -- If table has updated_by_user_id and it's not set, try to resolve from auth
  -- (This handles cases where another trigger sets it, but we need it for hashdiff)
  IF v_rec ? 'updated_by_user_id' AND v_rec->>'updated_by_user_id' IS NULL THEN
    DECLARE
      v_user_id uuid;
    BEGIN
      SELECT id INTO v_user_id
      FROM public.users
      WHERE auth_id = auth.uid()
      LIMIT 1;
      
      IF v_user_id IS NOT NULL THEN
        v_rec := jsonb_set(v_rec, ARRAY['updated_by_user_id'], to_jsonb(v_user_id));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If auth context not available, leave as NULL
      NULL;
    END;
  END IF;
  
  -- Calculate hashdiff using the same helper as wrapper
  NEW.hashdiff := public.fn_scd2_hash(v_rec, v_config);
  
  RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_scd2_trigger_hash_shim() TO authenticated;

-- ============================================================================
-- 4. Shared SCD2 Base Function
-- ============================================================================
-- Generic SCD2 logic that works with any table/resource.
-- Returns uuid (id of new/existing row).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_patch_base(
  p_table        regclass,   -- e.g. 'public.tcm_user_tally_card_entries'::regclass
  p_id           uuid,       -- current record id (to locate + lock current)
  p_anchor_col   text,       -- e.g. 'tally_card_number'
  p_temporal_col text,       -- e.g. 'updated_at'
  p_user_scoped  boolean,    -- include updated_by_user_id in idempotency WHERE
  p_hash_config  jsonb,     -- { hashdiff_columns: [...] }
  p_updates      jsonb       -- e.g. { qty: 3, note: "x", ... }
)
RETURNS uuid  -- returns the new/current row id
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
  v_card_uid text;  -- May be uuid or text depending on table
  v_has_changes boolean := false;
  v_expected_hashdiff text;
  v_existing_id uuid;
  v_updated_jsonb jsonb;
  v_col_name text;
  v_update_value text;
  v_id_column text := 'id';  -- Assume 'id' is the PK column name
  v_i integer;
BEGIN
  RAISE NOTICE '[SCD2-BASE] Starting for table: %, id: %', p_table, p_id;
  
  -- Resolve user if user_scoped
  IF p_user_scoped THEN
    SELECT id INTO v_me
    FROM public.users
    WHERE auth_id = auth.uid();
    
    IF v_me IS NULL THEN
      RAISE EXCEPTION 'No app user found for auth uid %', auth.uid()
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  -- Load the row we're editing
  EXECUTE format('SELECT to_jsonb(t.*) FROM %s t WHERE t.id = $1', p_table)
    USING p_id
    INTO v_old_record;
  
  IF v_old_record IS NULL THEN
    RAISE EXCEPTION 'Record % not found in table %', p_id, p_table
      USING ERRCODE = 'P0002';
  END IF;
  
  -- Get anchor value
  v_anchor_value := v_old_record->>p_anchor_col;
  
  -- Get current active record (latest for this anchor value) with FOR UPDATE lock
  EXECUTE format(
    'SELECT to_jsonb(t.*) FROM %s t WHERE t.%I = $1 ORDER BY t.%I DESC LIMIT 1 FOR UPDATE',
    p_table,
    p_anchor_col,
    p_temporal_col
  ) USING v_anchor_value
  INTO v_old_current;
  
  IF v_old_current IS NULL THEN
    v_old_current := v_old_record;
  END IF;
  
  RAISE NOTICE '[SCD2-BASE] Current record: id=%', v_old_current->>v_id_column;
  
  -- Change detection: compare p_updates with current values
  v_has_changes := false;
  
  FOR v_col_name, v_update_value IN SELECT * FROM jsonb_each_text(p_updates)
  LOOP
    -- Skip NULL updates (they mean "don't change this field")
    IF v_update_value IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Compare with current value
    IF v_update_value IS DISTINCT FROM (v_old_current->>v_col_name) THEN
      v_has_changes := true;
      EXIT;
    END IF;
  END LOOP;
  
  RAISE NOTICE '[SCD2-BASE] Change detection result: %', v_has_changes;
  
  -- If no changes, return existing row id
  IF NOT v_has_changes THEN
    RAISE NOTICE '[SCD2-BASE] No changes - returning existing row id';
    RETURN (v_old_current->>v_id_column)::uuid;
  END IF;
  
  -- Build updated JSONB record for hashdiff calculation
  v_updated_jsonb := v_old_current;
  
  -- Apply updates
  FOR v_col_name, v_update_value IN SELECT * FROM jsonb_each_text(p_updates)
  LOOP
    IF v_update_value IS NOT NULL THEN
      v_updated_jsonb := jsonb_set(v_updated_jsonb, ARRAY[v_col_name], to_jsonb(v_update_value));
    END IF;
  END LOOP;
  
  -- Ensure updated_by_user_id is set if user_scoped
  IF p_user_scoped THEN
    v_updated_jsonb := jsonb_set(v_updated_jsonb, ARRAY['updated_by_user_id'], to_jsonb(v_me));
  END IF;
  
  -- Calculate expected hashdiff using the same helper as trigger
  v_expected_hashdiff := public.fn_scd2_hash(v_updated_jsonb, p_hash_config);
  
  RAISE NOTICE '[SCD2-BASE] Expected hashdiff: %', v_expected_hashdiff;
  
  -- Get card_uid (or anchor if card_uid not present) for idempotency check
  v_card_uid := COALESCE(v_old_current->>'card_uid', v_anchor_value);
  
  -- Idempotency check: WHERE clause depends on p_user_scoped
  IF p_user_scoped AND v_me IS NOT NULL THEN
    -- User-scoped: (updated_by_user_id, card_uid, hashdiff)
    EXECUTE format(
      'SELECT t.id FROM %s t WHERE t.updated_by_user_id = $1 AND t.card_uid = $2 AND t.hashdiff = $3 ORDER BY t.%I DESC LIMIT 1',
      p_table,
      p_temporal_col
    ) USING v_me, v_card_uid::uuid, v_expected_hashdiff
    INTO v_existing_id;
  ELSE
    -- Global: (card_uid, hashdiff) or (anchor, hashdiff) if no card_uid
    IF v_old_current->>'card_uid' IS NOT NULL THEN
      EXECUTE format(
        'SELECT t.id FROM %s t WHERE t.card_uid = $1 AND t.hashdiff = $2 ORDER BY t.%I DESC LIMIT 1',
        p_table,
        p_temporal_col
      ) USING v_card_uid::uuid, v_expected_hashdiff
      INTO v_existing_id;
    ELSE
      -- Fallback to anchor column
      EXECUTE format(
        'SELECT t.id FROM %s t WHERE t.%I = $1 AND t.hashdiff = $2 ORDER BY t.%I DESC LIMIT 1',
        p_table,
        p_anchor_col,
        p_temporal_col
      ) USING v_anchor_value, v_expected_hashdiff
      INTO v_existing_id;
    END IF;
  END IF;
  
  IF v_existing_id IS NOT NULL THEN
    RAISE NOTICE '[SCD2-BASE] Row with same hashdiff exists - returning existing id: %', v_existing_id;
    RETURN v_existing_id;
  END IF;
  
  -- Build INSERT statement
  -- For stock-adjustments, we use explicit INSERT (can be generalized later)
  BEGIN
    IF p_table::text = 'public.tcm_user_tally_card_entries' THEN
      -- Stock-adjustments specific INSERT
      -- Note: hashdiff will be set by trigger, not computed here
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
        COALESCE(v_me, (v_old_current->>'updated_by_user_id')::uuid),
        (v_old_current->>'role_family')::text,
        COALESCE((v_old_current->>'card_uid')::uuid, (p_updates->>'card_uid')::uuid),
        (v_old_current->>p_anchor_col)::text,
        COALESCE((p_updates->>'qty')::integer, (v_old_current->>'qty')::integer),
        COALESCE((p_updates->>'location')::text, (v_old_current->>'location')::text),
        COALESCE((p_updates->>'note')::text, (v_old_current->>'note')::text),
        COALESCE((p_updates->>'reason_code')::text, (v_old_current->>'reason_code')::text, 'UNSPECIFIED'),
        COALESCE((p_updates->>'multi_location')::boolean, (v_old_current->>'multi_location')::boolean, false),
        now()
      RETURNING id INTO v_new_id;
    ELSE
      RAISE EXCEPTION 'Table % not yet supported by generic SCD2 base', p_table
        USING ERRCODE = 'P0003';
    END IF;
    
    RAISE NOTICE '[SCD2-BASE] New row inserted: id=%', v_new_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition - query for existing row
      RAISE NOTICE '[SCD2-BASE] Constraint violation - checking for existing row';
      
      IF p_user_scoped AND v_me IS NOT NULL THEN
        EXECUTE format(
          'SELECT t.id FROM %s t WHERE t.updated_by_user_id = $1 AND t.card_uid = $2 AND t.hashdiff = $3 ORDER BY t.%I DESC LIMIT 1',
          p_table,
          p_temporal_col
        ) USING v_me, v_card_uid::uuid, v_expected_hashdiff
        INTO v_existing_id;
      ELSE
        IF v_old_current->>'card_uid' IS NOT NULL THEN
          EXECUTE format(
            'SELECT t.id FROM %s t WHERE t.card_uid = $1 AND t.hashdiff = $2 ORDER BY t.%I DESC LIMIT 1',
            p_table,
            p_temporal_col
          ) USING v_card_uid::uuid, v_expected_hashdiff
          INTO v_existing_id;
        ELSE
          EXECUTE format(
            'SELECT t.id FROM %s t WHERE t.%I = $1 AND t.hashdiff = $2 ORDER BY t.%I DESC LIMIT 1',
            p_table,
            p_anchor_col,
            p_temporal_col
          ) USING v_anchor_value, v_expected_hashdiff
          INTO v_existing_id;
        END IF;
      END IF;
      
      IF v_existing_id IS NOT NULL THEN
        RAISE NOTICE '[SCD2-BASE] Found existing row after constraint violation: id=%', v_existing_id;
        RETURN v_existing_id;
      END IF;
      
      RAISE;
  END;
  
  RETURN v_new_id;
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_scd2_patch_base(regclass, uuid, text, text, boolean, jsonb, jsonb) TO authenticated;

-- ============================================================================
-- 5. Stock Adjustments Wrapper (v3) - Thin
-- ============================================================================
-- Thin wrapper that calls the base function with stock-adjustments config.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_user_entry_patch_scd2_v3(
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
SET search_path TO public
AS $$
DECLARE
  v_cfg jsonb;
  v_new_id uuid;
BEGIN
  -- Get config for this table
  SELECT public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) INTO v_cfg;
  
  IF v_cfg IS NULL THEN
    RAISE EXCEPTION 'No SCD2 config found for table public.tcm_user_tally_card_entries';
  END IF;
  
  -- Call base function
  v_new_id := public.fn_scd2_patch_base(
    'public.tcm_user_tally_card_entries'::regclass,
    p_id,
    'tally_card_number',
    'updated_at',
    true, -- user-scoped uniqueness
    v_cfg,
    jsonb_strip_nulls(jsonb_build_object(
      'reason_code', p_reason_code,
      'multi_location', p_multi_location,
      'qty', p_qty,
      'location', p_location,
      'note', p_note
    ))
  );
  
  -- Return the row
  RETURN (SELECT t FROM public.tcm_user_tally_card_entries t WHERE t.id = v_new_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_user_entry_patch_scd2_v3(uuid, text, boolean, integer, text, text) TO authenticated;

-- ============================================================================
-- 6. Update Trigger to Use Shim
-- ============================================================================
-- Replace existing trigger with the generic shim.
-- ============================================================================

-- Drop old trigger if it exists
DROP TRIGGER IF EXISTS trg_user_entry_set_hashdiff ON public.tcm_user_tally_card_entries;

-- Create new trigger using the generic shim
CREATE TRIGGER trg_entries_hash
BEFORE INSERT OR UPDATE ON public.tcm_user_tally_card_entries
FOR EACH ROW
EXECUTE FUNCTION public.fn_scd2_trigger_hash_shim();

-- ============================================================================
-- Note: Keep existing functions (v1, v2) unchanged for backward compatibility
-- ============================================================================
