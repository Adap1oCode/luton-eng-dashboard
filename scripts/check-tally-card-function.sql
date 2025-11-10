-- Script to check the current fn_tally_card_patch_scd2 function definition
-- Run this in Supabase SQL Editor to see what's actually in the database

-- Check if function exists and get its definition
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    pg_get_functiondef(p.oid) AS function_definition,
    p.prosecdef AS security_definer,
    p.proconfig AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_tally_card_patch_scd2'
ORDER BY p.oid;

-- Also check the function signature more simply
SELECT 
    routine_name,
    routine_type,
    data_type AS return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'fn_tally_card_patch_scd2';

-- Check grants/permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'fn_tally_card_patch_scd2';




