# Stock Adjustments Database Migration Guide

## Overview

This guide explains the safe migration steps for updating the Stock Adjustments database objects to support `reason_code`, `multi_location`, and child locations.

## Prerequisites

✅ **Columns already added** (you confirmed these exist):
- `reason_code` text (default 'UNSPECIFIED')
- `multi_location` boolean (default false)
- Table `tcm_user_tally_card_entry_locations` created

## Migration File

**File:** `supabase/migrations/20250131_final_stock_adjustments_update.sql`

## What This Migration Does

### 1. Enables pgcrypto Extension
- **Why:** Required for `digest()` function used in `fn_user_entry_set_hashdiff` trigger
- **Safety:** Uses `IF NOT EXISTS` - safe to run multiple times
- **Impact:** None if already installed

### 2. Updates View (`v_tcm_user_tally_card_entries`)
- **Why:** Remove dependency on `is_current` column (which doesn't exist)
- **Change:** Uses `DISTINCT ON (tally_card_number) ORDER BY updated_at DESC` instead
- **Safety:** `CREATE OR REPLACE` - no data loss, just changes filtering logic
- **Impact:** View now shows latest row per `tally_card_number` based on `updated_at`

### 3. Updates RLS Policy (Child Table)
- **Why:** Remove dependency on `is_current` column
- **Change:** Checks if entry's `updated_at = MAX(updated_at)` for that `tally_card_number`
- **Safety:** `DROP IF EXISTS` then `CREATE` - ensures clean state
- **Impact:** Same security behavior, different implementation

### 4. Updates RPC Function (`fn_user_entry_patch_scd2`)
- **Why:** Support new fields (`reason_code`, `multi_location`, `locations`)
- **Change:** 
  - New signature: `(p_id, p_reason_code, p_multi_location, p_qty, p_location, p_note, p_locations)`
  - Uses `updated_at DESC` instead of `is_current`
  - Handles child locations transactionally
- **Safety:** Drops old signature first, then creates new one
- **Impact:** 
  - ⚠️ **Breaking:** Old function calls will fail (but app code is updated)
  - ✅ **Safe:** New function handles all fields correctly

## Step-by-Step Migration

### Step 1: Test First (Recommended)

Run the quick test script to diagnose any issues:

**File:** `docs/stock-adjustments/database/quick-test.sql`

This will:
- ✅ Check if pgcrypto is installed
- ✅ Test if digest() works directly
- ✅ Check if hashdiff function exists
- ✅ Show if function uses fully qualified digest() name

**Expected Results:**
- All should show ✅ (green checkmarks)
- If you see ⚠️ or ❌, the migration will fix it

### Step 2: Backup (Optional)

```sql
-- Optional: Create a backup of the function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'fn_user_entry_patch_scd2' 
  AND pronamespace = 'public'::regnamespace;
```

### Step 3: Run Migration

Copy and paste the entire contents of `supabase/migrations/20250131_final_stock_adjustments_update.sql` into Supabase SQL Editor and execute.

### Step 4: Verify

Run these verification queries:

```sql
-- 1. Check pgcrypto is installed
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 2. Check view works
SELECT COUNT(*) FROM v_tcm_user_tally_card_entries;

-- 3. Check function exists with new signature
SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_user_entry_patch_scd2';

-- 4. Check RLS policy exists
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'tcm_user_tally_card_entry_locations';
```

## Rollback Plan

If you need to rollback:

### 1. Restore Old Function Signature

```sql
-- Restore old function (if you have the backup)
CREATE OR REPLACE FUNCTION public.fn_user_entry_patch_scd2(
  p_id uuid,
  p_qty integer,
  p_location text,
  p_note text
)
RETURNS public.tcm_user_tally_card_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- [paste old function body here]
$function$;
```

### 2. Restore Old View (if needed)

```sql
-- If you had a previous view definition, restore it here
CREATE OR REPLACE VIEW v_tcm_user_tally_card_entries AS
-- [paste old view definition]
```

## Testing Checklist

After migration, test:

- [ ] View returns data: `SELECT * FROM v_tcm_user_tally_card_entries LIMIT 5;`
- [ ] Function can be called: Test with a simple update
- [ ] RLS policy works: Try accessing child locations
- [ ] No `is_current` errors: Check application logs
- [ ] pgcrypto works: Check that hashdiff trigger still functions

## Safety Guarantees

✅ **Idempotent:** Can be run multiple times safely
✅ **No Data Loss:** Only changes logic, doesn't delete data
✅ **Backward Compatible View:** Same columns, different filtering
✅ **Safe RLS:** Same security behavior, different implementation
⚠️ **Breaking Function Change:** Old calls fail, but app code is updated

## Notes

- The migration assumes `reason_code` and `multi_location` columns already exist
- The migration assumes `tcm_user_tally_card_entry_locations` table already exists
- The migration removes dependency on `is_current` column (which doesn't exist)
- Application code has been updated to use new function signature

