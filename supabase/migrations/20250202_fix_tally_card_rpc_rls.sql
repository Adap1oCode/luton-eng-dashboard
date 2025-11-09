-- ============================================================================
-- Migration: Fix RLS Access for fn_tally_card_patch_scd2
-- Date: 2025-02-02
-- Purpose: Ensure the RPC function can access tcm_tally_cards even with RLS enabled
-- ============================================================================

-- The function uses SECURITY DEFINER, but in Supabase, RLS still applies
-- unless the function owner is a superuser. We need to ensure the function
-- can access the table. The function owner should be postgres (superuser),
-- but if RLS is still blocking, we may need to grant explicit permissions.

-- First, check if RLS is enabled (run this separately to see status):
/*
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'tcm_tally_cards';
*/

-- If RLS is enabled and blocking, we have two options:
-- 1. Ensure function owner is postgres (superuser) - this should bypass RLS
-- 2. Create a policy that allows the function to access the table

-- Option 1: Verify function owner (should already be postgres)
-- Run this to check:
/*
SELECT
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS function_owner,
  r.rolsuper AS is_superuser
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'fn_tally_card_patch_scd2'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
*/

-- Option 2: If function owner is not a superuser, we need to grant permissions
-- OR create an RLS policy that allows the function to access the table

-- Ensure the function is owned by postgres (superuser, bypasses RLS)
-- This is critical: SECURITY DEFINER functions only bypass RLS if owner is superuser
DO $$
BEGIN
  -- Check current owner first
  DECLARE
    v_current_owner text;
    v_is_superuser boolean;
  BEGIN
    SELECT 
      pg_get_userbyid(p.proowner),
      r.rolsuper
    INTO v_current_owner, v_is_superuser
    FROM pg_proc p
    JOIN pg_roles r ON p.proowner = r.oid
    WHERE p.proname = 'fn_tally_card_patch_scd2'
      AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND pg_get_function_arguments(p.oid) = 'p_id uuid, p_tally_card_number text DEFAULT NULL::text, p_warehouse_id uuid DEFAULT NULL::uuid, p_item_number bigint DEFAULT NULL::bigint, p_note text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean';
    
    IF v_current_owner IS NULL THEN
      RAISE EXCEPTION 'Function fn_tally_card_patch_scd2 not found';
    END IF;
    
    IF NOT v_is_superuser THEN
      -- Set owner to postgres (superuser)
      ALTER FUNCTION public.fn_tally_card_patch_scd2(UUID, TEXT, UUID, BIGINT, TEXT, BOOLEAN)
        OWNER TO postgres;
      RAISE NOTICE 'Function ownership changed from % to postgres', v_current_owner;
    ELSE
      RAISE NOTICE 'Function already owned by superuser: %', v_current_owner;
    END IF;
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not set function owner: %', SQLERRM;
END $$;

-- If the above doesn't work, we may need to create an RLS policy
-- that allows the function to access the table. However, this is tricky
-- because we can't easily identify "function context" in RLS policies.
-- The better solution is to ensure the function owner is a superuser.

