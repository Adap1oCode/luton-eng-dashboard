# Extensions Lookup Scripts

## List Installed Extensions

```sql
-- List all installed extensions
SELECT
  extname as extension_name,
  extversion as version,
  n.nspname as schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;
```

## Check Specific Extension

### Check if pgcrypto is Installed

```sql
-- Check if pgcrypto extension is installed
SELECT
  extname,
  extversion,
  n.nspname as schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'pgcrypto';
```

### Check Extension Functions

```sql
-- List functions provided by an extension
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_extension e ON p.proextsrc = e.oid
WHERE e.extname = 'pgcrypto'
ORDER BY p.proname;
```

## Required Extensions for Stock Adjustments

### pgcrypto

Required for `digest()` function used in `fn_user_entry_set_hashdiff` trigger.

**Check:**
```sql
SELECT EXISTS(
  SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
) as pgcrypto_installed;
```

**Install (if not installed):**
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Verify digest() function exists:**
```sql
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'pg_catalog'
  AND p.proname = 'digest';
```

## Extension Dependencies

### Check What Depends on an Extension

```sql
-- Find objects that depend on pgcrypto
SELECT DISTINCT
  CASE
    WHEN c.relkind = 'r' THEN 'TABLE'
    WHEN c.relkind = 'v' THEN 'VIEW'
    WHEN c.relkind = 'f' THEN 'FUNCTION'
    ELSE 'OTHER'
  END as object_type,
  n.nspname || '.' || c.relname as object_name
FROM pg_depend d
JOIN pg_extension e ON d.refobjid = e.oid
JOIN pg_class c ON d.objid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE e.extname = 'pgcrypto'
  AND d.deptype = 'n'
ORDER BY object_type, object_name;
```

## Extension Information

### Get Extension Details

```sql
-- Get detailed information about an extension
SELECT
  e.extname,
  e.extversion,
  e.extrelocatable,
  n.nspname as schema,
  obj_description(e.oid, 'pg_extension') as comment
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'pgcrypto';
```




