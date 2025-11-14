# Triggers Lookup Scripts

## Get All Triggers for a Table

```sql
-- Get all triggers on tcm_user_tally_card_entries
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'tcm_user_tally_card_entries'
ORDER BY action_timing, event_manipulation;
```

## Get Trigger Details (PostgreSQL System Catalog)

```sql
-- Get detailed trigger information from pg_trigger
SELECT
  t.tgname as trigger_name,
  t.tgenabled as enabled,
  CASE t.tgtype & 2
    WHEN 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE t.tgtype & 4
    WHEN 4 THEN 'ROW'
    ELSE 'STATEMENT'
  END as level,
  CASE t.tgtype & 8
    WHEN 8 THEN 'INSERT'
    ELSE ''
  END ||
  CASE t.tgtype & 16
    WHEN 16 THEN ' UPDATE'
    ELSE ''
  END ||
  CASE t.tgtype & 32
    WHEN 32 THEN ' DELETE'
    ELSE ''
  END as events,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'tcm_user_tally_card_entries'
  AND NOT t.tgisinternal
ORDER BY t.tgname;
```

## Stock Adjustments Related Triggers

### t_bu_entries_noop (BEFORE UPDATE)

Prevents no-op updates by returning NULL if no fields changed.

```sql
-- Get trigger details
SELECT
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'tcm_user_tally_card_entries'
  AND t.tgname = 't_bu_entries_noop';
```

**Trigger Details:**
- **Timing:** BEFORE UPDATE
- **Level:** ROW
- **Function:** `tcm_entries_skip_noop()`
- **Purpose:** Prevents duplicate SCD2 rows when no fields actually changed

### trg_set_entry_user (BEFORE INSERT)

Sets `updated_by_user_id` from auth context.

```sql
-- Get trigger details
SELECT
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'tcm_user_tally_card_entries'
  AND t.tgname = 'trg_set_entry_user';
```

**Trigger Details:**
- **Timing:** BEFORE INSERT
- **Level:** ROW
- **Function:** `set_entry_user_id()`
- **Purpose:** Automatically sets `updated_by_user_id` from `auth.uid()`

### trg_user_entry_set_hashdiff (BEFORE INSERT/UPDATE)

Calculates and sets `hashdiff` for SCD2 change detection.

```sql
-- Get trigger details
SELECT
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'tcm_user_tally_card_entries'
  AND t.tgname = 'trg_user_entry_set_hashdiff';
```

**Trigger Details:**
- **Timing:** BEFORE INSERT, BEFORE UPDATE
- **Level:** ROW
- **Function:** `fn_user_entry_set_hashdiff()`
- **Purpose:** Calculates SHA256 hash of all fields for SCD2 uniqueness
- **Requires:** `pgcrypto` extension

## List All Triggers

### List All Triggers in Public Schema

```sql
-- List all triggers in public schema
SELECT
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  CASE t.tgtype & 2
    WHEN 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE t.tgtype & 4
    WHEN 4 THEN 'ROW'
    ELSE 'STATEMENT'
  END as level,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
```

## Trigger Execution Order

### Get Trigger Execution Order for a Table

```sql
-- Get triggers in execution order (by position)
SELECT
  t.tgname as trigger_name,
  t.tgtype as trigger_type,
  CASE t.tgtype & 2
    WHEN 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'tcm_user_tally_card_entries'
  AND NOT t.tgisinternal
ORDER BY 
  CASE WHEN (t.tgtype & 2) = 2 THEN 0 ELSE 1 END, -- BEFORE first
  t.tgname;
```

## Enable/Disable Triggers

### Disable a Trigger

```sql
-- Disable a trigger (useful for maintenance)
ALTER TABLE tcm_user_tally_card_entries
DISABLE TRIGGER t_bu_entries_noop;
```

### Enable a Trigger

```sql
-- Enable a trigger
ALTER TABLE tcm_user_tally_card_entries
ENABLE TRIGGER t_bu_entries_noop;
```

### Disable All Triggers on a Table

```sql
-- Disable all triggers on a table
ALTER TABLE tcm_user_tally_card_entries
DISABLE TRIGGER ALL;
```

### Enable All Triggers on a Table

```sql
-- Enable all triggers on a table
ALTER TABLE tcm_user_tally_card_entries
ENABLE TRIGGER ALL;
```











