-- ============================================================================
-- SQL Queries for Tally Cards Edit Page Performance Investigation
-- Run these queries in Supabase SQL Editor to gather current state
-- ============================================================================

-- Step 0.1: Verify Resource Mapping
-- Resource key "tally-cards" maps to table "tcm_tally_cards" (confirmed in code)

-- Step 0.2: Get Current View Definition (if view is used)
-- Note: "tally-cards" resource uses table "tcm_tally_cards", not a view
-- But checking if there's a view that might be involved:

-- Check if v_tcm_tally_cards_current view exists and its definition
SELECT pg_get_viewdef('public.v_tcm_tally_cards_current'::regclass, true) AS view_definition;

-- Check view columns and types
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'v_tcm_tally_cards_current'
ORDER BY ordinal_position;

-- Check if view depends on other views/tables
SELECT dependent_ns.nspname as dependent_schema,
       dependent_view.relname as dependent_view,
       source_ns.nspname as source_schema,
       source_table.relname as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE dependent_view.relname = 'v_tcm_tally_cards_current';

-- Step 0.3: Check Database Indexes on tcm_tally_cards table

-- List all indexes on tcm_tally_cards table
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tcm_tally_cards'
ORDER BY indexname;

-- Check if id column (UUID) has primary key/index
SELECT 
  t.relname AS table_name,
  i.relname AS index_name,
  a.attname AS column_name,
  ix.indisprimary AS is_primary_key,
  ix.indisunique AS is_unique,
  pg_get_indexdef(i.oid) AS index_definition
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relname = 'tcm_tally_cards'
  AND a.attname = 'id';

-- Check indexes on other columns that might be used in queries
SELECT 
  t.relname AS table_name,
  i.relname AS index_name,
  string_agg(a.attname, ', ' ORDER BY array_position(ix.indkey, a.attnum)) AS indexed_columns,
  ix.indisprimary AS is_primary_key,
  ix.indisunique AS is_unique
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relname = 'tcm_tally_cards'
GROUP BY t.relname, i.relname, ix.indisprimary, ix.indisunique
ORDER BY i.relname;

-- Step 0.4: Analyze Actual Query Performance

-- First, get a real UUID from the table
SELECT id, tally_card_number, item_number 
FROM tcm_tally_cards 
WHERE id IS NOT NULL 
LIMIT 5;

-- Then run EXPLAIN ANALYZE (replace 'REPLACE_WITH_ACTUAL_UUID' with actual UUID from above)
-- This simulates the query that getOneHandler() runs
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT id, card_uid, tally_card_number, warehouse_id, item_number, note, is_active, created_at, snapshot_at, hashdiff
FROM tcm_tally_cards
WHERE id = 'REPLACE_WITH_ACTUAL_UUID';

-- Also check if there are any triggers or functions that might slow down the query
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'tcm_tally_cards';

-- Step 0.5: Check Options Loading Performance

-- Check warehouses table indexes (for "warehouses" options)
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'warehouses'
ORDER BY indexname;

-- Check inventory-unique view/table (for "items" options)
-- First, find what table/view "inventory-unique" maps to
SELECT pg_get_viewdef('public.v_inventory_unique'::regclass, true) AS view_definition;

-- Check indexes on base table for inventory-unique
-- (Need to identify base table from view definition first)

-- Step 0.7: Compare with Inventory Popup

-- Check v_inventory_current view definition
SELECT pg_get_viewdef('public.v_inventory_current'::regclass, true) AS view_definition;

-- Get a real item_number for testing
SELECT item_number 
FROM v_inventory_current 
WHERE item_number IS NOT NULL 
LIMIT 5;

-- Analyze inventory query performance (replace with actual item_number)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM v_inventory_current
WHERE item_number = 123456789  -- Replace with actual item_number
LIMIT 1;

-- Check indexes on base tables used by v_inventory_current
-- (Need to identify base tables from view definition first)




