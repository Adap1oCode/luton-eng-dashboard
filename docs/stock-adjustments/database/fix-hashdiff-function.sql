-- ============================================================================
-- Quick Fix: Update hashdiff function to use extensions.digest()
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the digest() error immediately
-- ============================================================================

-- Fix the hashdiff function to use fully qualified schema name
-- Since digest() is in the 'extensions' schema in Supabase, we need to qualify it
CREATE OR REPLACE FUNCTION public.fn_user_entry_set_hashdiff()
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
    - IMPORTANT: We do NOT fold in child table rows
      (tcm_user_tally_card_entry_locations) here because on BEFORE INSERT,
      NEW.id isn't guaranteed/committed. If you want the child breakdown to
      influence SCD2, we can switch this to an AFTER trigger or maintain a
      materialized "effective_*" column and hash that.
    - Use extensions.digest() to ensure it's found (digest() is in extensions schema in Supabase)
  */
  v_payload := concat_ws(' | ',
    coalesce(NEW.updated_by_user_id::text, '∅'),
    coalesce(lower(btrim(NEW.tally_card_number)), '∅'),
    coalesce(NEW.card_uid::text, '∅'),
    coalesce(NEW.qty::text, '∅'),
    coalesce(lower(btrim(NEW.location)), '∅'),
    coalesce(lower(btrim(NEW.note)), '∅'),
    coalesce(lower(btrim(NEW.role_family)), '∅'),
    coalesce(lower(btrim(NEW.reason_code)), 'unspecified'),
    coalesce(NEW.multi_location::text, 'false')
  );
  
  -- Use fully qualified name: extensions.digest() (not pg_catalog.digest())
  -- In Supabase, pgcrypto functions are in the 'extensions' schema
  NEW.hashdiff := encode(extensions.digest(v_payload, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$function$;

-- Verify the fix
SELECT 
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%extensions.digest%'
    THEN '✅ Function now uses extensions.digest() - FIXED!'
    ELSE '❌ Function still needs to be updated'
  END as fix_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_set_hashdiff';

















