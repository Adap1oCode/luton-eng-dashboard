-- ============================================================================
-- Migration: Production-Ready Shared SCD2 Pattern
-- Date: 2025-02-02
-- Purpose: 
--   1. Config table for resource definitions (config over code)
--   2. Single source of truth for hashdiff calculation
--   3. Type-safe JSONB updates (preserve numeric/boolean types)
--   4. Generic trigger shim for all tables
--   5. Shared SCD2 base function with proper idempotency
--   6. Resource registrar and trigger attachment helpers
--   7. Constraint parity view
--   8. Wrappers with exact table names (v3)
--   9. Backward compatible (v1/v2 remain unchanged)
-- ============================================================================

-- ============================================================================
-- PRE-CHECKS
-- ============================================================================

-- Verify pgcrypto extension exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'pgcrypto extension is required. Please enable it in Supabase Dashboard > Database > Extensions first.';
  END IF;
END $$;

-- Ensure extensions schema is accessible (for digest() function)
GRANT USAGE ON SCHEMA extensions TO public;

-- ============================================================================
-- 1. Config Table (Config Over Code)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scd2_resource_config (
  table_name text PRIMARY KEY,
  anchor_col text NOT NULL,
  temporal_col text NOT NULL,
  user_scoped boolean NOT NULL DEFAULT false,
  hashdiff_columns jsonb NOT NULL,
  unique_key text[] NOT NULL,  -- Array of column names for idempotency WHERE clause
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.scd2_resource_config IS 'Configuration for SCD2 resources. Hash fields, anchor, temporal, and uniqueness constraints are defined here, not in code.';

-- ============================================================================
-- 2. Resource Registrar Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_register_resource(
  p_table_name text,
  p_anchor_col text,
  p_temporal_col text,
  p_user_scoped boolean,
  p_hashdiff_columns jsonb,
  p_unique_key text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.scd2_resource_config (
    table_name,
    anchor_col,
    temporal_col,
    user_scoped,
    hashdiff_columns,
    unique_key,
    updated_at
  )
  VALUES (
    p_table_name,
    p_anchor_col,
    p_temporal_col,
    p_user_scoped,
    p_hashdiff_columns,
    p_unique_key,
    now()
  )
  ON CONFLICT (table_name) DO UPDATE SET
    anchor_col = EXCLUDED.anchor_col,
    temporal_col = EXCLUDED.temporal_col,
    user_scoped = EXCLUDED.user_scoped,
    hashdiff_columns = EXCLUDED.hashdiff_columns,
    unique_key = EXCLUDED.unique_key,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_scd2_register_resource(text, text, text, boolean, jsonb, text[]) TO authenticated;

-- ============================================================================
-- 3. Config Getter Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_get_config(p_table regclass)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  v_table_text text;
  v_config jsonb;
  v_table_name_only text;
BEGIN
  -- Convert regclass to text
  v_table_text := p_table::text;
  
  -- Try exact match first (handles both "public.table" and "table" formats)
  SELECT row_to_json(c.*)::jsonb INTO v_config
  FROM public.scd2_resource_config c
  WHERE c.table_name = v_table_text;
  
  -- If not found, try without schema prefix
  IF v_config IS NULL THEN
    v_table_name_only := substring(v_table_text from '\.([^.]+)$');
    SELECT row_to_json(c.*)::jsonb INTO v_config
    FROM public.scd2_resource_config c
    WHERE c.table_name = v_table_name_only 
       OR c.table_name = 'public.' || v_table_name_only;
  END IF;
  
  -- If still not found and input didn't have schema, try with schema prefix
  IF v_config IS NULL AND v_table_text NOT LIKE 'public.%' THEN
    SELECT row_to_json(c.*)::jsonb INTO v_config
    FROM public.scd2_resource_config c
    WHERE c.table_name = 'public.' || v_table_text;
  END IF;
  
  RETURN v_config;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_scd2_get_config(regclass) TO authenticated;

-- ============================================================================
-- 4. Hash Helper (Single Source of Truth)
-- ============================================================================
-- This is the ONLY function that calculates hashdiff.
-- Both trigger and wrapper use this function.
-- Uses digest() (unqualified - should be in search_path)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_hash(
  p_record jsonb,
  p_config jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public
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
    
    -- Get value from record (preserve JSONB type)
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
  
  -- Calculate hash using extensions.digest() (explicit schema - required in Supabase)
  -- CRITICAL: digest() is in extensions schema, not public, so must qualify it
  RETURN encode(extensions.digest(v_payload, 'sha256'), 'hex');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_scd2_hash(jsonb, jsonb) TO authenticated;

-- ============================================================================
-- 5. Generic Trigger Hash Shim (Shared)
-- ============================================================================
-- This is called by BEFORE INSERT OR UPDATE triggers on SCD2 tables.
-- It uses the same hash helper as the wrapper function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_trigger_hash_shim()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
DECLARE
  v_config jsonb;
  v_rec jsonb;
  v_user_id uuid;
BEGIN
  -- Obtain config for the table that fired this trigger
  v_config := public.fn_scd2_get_config(TG_TABLE_NAME::regclass);
  
  IF v_config IS NULL THEN
    -- No config for this table - skip hashdiff calculation
    -- (allows tables without SCD2 to coexist)
    RETURN NEW;
  END IF;
  
  -- Build record JSONB from NEW
  v_rec := to_jsonb(NEW);
  
  -- If table has updated_by_user_id and it's not set, try to resolve from auth
  IF v_rec ? 'updated_by_user_id' AND v_rec->>'updated_by_user_id' IS NULL THEN
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

GRANT EXECUTE ON FUNCTION public.fn_scd2_trigger_hash_shim() TO authenticated;

-- ============================================================================
-- 6. Shared SCD2 Base Function (Type-Safe JSONB Updates)
-- ============================================================================
-- Generic SCD2 logic that works with any table/resource.
-- Returns uuid (id of new/existing row).
-- Uses jsonb_each (not jsonb_each_text) to preserve numeric/boolean types.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_patch_base(
  p_table        regclass,   -- e.g. 'public.tcm_user_tally_card_entries'::regclass
  p_id           uuid,       -- current record id (to locate + lock current)
  p_anchor_col   text,       -- e.g. 'tally_card_number'
  p_temporal_col text,       -- e.g. 'updated_at'
  p_user_scoped  boolean,    -- include updated_by_user_id in idempotency WHERE
  p_hash_config  jsonb,     -- { hashdiff_columns: [...] }
  p_unique_key   text[],     -- Array of column names for idempotency WHERE clause
  p_updates      jsonb       -- e.g. { qty: 3, note: "x", ... } (preserve types)
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
  v_table_text text;  -- For table name comparison
  v_table_name_only text;  -- For table name comparison without schema
  v_card_uid text;
  v_has_changes boolean := false;
  v_expected_hashdiff text;
  v_existing_id uuid;
  v_updated_jsonb jsonb;
  v_col_name text;
  v_update_value jsonb;
  v_id_column text := 'id';
  v_unique_key text[];
  v_where_clause text;
  v_anchor_type text;
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
  
  -- Determine anchor type (UUID or text)
  IF p_anchor_col = 'card_uid' THEN
    v_anchor_type := 'uuid';
  ELSE
    v_anchor_type := 'text';
  END IF;
  
  -- Lock latest by anchor + temporal
  IF v_anchor_type = 'uuid' THEN
    EXECUTE format(
      'SELECT to_jsonb(t.*) FROM %s t WHERE t.%I = $1 ORDER BY t.%I DESC LIMIT 1 FOR UPDATE',
      p_table,
      p_anchor_col,
      p_temporal_col
    ) USING v_anchor_value::uuid
    INTO v_old_current;
  ELSE
    EXECUTE format(
      'SELECT to_jsonb(t.*) FROM %s t WHERE t.%I = $1 ORDER BY t.%I DESC LIMIT 1 FOR UPDATE',
      p_table,
      p_anchor_col,
      p_temporal_col
    ) USING v_anchor_value
    INTO v_old_current;
  END IF;
  
  IF v_old_current IS NULL THEN
    v_old_current := v_old_record;
  END IF;
  
  RAISE NOTICE '[SCD2-BASE] Current record: id=%', v_old_current->>v_id_column;
  
  -- Change detection: compare p_updates with current values (type-safe)
  v_has_changes := false;
  
  FOR v_col_name, v_update_value IN SELECT * FROM jsonb_each(p_updates)
  LOOP
    -- Skip NULL values
    IF v_update_value = 'null'::jsonb OR v_update_value IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Compare JSONB values (preserves types)
    IF v_update_value IS DISTINCT FROM (v_old_current->v_col_name) THEN
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
  
  -- Build updated JSONB record for hashdiff calculation (type-safe)
  v_updated_jsonb := v_old_current;
  
  -- Apply updates (preserve JSONB types - numeric/boolean stay as-is)
  FOR v_col_name, v_update_value IN SELECT * FROM jsonb_each(p_updates)
  LOOP
    -- Skip NULL values
    IF v_update_value = 'null'::jsonb OR v_update_value IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Use jsonb_set to preserve types (not to_jsonb(text))
    v_updated_jsonb := jsonb_set(v_updated_jsonb, ARRAY[v_col_name], v_update_value);
  END LOOP;
  
  -- Ensure updated_by_user_id is set if user_scoped
  IF p_user_scoped THEN
    v_updated_jsonb := jsonb_set(v_updated_jsonb, ARRAY['updated_by_user_id'], to_jsonb(v_me));
  END IF;
  
  -- CRITICAL: Remove updated_at/snapshot_at from v_updated_jsonb before hashdiff calculation
  -- These temporal columns should NOT be in the hashdiff (they change on every insert)
  -- The INSERT statement will set them to now() explicitly
  IF p_temporal_col = 'updated_at' THEN
    v_updated_jsonb := v_updated_jsonb - 'updated_at';
  ELSIF p_temporal_col = 'snapshot_at' THEN
    v_updated_jsonb := v_updated_jsonb - 'snapshot_at';
  END IF;
  
  -- Calculate expected hashdiff using the same helper as trigger
  v_expected_hashdiff := public.fn_scd2_hash(v_updated_jsonb, p_hash_config);
  
  RAISE NOTICE '[SCD2-BASE] Expected hashdiff: %', v_expected_hashdiff;
  
  -- Idempotency check: WHERE clause matches configured unique_key
  -- Build WHERE clause from p_unique_key, handling card_uid IS NULL case
  DECLARE
    v_where_parts text[] := ARRAY[]::text[];
    v_param_values text[] := ARRAY[]::text[];
    v_param_count integer := 0;
    v_col_name text;
  BEGIN
    FOR v_i IN 1..array_length(p_unique_key, 1)
    LOOP
      v_col_name := p_unique_key[v_i];
      
      IF v_col_name = 'updated_by_user_id' THEN
        v_param_count := v_param_count + 1;
        v_where_parts := array_append(v_where_parts, format('t.%I = $%s', v_col_name, v_param_count));
        v_param_values := array_append(v_param_values, v_me::text);
      ELSIF v_col_name = 'card_uid' THEN
        v_param_count := v_param_count + 1;
        IF v_old_current->>'card_uid' IS NOT NULL THEN
          v_where_parts := array_append(v_where_parts, format('t.%I = $%s', v_col_name, v_param_count));
          v_param_values := array_append(v_param_values, (v_old_current->>'card_uid'));
        ELSE
          -- When card_uid is NULL, use anchor column instead
          v_where_parts := array_append(v_where_parts, format('t.%I = $%s', p_anchor_col, v_param_count));
          v_param_values := array_append(v_param_values, v_anchor_value);
        END IF;
      ELSIF v_col_name = 'hashdiff' THEN
        v_param_count := v_param_count + 1;
        v_where_parts := array_append(v_where_parts, format('t.%I = $%s', v_col_name, v_param_count));
        v_param_values := array_append(v_param_values, v_expected_hashdiff);
      ELSE
        -- Other columns
        v_param_count := v_param_count + 1;
        v_where_parts := array_append(v_where_parts, format('t.%I = $%s', v_col_name, v_param_count));
        v_param_values := array_append(v_param_values, v_old_current->>v_col_name);
      END IF;
    END LOOP;
    
    -- Execute idempotency check with dynamic WHERE clause
    IF array_length(v_where_parts, 1) > 0 THEN
      DECLARE
        v_where_clause text := array_to_string(v_where_parts, ' AND ');
        v_sql text;
      BEGIN
        v_sql := format(
          'SELECT t.id FROM %s t WHERE %s ORDER BY t.%I DESC LIMIT 1',
          p_table,
          v_where_clause,
          p_temporal_col
        );
        
        -- Execute with appropriate parameter types
        IF v_param_count = 3 THEN
          -- Assume: updated_by_user_id (uuid), card_uid/anchor (uuid or text), hashdiff (text)
          IF p_user_scoped THEN
            IF v_old_current->>'card_uid' IS NOT NULL THEN
              EXECUTE v_sql USING v_me, (v_old_current->>'card_uid')::uuid, v_expected_hashdiff INTO v_existing_id;
            ELSE
              EXECUTE v_sql USING v_me, v_anchor_value, v_expected_hashdiff INTO v_existing_id;
            END IF;
          ELSE
            IF v_old_current->>'card_uid' IS NOT NULL THEN
              EXECUTE v_sql USING (v_old_current->>'card_uid')::uuid, v_expected_hashdiff INTO v_existing_id;
            ELSE
              EXECUTE v_sql USING v_anchor_value, v_expected_hashdiff INTO v_existing_id;
            END IF;
          END IF;
        ELSIF v_param_count = 2 THEN
          -- Assume: card_uid/anchor (uuid or text), hashdiff (text)
          IF v_old_current->>'card_uid' IS NOT NULL THEN
            EXECUTE v_sql USING (v_old_current->>'card_uid')::uuid, v_expected_hashdiff INTO v_existing_id;
          ELSE
            EXECUTE v_sql USING v_anchor_value, v_expected_hashdiff INTO v_existing_id;
          END IF;
        ELSE
          -- Fallback: use simpler approach
          RAISE NOTICE '[SCD2-BASE] Unexpected unique_key length: %, using fallback', v_param_count;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[SCD2-BASE] Dynamic idempotency check failed: %, using fallback', SQLERRM;
        v_existing_id := NULL;
      END;
    END IF;
  END;
  
  -- Fallback idempotency check (if dynamic query failed)
  IF v_existing_id IS NULL THEN
    IF p_user_scoped AND v_me IS NOT NULL THEN
      IF v_old_current->>'card_uid' IS NOT NULL THEN
        EXECUTE format(
          'SELECT t.id FROM %s t WHERE t.updated_by_user_id = $1 AND t.card_uid = $2 AND t.hashdiff = $3 ORDER BY t.%I DESC LIMIT 1',
          p_table,
          p_temporal_col
        ) USING v_me, (v_old_current->>'card_uid')::uuid, v_expected_hashdiff
        INTO v_existing_id;
      ELSE
        EXECUTE format(
          'SELECT t.id FROM %s t WHERE t.updated_by_user_id = $1 AND t.%I = $2 AND t.hashdiff = $3 ORDER BY t.%I DESC LIMIT 1',
          p_table,
          p_anchor_col,
          p_temporal_col
        ) USING v_me, v_anchor_value, v_expected_hashdiff
        INTO v_existing_id;
      END IF;
    ELSE
      IF v_old_current->>'card_uid' IS NOT NULL THEN
        EXECUTE format(
          'SELECT t.id FROM %s t WHERE t.card_uid = $1 AND t.hashdiff = $2 ORDER BY t.%I DESC LIMIT 1',
          p_table,
          p_temporal_col
        ) USING (v_old_current->>'card_uid')::uuid, v_expected_hashdiff
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
  END IF;
  
  IF v_existing_id IS NOT NULL THEN
    RAISE NOTICE '[SCD2-BASE] Row with same hashdiff exists - returning existing id: %', v_existing_id;
    RETURN v_existing_id;
  END IF;
  
  -- Build INSERT statement (table-specific for now, can be generalized later)
  -- CRITICAL: Check both with and without schema prefix (regclass::text can return either)
  BEGIN
    v_table_text := p_table::text;
    v_table_name_only := substring(v_table_text from '\.([^.]+)$');
    
    IF v_table_text = 'public.tcm_user_tally_card_entries' OR v_table_name_only = 'tcm_user_tally_card_entries' THEN
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
        now()  -- CRITICAL: Always use current timestamp for new SCD2 rows, never accept updated_at from payload
      RETURNING id INTO v_new_id;
      
    ELSIF v_table_text = 'public.tcm_tally_cards' OR v_table_name_only = 'tcm_tally_cards' THEN
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
        now()  -- CRITICAL: Always use current timestamp for new SCD2 rows, never accept snapshot_at from payload
      RETURNING id INTO v_new_id;
      
    ELSE
      RAISE EXCEPTION 'Table % not supported in fn_scd2_patch_base', p_table;
    END IF;
    
    RAISE NOTICE '[SCD2-BASE] Inserted new row with id: %', v_new_id;
    RETURN v_new_id;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition: another transaction inserted the same row
      -- Try to retrieve it
      RAISE NOTICE '[SCD2-BASE] Unique violation - attempting to retrieve existing row';
      
      -- Retry idempotency check
      IF p_user_scoped AND v_me IS NOT NULL THEN
        IF v_old_current->>'card_uid' IS NOT NULL THEN
          EXECUTE format(
            'SELECT t.id FROM %s t WHERE t.updated_by_user_id = $1 AND t.card_uid = $2 AND t.hashdiff = $3 ORDER BY t.%I DESC LIMIT 1',
            p_table,
            p_temporal_col
          ) USING v_me, (v_old_current->>'card_uid')::uuid, v_expected_hashdiff
          INTO v_existing_id;
        ELSE
          EXECUTE format(
            'SELECT t.id FROM %s t WHERE t.updated_by_user_id = $1 AND t.%I = $2 AND t.hashdiff = $3 ORDER BY t.%I DESC LIMIT 1',
            p_table,
            p_anchor_col,
            p_temporal_col
          ) USING v_me, v_anchor_value, v_expected_hashdiff
          INTO v_existing_id;
        END IF;
      ELSE
        IF v_old_current->>'card_uid' IS NOT NULL THEN
          EXECUTE format(
            'SELECT t.id FROM %s t WHERE t.card_uid = $1 AND t.hashdiff = $2 ORDER BY t.%I DESC LIMIT 1',
            p_table,
            p_temporal_col
          ) USING (v_old_current->>'card_uid')::uuid, v_expected_hashdiff
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
        RAISE NOTICE '[SCD2-BASE] Found existing row after unique violation: %', v_existing_id;
        RETURN v_existing_id;
      END IF;
      
      -- If still not found, re-raise the exception
      RAISE;
  END;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_scd2_patch_base(regclass, uuid, text, text, boolean, jsonb, text[], jsonb) TO authenticated;

-- ============================================================================
-- 7. Trigger Attachment Helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_scd2_attach_trigger(p_table regclass)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_table_name text;
  v_trigger_name text;
BEGIN
  v_table_name := p_table::text;
  v_trigger_name := 'trg_' || replace(replace(v_table_name, 'public.', ''), '.', '_') || '_hash';
  
  -- Drop existing trigger if it exists
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', v_trigger_name, p_table);
  
  -- Create new trigger
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.fn_scd2_trigger_hash_shim()',
    v_trigger_name,
    p_table
  );
  
  RAISE NOTICE 'Attached trigger % to table %', v_trigger_name, v_table_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_scd2_attach_trigger(regclass) TO authenticated;

-- ============================================================================
-- 8. Constraint Parity View
-- ============================================================================

CREATE OR REPLACE VIEW public.v_scd2_constraint_parity AS
WITH config_keys AS (
  SELECT
    table_name,
    unique_key AS config_unique_key
  FROM public.scd2_resource_config
),
index_keys AS (
  SELECT
    c.table_name,
    array_agg(DISTINCT a.attname::text ORDER BY a.attname::text) FILTER (WHERE a.attname IS NOT NULL) AS actual_index_columns
  FROM public.scd2_resource_config c
  JOIN pg_index i ON i.indrelid = c.table_name::regclass::oid
  JOIN pg_constraint con ON con.conindid = i.indexrelid AND con.contype = 'u'
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) AND a.attnum > 0
  GROUP BY c.table_name
)
SELECT
  ck.table_name,
  ck.config_unique_key,
  COALESCE(ik.actual_index_columns, ARRAY[]::text[]) AS actual_index_columns,
  CASE
    WHEN array_length(ck.config_unique_key, 1) = array_length(COALESCE(ik.actual_index_columns, ARRAY[]::text[]), 1)
      AND ck.config_unique_key <@ COALESCE(ik.actual_index_columns, ARRAY[]::text[])
      AND COALESCE(ik.actual_index_columns, ARRAY[]::text[]) <@ ck.config_unique_key
    THEN true
    ELSE false
  END AS matches
FROM config_keys ck
LEFT JOIN index_keys ik ON ck.table_name = ik.table_name;

COMMENT ON VIEW public.v_scd2_constraint_parity IS 'Compares configured unique_key in scd2_resource_config with actual unique indexes on tables. Use to verify constraint parity.';

GRANT SELECT ON public.v_scd2_constraint_parity TO authenticated;

-- ============================================================================
-- 9. Wrapper: Stock Adjustments (v3)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_tcm_user_tally_card_entries_patch_scd2_v3(
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
  v_config jsonb;
  v_hash_config jsonb;
  v_updates jsonb := '{}'::jsonb;
  v_new_id uuid;
  v_result public.tcm_user_tally_card_entries;
BEGIN
  -- Fetch config from table
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No SCD2 config found for public.tcm_user_tally_card_entries';
  END IF;
  
  -- Build hash_config from config
  v_hash_config := jsonb_build_object(
    'hashdiff_columns', v_config->'hashdiff_columns'
  );
  
  -- Build updates JSONB (strip nulls, preserve types)
  IF p_reason_code IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('reason_code', p_reason_code);
  END IF;
  IF p_multi_location IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('multi_location', p_multi_location);
  END IF;
  IF p_qty IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('qty', p_qty);
  END IF;
  IF p_location IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('location', p_location);
  END IF;
  IF p_note IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('note', p_note);
  END IF;
  
  -- Call base function
  v_new_id := public.fn_scd2_patch_base(
    p_table := 'public.tcm_user_tally_card_entries'::regclass,
    p_id := p_id,
    p_anchor_col := v_config->>'anchor_col',
    p_temporal_col := v_config->>'temporal_col',
    p_user_scoped := (v_config->>'user_scoped')::boolean,
    p_hash_config := v_hash_config,
    p_unique_key := ARRAY(SELECT jsonb_array_elements_text(v_config->'unique_key')),
    p_updates := v_updates
  );
  
  -- Fetch and return the new/existing row
  SELECT * INTO v_result
  FROM public.tcm_user_tally_card_entries
  WHERE id = v_new_id;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_tcm_user_tally_card_entries_patch_scd2_v3 IS 'SCD2 wrapper for Stock Adjustments (v3). Uses config table. Deprecated: v1/v2 remain for backward compatibility.';

GRANT EXECUTE ON FUNCTION public.fn_tcm_user_tally_card_entries_patch_scd2_v3(uuid, text, boolean, integer, text, text) TO authenticated;

-- ============================================================================
-- 10. Wrapper: Tally Cards (v3)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_tcm_tally_cards_patch_scd2_v3(
  p_id uuid,
  p_warehouse_id uuid DEFAULT NULL,
  p_tally_card_number text DEFAULT NULL,
  p_item_number bigint DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS SETOF public.tcm_tally_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_config jsonb;
  v_hash_config jsonb;
  v_updates jsonb := '{}'::jsonb;
  v_new_id uuid;
BEGIN
  -- Fetch config from table
  v_config := public.fn_scd2_get_config('public.tcm_tally_cards'::regclass);
  
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No SCD2 config found for public.tcm_tally_cards';
  END IF;
  
  -- Build hash_config from config
  v_hash_config := jsonb_build_object(
    'hashdiff_columns', v_config->'hashdiff_columns'
  );
  
  -- Build updates JSONB (strip nulls, preserve types)
  IF p_warehouse_id IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('warehouse_id', p_warehouse_id);
  END IF;
  IF p_tally_card_number IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('tally_card_number', p_tally_card_number);
  END IF;
  IF p_item_number IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('item_number', p_item_number);
  END IF;
  IF p_note IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('note', p_note);
  END IF;
  IF p_is_active IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('is_active', p_is_active);
  END IF;
  
  -- Call base function
  v_new_id := public.fn_scd2_patch_base(
    p_table := 'public.tcm_tally_cards'::regclass,
    p_id := p_id,
    p_anchor_col := v_config->>'anchor_col',
    p_temporal_col := v_config->>'temporal_col',
    p_user_scoped := (v_config->>'user_scoped')::boolean,
    p_hash_config := v_hash_config,
    p_unique_key := ARRAY(SELECT jsonb_array_elements_text(v_config->'unique_key')),
    p_updates := v_updates
  );
  
  -- Return the new/existing row(s)
  RETURN QUERY
  SELECT *
  FROM public.tcm_tally_cards
  WHERE id = v_new_id;
END;
$$;

COMMENT ON FUNCTION public.fn_tcm_tally_cards_patch_scd2_v3 IS 'SCD2 wrapper for Tally Cards (v3). Uses config table. Deprecated: v1/v2 remain for backward compatibility.';

GRANT EXECUTE ON FUNCTION public.fn_tcm_tally_cards_patch_scd2_v3(uuid, uuid, text, bigint, text, boolean) TO authenticated;

-- ============================================================================
-- 11. Register Resources
-- ============================================================================

-- Register Stock Adjustments
SELECT public.fn_scd2_register_resource(
  'public.tcm_user_tally_card_entries',
  'tally_card_number',
  'updated_at',
  true,  -- user_scoped
  '[
    {"name":"updated_by_user_id","type":"uuid","normalize":"none"},
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"card_uid","type":"uuid","normalize":"none"},
    {"name":"qty","type":"integer","normalize":"none"},
    {"name":"location","type":"text","normalize":"lower_trim"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"role_family","type":"text","normalize":"lower_trim"},
    {"name":"reason_code","type":"text","normalize":"lower_trim","default":"unspecified"},
    {"name":"multi_location","type":"boolean","normalize":"none","default":"false"}
  ]'::jsonb,
  ARRAY['updated_by_user_id', 'card_uid', 'hashdiff']::text[]
);

-- Register Tally Cards
SELECT public.fn_scd2_register_resource(
  'public.tcm_tally_cards',
  'card_uid',
  'snapshot_at',
  false,  -- not user_scoped
  '[
    {"name":"card_uid","type":"uuid","normalize":"none"},
    {"name":"warehouse_id","type":"uuid","normalize":"none"},
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"item_number","type":"bigint","normalize":"none"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"is_active","type":"boolean","normalize":"none","default":"true"}
  ]'::jsonb,
  ARRAY['card_uid', 'hashdiff']::text[]
);

-- ============================================================================
-- 12. Attach Triggers
-- ============================================================================

-- Attach trigger for Stock Adjustments
SELECT public.fn_scd2_attach_trigger('public.tcm_user_tally_card_entries'::regclass);

-- Attach trigger for Tally Cards
SELECT public.fn_scd2_attach_trigger('public.tcm_tally_cards'::regclass);

-- ============================================================================
-- 13. Mark Legacy Functions as Deprecated
-- ============================================================================

COMMENT ON FUNCTION public.fn_user_entry_patch_scd2 IS 'Deprecated — replaced by fn_tcm_user_tally_card_entries_patch_scd2_v3';
COMMENT ON FUNCTION public.fn_user_entry_patch_scd2_v2 IS 'Deprecated — replaced by fn_tcm_user_tally_card_entries_patch_scd2_v3';
COMMENT ON FUNCTION public.fn_tally_card_patch_scd2 IS 'Deprecated — replaced by fn_tcm_tally_cards_patch_scd2_v3';

