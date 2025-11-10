-- Migration: Grant select on mv_tcm_compare_stock for authenticated users
-- Purpose: Ensure the compare stock materialized view is readable by the API role

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('m', 'v')
      AND n.nspname = 'public'
      AND c.relname = 'mv_tcm_compare_stock'
  ) THEN
    GRANT SELECT ON TABLE public.mv_tcm_compare_stock TO authenticated;
  ELSE
    RAISE NOTICE 'mv_tcm_compare_stock does not exist yet. Skipping grant.';
  END IF;
END $$;
