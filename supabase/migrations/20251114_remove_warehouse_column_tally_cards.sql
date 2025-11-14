-- ============================================================================
-- Remove warehouse column from tcm_tally_cards
-- Date: 2025-11-14
-- Purpose: Remove denormalized warehouse text column, use only warehouse_id (matches stock-adjustments pattern)
-- ============================================================================

-- ============================================================================
-- Step 1: Drop the warehouse column from tcm_tally_cards
-- ============================================================================
ALTER TABLE public.tcm_tally_cards 
  DROP COLUMN IF EXISTS warehouse;

-- ============================================================================
-- Step 2: Fix fn_scd2_patch_base INSERT to remove warehouse column
-- ============================================================================
-- Update the INSERT statement to only use warehouse_id (no warehouse lookup)

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
      -- FIXED: Removed warehouse column - only use warehouse_id (matches stock-adjustments pattern)
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

-- ============================================================================
-- Step 3: Update API route to convert warehouse text to warehouse_id if needed
-- ============================================================================
-- This will be done in the code, not in the migration
-- The API route should convert warehouse (text) to warehouse_id (uuid) before calling RPC

-- ============================================================================
-- Summary
-- ============================================================================
-- 1. Dropped warehouse column from tcm_tally_cards table
-- 2. Updated fn_scd2_patch_base to only use warehouse_id (no warehouse column)
-- 3. API route needs to be updated to convert warehouse text to warehouse_id if provided

