-- ============================================================================
-- Migration: Create fn_tally_card_set_hashdiff function
-- Date: 2025-02-01
-- Purpose: Hashdiff trigger function for tcm_tally_cards (matches fn_user_entry_set_hashdiff pattern)
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable pgcrypto extension (required for digest() function)
-- ============================================================================
-- IMPORTANT: In Supabase, you may need to enable this extension via Dashboard first:
--   1. Go to Supabase Dashboard > Database > Extensions
--   2. Search for "pgcrypto"
--   3. Click "Enable"
--   4. Then run this migration
--
-- This is safe: IF NOT EXISTS means it won't error if already installed
-- Match the exact pattern from working migration
DO $$
BEGIN
  -- Try to create the extension (don't specify schema - let Supabase put it where it belongs)
  -- In Supabase, pgcrypto functions are in the 'extensions' schema
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create pgcrypto extension: %. You may need to enable it in Supabase Dashboard > Database > Extensions first.', SQLERRM;
    RAISE;
  END;
  
  -- Verify the extension is installed
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION 'pgcrypto extension is not installed. Please enable it in Supabase Dashboard > Database > Extensions first.';
  END IF;
END $$;

-- Grant usage on extensions schema to ensure digest() is accessible
GRANT USAGE ON SCHEMA extensions TO public;

-- Drop trigger first (it depends on the function)
DROP TRIGGER IF EXISTS trg_tally_card_set_hashdiff ON public.tcm_tally_cards;

-- Drop function if it exists (in case it was created with wrong pattern)
DROP FUNCTION IF EXISTS public.fn_tally_card_set_hashdiff();

-- Create the hashdiff trigger function for tally cards
-- EXACT COPY of fn_user_entry_set_hashdiff, only field list changed
-- Note: NO SET search_path - uses default (like working function)
CREATE OR REPLACE FUNCTION public.fn_tally_card_set_hashdiff()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_payload text;
BEGIN
  /*
    Notes:
    - Keep column ordering stable.
    - Normalize text with btrim and lower to avoid spurious diffs.
    - Represent NULLs explicitly.
    - Use extensions.digest() to ensure it's found (digest() is in extensions schema in Supabase)
  */
  v_payload := concat_ws(' | ',
    coalesce(NEW.card_uid::text, '∅'),
    coalesce(NEW.warehouse_id::text, '∅'),
    coalesce(lower(btrim(NEW.tally_card_number)), '∅'),
    coalesce(NEW.item_number::text, '∅'),
    coalesce(lower(btrim(NEW.note)), '∅'),
    coalesce(NEW.is_active::text, 'true')
  );
  
  -- Use fully qualified name to ensure it's found regardless of search_path
  -- Note: In Supabase, digest() is in the 'extensions' schema, not 'pg_catalog'
  NEW.hashdiff := encode(extensions.digest(v_payload, 'sha256'), 'hex');
  
  -- Set snapshot_at if null (for SCD2 timestamp tracking)
  IF NEW.snapshot_at IS NULL THEN
    NEW.snapshot_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on tcm_tally_cards table
CREATE TRIGGER trg_tally_card_set_hashdiff
  BEFORE INSERT OR UPDATE ON public.tcm_tally_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_tally_card_set_hashdiff();

