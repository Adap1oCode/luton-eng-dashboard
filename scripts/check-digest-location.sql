-- Check where the digest() function is located in your database
-- Run this in Supabase SQL Editor to find where digest() actually is

-- Check all schemas for digest function
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'digest'
ORDER BY n.nspname;

-- Check if pgcrypto extension exists and where
SELECT 
    extname,
    extnamespace::regnamespace AS schema
FROM pg_extension
WHERE extname = 'pgcrypto';

-- Test if we can call digest from different schemas
SELECT 
    'extensions.digest' AS test_name,
    encode(extensions.digest('test', 'sha256'), 'hex') AS result
UNION ALL
SELECT 
    'public.digest' AS test_name,
    encode(public.digest('test', 'sha256'), 'hex') AS result
UNION ALL
SELECT 
    'digest (unqualified)' AS test_name,
    encode(digest('test', 'sha256'), 'hex') AS result;



