# Tables and Views Lookup Scripts

## Table Report (Comprehensive)

Get comprehensive information about a table including columns, indexes, constraints, foreign keys, RLS policies, triggers, and usage statistics.

```sql
-- Get full table report for tcm_user_tally_card_entries
SELECT * FROM dbdocs.v_table_report_combined
WHERE table_name = 'tcm_user_tally_card_entries';
```

## Table Schema

### Get Table Columns

```sql
-- Get all columns for a table
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tcm_user_tally_card_entries'
ORDER BY ordinal_position;
```

### Get Table Indexes

```sql
-- Get all indexes for a table
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tcm_user_tally_card_entries';
```

### Get Table Constraints

```sql
-- Get all constraints for a table
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.tcm_user_tally_card_entries'::regclass;
```

### Get Foreign Keys

```sql
-- Get all foreign keys for a table
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'tcm_user_tally_card_entries';
```

## Views

### Get View Definition

```sql
-- Get view definition
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'v_tcm_user_tally_card_entries';
```

### List All Views

```sql
-- List all views in public schema
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

## Related Tables

### Child Table: tcm_user_tally_card_entry_locations

```sql
-- Get full table report for child locations table
SELECT * FROM dbdocs.v_table_report_combined
WHERE table_name = 'tcm_user_tally_card_entry_locations';
```

### Parent Table: tcm_tally_cards

```sql
-- Get full table report for parent tally cards table
SELECT * FROM dbdocs.v_table_report_combined
WHERE table_name = 'tcm_tally_cards';
```

## Table Statistics

### Get Table Size and Row Count

```sql
-- Get table size and row count
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename = 'tcm_user_tally_card_entries';
```

