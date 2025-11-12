# Row Level Security (RLS) Policies Lookup Scripts

## Get RLS Policies for a Table

```sql
-- Get all RLS policies for tcm_user_tally_card_entries
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tcm_user_tally_card_entries'
ORDER BY policyname;
```

## Get RLS Status

### Check if RLS is Enabled

```sql
-- Check if RLS is enabled on a table
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'tcm_user_tally_card_entries';
```

### Get RLS Status from pg_class

```sql
-- Get RLS status from system catalog
SELECT
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'tcm_user_tally_card_entries';
```

## Stock Adjustments Related Policies

### tcm_user_tally_card_entries Policies

```sql
-- Get all policies for entries table
SELECT
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tcm_user_tally_card_entries'
ORDER BY cmd, policyname;
```

**Current Policies:**
- `entries_select_open` - SELECT (qual: `true`)
- `entries_insert_open` - INSERT (with_check: `true`)
- `entries_update_open` - UPDATE (qual: `true`, with_check: `true`)
- `entries_delete_open` - DELETE (qual: `true`)

### tcm_user_tally_card_entry_locations Policies

```sql
-- Get all policies for child locations table
SELECT
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tcm_user_tally_card_entry_locations'
ORDER BY cmd, policyname;
```

**Current Policies:**
- `Users can manage locations for entries they can edit` - ALL operations
  - **USING:** Checks if parent entry exists and is current
  - **WITH CHECK:** Same as USING

## Policy Details

### Get Full Policy Definition

```sql
-- Get complete policy definition with SQL
SELECT
  'CREATE POLICY ' || quote_ident(policyname) || 
  ' ON ' || quote_ident(schemaname) || '.' || quote_ident(tablename) ||
  ' FOR ' || cmd ||
  CASE WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END ||
  CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
  CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END
  as policy_sql
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tcm_user_tally_card_entries'
ORDER BY policyname;
```

## List All RLS Policies

### List All Policies in Public Schema

```sql
-- List all RLS policies in public schema
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
```

## Test RLS Policies

### Test Policy Evaluation

```sql
-- Test if current user can SELECT
SELECT
  has_table_privilege(current_user, 'tcm_user_tally_card_entries', 'SELECT') as can_select,
  has_table_privilege(current_user, 'tcm_user_tally_card_entries', 'INSERT') as can_insert,
  has_table_privilege(current_user, 'tcm_user_tally_card_entries', 'UPDATE') as can_update,
  has_table_privilege(current_user, 'tcm_user_tally_card_entries', 'DELETE') as can_delete;
```

### Check Effective Policies for Current User

```sql
-- See what policies apply to current user
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tcm_user_tally_card_entries'
  AND (roles IS NULL OR current_user = ANY(roles) OR 'public' = ANY(roles))
ORDER BY cmd, policyname;
```








