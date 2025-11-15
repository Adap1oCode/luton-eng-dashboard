-- ============================================================================
-- Check existing constraints on tcm_tally_cards table
-- Run this in Supabase SQL Editor to see what constraints exist
-- ============================================================================

-- Check all constraints on tcm_tally_cards
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    WHEN 'x' THEN 'EXCLUSION'
    ELSE 'OTHER'
  END AS constraint_type_name,
  pg_get_constraintdef(con.oid) AS constraint_definition,
  con.conkey AS column_positions,
  array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum)) AS column_names
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tcm_tally_cards'
GROUP BY con.conname, con.contype, con.oid, con.conkey
ORDER BY con.contype, con.conname;

-- Check all indexes on tcm_tally_cards (including unique indexes)
SELECT 
  i.relname AS index_name,
  CASE 
    WHEN idx.indisunique THEN 'UNIQUE INDEX'
    ELSE 'INDEX'
  END AS index_type,
  array_agg(a.attname ORDER BY array_position(idx.indkey, a.attnum)) AS column_names,
  pg_get_indexdef(idx.indexrelid) AS index_definition
FROM pg_index idx
JOIN pg_class i ON i.oid = idx.indexrelid
JOIN pg_class t ON t.oid = idx.indrelid
JOIN pg_namespace nsp ON nsp.oid = t.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = ANY(idx.indkey)
WHERE nsp.nspname = 'public'
  AND t.relname = 'tcm_tally_cards'
GROUP BY i.relname, idx.indisunique, idx.indexrelid
ORDER BY idx.indisunique DESC, i.relname;

-- Check if uq_tcm_card_number exists and what it contains
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition,
  array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum)) AS column_names
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tcm_tally_cards'
  AND con.conname = 'uq_tcm_card_number'
GROUP BY con.conname, con.oid, con.conkey;

-- Check table structure to see all columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tcm_tally_cards'
ORDER BY ordinal_position;





