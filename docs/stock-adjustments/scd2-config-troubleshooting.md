# SCD2 Config "No config found" - Troubleshooting Guide

## Error Message

```
No SCD2 config found for public.tcm_user_tally_card_entries
```

## Root Cause Analysis

This error occurs when `fn_scd2_get_config()` cannot find a matching row in the `scd2_resource_config` table. Possible causes:

1. **Registration step didn't run** - The `SELECT public.fn_scd2_register_resource(...)` statements in step 11 might not have executed
2. **Table name mismatch** - The stored `table_name` doesn't match what `regclass::text` produces
3. **Config table is empty** - The registration failed silently

## Immediate Diagnostic Steps

### Step 1: Check Config Table Contents

Run this in Supabase SQL Editor:

```sql
-- Check what's in the config table
SELECT 
  table_name,
  anchor_col,
  temporal_col,
  user_scoped,
  created_at
FROM public.scd2_resource_config
ORDER BY table_name;
```

**Expected Result:** Should show 2 rows:
- `public.tcm_user_tally_card_entries`
- `public.tcm_tally_cards`

**If empty:** The registration step didn't run. Proceed to Step 2.

### Step 2: Check What regclass::text Produces

```sql
-- Check what regclass conversion produces
SELECT 
  'public.tcm_user_tally_card_entries'::regclass::text AS entries_regclass,
  'public.tcm_tally_cards'::regclass::text AS tally_regclass;
```

**Expected Result:**
- `entries_regclass`: `public.tcm_user_tally_card_entries`
- `tally_regclass`: `public.tcm_tally_cards`

### Step 3: Test Config Getter Directly

```sql
-- Test the config getter function
SELECT 
  public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) AS entries_config,
  public.fn_scd2_get_config('public.tcm_tally_cards'::regclass) AS tally_config;
```

**Expected Result:** Both should return JSONB objects, not NULL.

## Fix: Apply the Fix Migration

I've created a fix migration that:

1. **Re-registers resources** (safe UPSERT - won't duplicate)
2. **Makes config getter more robust** (handles schema prefix variations)
3. **Verifies the fix works**

### Apply the Fix

Run this migration file:

```
supabase/migrations/20250202_fix_scd2_config_lookup.sql
```

Or copy-paste into Supabase SQL Editor and execute.

### What the Fix Does

1. **Re-registers both resources** - Ensures config table has the data
2. **Improves config getter** - Now handles:
   - `'public.tcm_user_tally_card_entries'` (with schema)
   - `'tcm_user_tally_card_entries'` (without schema)
   - Case variations
3. **Adds verification** - Shows diagnostic output after applying

## Manual Fix (If Migration Doesn't Work)

If you prefer to fix manually:

```sql
-- 1. Re-register Stock Adjustments
SELECT public.fn_scd2_register_resource(
  'public.tcm_user_tally_card_entries',
  'tally_card_number',
  'updated_at',
  true,
  '[
    {"name":"updated_by_user_id","type":"uuid","normalize":"none"},
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"card_uid","type":"uuid","normalize":"none"},
    {"name":"qty","type":"integer","normalize":"none"},
    {"name":"location","type":"text","normalize":"lower_trim"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"role_family","type":"text","normalize":"lower_trim"},
    {"name":"reason_code","type":"text","normalize":"lower_trim","default":"unspecified"},
    {"name":"multi_location","type":"boolean","normalize":"none","default":"false"}
  ]'::jsonb,
  ARRAY['updated_by_user_id', 'card_uid', 'hashdiff']::text[]
);

-- 2. Re-register Tally Cards
SELECT public.fn_scd2_register_resource(
  'public.tcm_tally_cards',
  'card_uid',
  'snapshot_at',
  false,
  '[
    {"name":"card_uid","type":"uuid","normalize":"none"},
    {"name":"warehouse_id","type":"uuid","normalize":"none"},
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"item_number","type":"bigint","normalize":"none"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"is_active","type":"boolean","normalize":"none","default":"true"}
  ]'::jsonb,
  ARRAY['card_uid', 'hashdiff']::text[]
);

-- 3. Verify
SELECT table_name FROM public.scd2_resource_config;
```

## After Applying Fix

1. **Refresh your browser** (or restart Next.js dev server if needed)
2. **Try the edit operation again**
3. **Check browser console** - Should see: `[patch-scd2] Calling RPC function fn_tcm_user_tally_card_entries_patch_scd2_v3 (v3=true)...`
4. **Verify it works** - Edit should succeed

## Prevention

The fix migration makes the config getter more robust, so even if there are minor table name format differences, it will still find the config.

## Still Having Issues?

If the fix doesn't work, run the diagnostic script:

```sql
-- Run full diagnostic
\i scripts/diagnose-scd2-config-issue.sql
```

This will show:
- What's in the config table
- What `regclass::text` produces
- Whether the lookup works
- Any mismatches



