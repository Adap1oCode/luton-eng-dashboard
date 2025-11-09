-- Test if the trigger works when inserting into tcm_tally_cards
-- Run this in Supabase SQL Editor

-- First, check what the actual function definition is
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_tally_card_set_hashdiff';

-- Test: Try to insert a test row to see if trigger fires correctly
-- This will help us see if the trigger can access extensions.digest()
DO $$
DECLARE
  test_id uuid;
  test_card_uid uuid;
BEGIN
  -- Generate test IDs
  test_id := gen_random_uuid();
  test_card_uid := gen_random_uuid();
  
  -- Try to insert a test row
  BEGIN
    INSERT INTO public.tcm_tally_cards (
      id,
      card_uid,
      tally_card_number,
      warehouse_id,
      item_number,
      note,
      is_active,
      snapshot_at
    ) VALUES (
      test_id,
      test_card_uid,
      'TEST_TRIGGER_' || substr(test_id::text, 1, 8),
      NULL,
      999,
      'Test note for trigger',
      true,
      NOW()
    );
    
    RAISE NOTICE 'INSERT successful! Checking hashdiff...';
    
    -- Check if hashdiff was set
    SELECT hashdiff INTO test_id
    FROM public.tcm_tally_cards
    WHERE id = test_id;
    
    IF test_id IS NULL THEN
      RAISE NOTICE 'WARNING: hashdiff is NULL - trigger may not have fired';
    ELSE
      RAISE NOTICE 'SUCCESS: hashdiff was set: %', substr(test_id::text, 1, 16) || '...';
    END IF;
    
    -- Clean up test row
    DELETE FROM public.tcm_tally_cards WHERE id = test_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'INSERT FAILED: %', SQLERRM;
    RAISE;
  END;
END $$;



