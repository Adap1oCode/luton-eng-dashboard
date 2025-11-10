-- ============================================================================
-- Diagnostic: Check if v_warehouse_locations view exists
-- ============================================================================

-- Check if view exists
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'v_warehouse_locations';

-- If view doesn't exist, check if base table exists
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('warehouse_locations', 'v_warehouse_locations')
ORDER BY table_name;

-- Check if we can query the view (if it exists)
-- Uncomment to test:
-- SELECT COUNT(*) as location_count FROM public.v_warehouse_locations;

-- Check if we can query the base table
SELECT COUNT(*) as base_table_count FROM public.warehouse_locations;


