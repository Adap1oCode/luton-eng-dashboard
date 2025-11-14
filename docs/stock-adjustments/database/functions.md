# Functions Lookup Scripts

## Get Function Definition

Get the complete source code for any function.

```sql
-- Generic function definition lookup
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'function_name_here';
```

## Stock Adjustments Related Functions

### fn_user_entry_patch_scd2

Main RPC function for updating stock adjustment entries with SCD2 support.

```sql
-- Get fn_user_entry_patch_scd2 definition
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_patch_scd2';
```

**Function Signature:**
```sql
fn_user_entry_patch_scd2(
  p_id uuid,
  p_reason_code text DEFAULT NULL,
  p_multi_location boolean DEFAULT NULL,
  p_qty integer DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_locations jsonb DEFAULT NULL
)
RETURNS tcm_user_tally_card_entries
```

### fn_user_entry_set_hashdiff

Trigger function that calculates hashdiff for SCD2 change detection.

```sql
-- Get fn_user_entry_set_hashdiff definition
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_set_hashdiff';
```

### set_entry_user_id

Trigger function that sets `updated_by_user_id` from auth context on INSERT.

```sql
-- Get set_entry_user_id definition
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'set_entry_user_id';
```

### tcm_entries_skip_noop

Trigger function that prevents no-op updates (returns NULL if no fields changed).

```sql
-- Get tcm_entries_skip_noop definition
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'tcm_entries_skip_noop';
```

## List All Functions

### List All Functions in Public Schema

```sql
-- List all functions in public schema
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END as volatility,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

### List Functions by Table

```sql
-- List all functions that might be related to a table
-- (This searches function definitions for table name mentions)
SELECT DISTINCT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%tcm_user_tally_card_entries%'
ORDER BY p.proname;
```

## Function Dependencies

### Get Functions That Depend on a Table

```sql
-- Find functions that reference a specific table
SELECT DISTINCT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%tcm_user_tally_card_entries%'
ORDER BY p.proname;
```

### Get Functions Called by Another Function

```sql
-- Find functions called within fn_user_entry_patch_scd2
SELECT DISTINCT
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'fn_user_entry_patch_scd2')) 
    ILIKE '%' || p.proname || '%'
  AND p.proname != 'fn_user_entry_patch_scd2';
```

## Function Permissions

### Get Function Grants

```sql
-- Get permissions for a specific function
SELECT
  p.proname as function_name,
  a.rolname as grantee,
  has_function_privilege(a.rolname, p.oid, 'EXECUTE') as can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
CROSS JOIN pg_roles a
WHERE n.nspname = 'public'
  AND p.proname = 'fn_user_entry_patch_scd2'
  AND a.rolname NOT LIKE 'pg_%'
ORDER BY a.rolname;
```












