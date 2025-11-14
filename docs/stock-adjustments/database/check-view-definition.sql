-- ============================================================================
-- Check Current View Definition: v_tcm_user_tally_card_entries
-- Run this in Supabase SQL Editor to see the current view definition
-- ============================================================================

-- Method 1: Get view definition from information_schema
SELECT
  table_schema,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'v_tcm_user_tally_card_entries';

-- Method 2: Get view definition using pg_get_viewdef (more readable)
SELECT
  schemaname,
  viewname,
  pg_get_viewdef('public.v_tcm_user_tally_card_entries'::regclass, true) as view_definition_formatted,
  pg_get_viewdef('public.v_tcm_user_tally_card_entries'::regclass, false) as view_definition_raw
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'v_tcm_user_tally_card_entries';

-- Method 3: Get view definition with CREATE VIEW statement
SELECT
  'CREATE OR REPLACE VIEW ' || quote_ident(schemaname) || '.' || quote_ident(viewname) || ' AS ' || 
  pg_get_viewdef('public.v_tcm_user_tally_card_entries'::regclass, true) as create_view_statement
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'v_tcm_user_tally_card_entries';

-- Method 4: Check what columns the view exposes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_tcm_user_tally_card_entries'
ORDER BY ordinal_position;

-- Method 5: Test the view (sample data)
SELECT * 
FROM v_tcm_user_tally_card_entries 
LIMIT 5;












