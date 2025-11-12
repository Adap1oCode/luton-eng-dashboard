-- Test script to verify the hashdiff function works
-- Run this in Supabase SQL Editor to test if the function can find digest()

-- Test 1: Check if extensions.digest() works directly
SELECT encode(extensions.digest('test', 'sha256'), 'hex') AS test1;

-- Test 2: Try calling the function directly (if it exists)
DO $$
DECLARE
  test_payload text;
  test_hash text;
BEGIN
  test_payload := 'test | payload';
  test_hash := encode(extensions.digest(test_payload, 'sha256'), 'hex');
  RAISE NOTICE 'Test hash: %', test_hash;
END $$;

-- Test 3: Check if trigger function exists and can be called
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN 'No search_path set'
        ELSE array_to_string(p.proconfig, ', ')
    END AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_tally_card_set_hashdiff';

-- Test 4: Check if trigger exists
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'tcm_tally_cards'
  AND t.tgname = 'trg_tally_card_set_hashdiff';







