-- ============================================================================
-- Validation Script: Check digest() function availability for tally cards
-- Run this in Supabase SQL Editor to diagnose the issue
-- ============================================================================

-- 1. Check if pgcrypto extension exists and where
SELECT 
    extname,
    extnamespace::regnamespace AS schema_name,
    extversion AS version
FROM pg_extension
WHERE extname = 'pgcrypto';

-- 2. Find ALL digest() functions in the database
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'digest'
ORDER BY n.nspname;

-- 3. Test if we can call digest() from different schemas
SELECT 
    'extensions.digest()' AS test_name,
    encode(extensions.digest('test', 'sha256'), 'hex') AS result
UNION ALL
SELECT 
    'public.digest()' AS test_name,
    encode(public.digest('test', 'sha256'), 'hex') AS result
UNION ALL
SELECT 
    'digest() (unqualified)' AS test_name,
    encode(digest('test', 'sha256'), 'hex') AS result;

-- 4. Check current search_path
SHOW search_path;

-- 5. Check if tally card hashdiff function exists and its search_path
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN 'No search_path set (uses default)'
        ELSE array_to_string(p.proconfig, ', ')
    END AS config_settings,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_tally_card_set_hashdiff';

-- 6. Check if tally card RPC function exists and its search_path
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN 'No search_path set (uses default)'
        ELSE array_to_string(p.proconfig, ', ')
    END AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_tally_card_patch_scd2';

-- 7. Check if trigger exists
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    CASE t.tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE 'UNKNOWN'
    END AS trigger_status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'tcm_tally_cards'
  AND t.tgname = 'trg_tally_card_set_hashdiff';

-- 8. Test the hashdiff function directly (if it exists)
DO $$
DECLARE
    test_result text;
BEGIN
    -- Try to call the function directly
    SELECT encode(extensions.digest('test payload', 'sha256'), 'hex') INTO test_result;
    RAISE NOTICE 'Direct digest() test successful: %', test_result;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Direct digest() test FAILED: %', SQLERRM;
END $$;

-- 9. Compare with working user_entry function
SELECT 
    p.proname AS function_name,
    CASE 
        WHEN p.proconfig IS NULL THEN 'No search_path set (uses default)'
        ELSE array_to_string(p.proconfig, ', ')
    END AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('fn_user_entry_set_hashdiff', 'fn_tally_card_set_hashdiff')
ORDER BY p.proname;



