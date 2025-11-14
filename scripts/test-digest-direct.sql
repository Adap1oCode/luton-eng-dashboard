-- Simple test to verify extensions.digest() works
-- Run this in Supabase SQL Editor

-- Test 1: Direct call with explicit cast
SELECT encode(extensions.digest('test payload', 'sha256'::text), 'hex') AS test1;

-- Test 2: Direct call without cast (should also work)
SELECT encode(extensions.digest('test payload', 'sha256'), 'hex') AS test2;

-- Test 3: Test the exact same call pattern as the function
DO $$
DECLARE
  v_payload text;
  v_hash text;
BEGIN
  v_payload := concat_ws(' | ',
    coalesce('00000000-0000-0000-0000-000000000000'::uuid::text, '∅'),
    coalesce(NULL::uuid::text, '∅'),
    coalesce(lower(btrim('TEST123')), '∅'),
    coalesce(123::text, '∅'),
    coalesce(lower(btrim('test note')), '∅'),
    coalesce(true::text, 'true')
  );
  
  v_hash := encode(extensions.digest(v_payload, 'sha256'::text), 'hex');
  RAISE NOTICE 'Hashdiff calculation successful: %', v_hash;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Hashdiff calculation FAILED: %', SQLERRM;
END $$;










