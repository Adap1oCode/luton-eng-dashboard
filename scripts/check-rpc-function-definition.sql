-- Check the RPC function definition to see if it uses extensions.digest() correctly
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
  AND p.proname = 'fn_tally_card_patch_scd2';
















