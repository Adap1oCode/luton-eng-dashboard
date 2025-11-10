# Stock Adjustments Database Documentation

This folder contains lookup scripts and documentation for the Stock Adjustments database objects.

## Structure

- **[tables-and-views.md](./tables-and-views.md)** - Scripts for querying table and view definitions, schemas, indexes, constraints, and statistics
- **[functions.md](./functions.md)** - Scripts for querying function definitions, signatures, and dependencies
- **[triggers.md](./triggers.md)** - Scripts for querying trigger definitions, execution order, and enable/disable commands
- **[rls-policies.md](./rls-policies.md)** - Scripts for querying Row Level Security policies and testing access
- **[extensions.md](./extensions.md)** - Scripts for checking installed extensions and their dependencies

## Quick Reference

### Main Tables

- `tcm_user_tally_card_entries` - Main stock adjustment entries table (SCD2)
- `tcm_user_tally_card_entry_locations` - Child table for multi-location entries
- `v_tcm_user_tally_card_entries` - View with enriched data (warehouse, user name, etc.)

### Key Functions

- `fn_user_entry_patch_scd2()` - Main RPC function for updating entries with SCD2 support
- `fn_user_entry_set_hashdiff()` - Trigger function that calculates hashdiff
- `set_entry_user_id()` - Trigger function that sets updated_by_user_id
- `tcm_entries_skip_noop()` - Trigger function that prevents no-op updates

### Key Triggers

- `t_bu_entries_noop` - BEFORE UPDATE - Prevents duplicate SCD2 rows
- `trg_set_entry_user` - BEFORE INSERT - Sets updated_by_user_id
- `trg_user_entry_set_hashdiff` - BEFORE INSERT/UPDATE - Calculates hashdiff

### Required Extensions

- `pgcrypto` - Required for `digest()` function in hashdiff calculation

## Common Queries

### Get Complete Table Report

```sql
SELECT * FROM dbdocs.v_table_report_combined
WHERE table_name = 'tcm_user_tally_card_entries';
```

### Get Function Definition

```sql
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_patch_scd2';
```

### Get All Triggers for a Table

```sql
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'tcm_user_tally_card_entries';
```

## Usage

1. Open the relevant documentation file for the type of object you want to query
2. Copy the SQL script that matches your needs
3. Paste into Supabase SQL Editor or your PostgreSQL client
4. Modify table/function names as needed
5. Execute and review results

## Notes

- All scripts assume the `public` schema
- Some queries require appropriate permissions
- The `dbdocs.v_table_report_combined` view may not exist in all environments - use alternative queries if needed
- Always test queries in a development environment first





