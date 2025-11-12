# Stock Adjustments RPC Migration Summary

## Overview
This document summarizes the holistic changes made to align the Stock Adjustments SCD2 update flow with the database triggers and RPC function.

## Problems Identified

1. **`digest()` function error**: The `fn_user_entry_set_hashdiff` trigger uses `digest()` which requires the `pgcrypto` extension, but it may not have been enabled.

2. **RPC function signature mismatch**: The production `fn_user_entry_patch_scd2` function only accepts `(p_id, p_qty, p_location, p_note)` but we need to support `reason_code`, `multi_location`, and child `locations`.

3. **Application code complexity**: Our application code was trying to work around the RPC limitations by doing separate UPDATE statements, which could cause:
   - Hash conflicts (hashdiff trigger fires on separate updates)
   - Race conditions
   - Inconsistent state

4. **No-op trigger alignment**: The `tcm_entries_skip_noop` trigger checks all fields including `reason_code` and `multi_location`, but the RPC function wasn't aware of these fields.

## Solutions Implemented

### 1. Database Migration (`20250131_update_rpc_and_fix_digest.sql`)

**Changes:**
- ✅ Enables `pgcrypto` extension (fixes `digest()` error)
- ✅ Drops old RPC function signature `(uuid, integer, text, text)`
- ✅ Creates new RPC function with extended signature:
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
  ```

**Key Features:**
- ✅ Change detection includes all fields (mirrors `tcm_entries_skip_noop` logic)
- ✅ Returns existing record if no changes detected (prevents duplicate SCD2 rows)
- ✅ Handles child locations transactionally within the function
- ✅ Properly sets `updated_by_user_id` from auth context
- ✅ Maintains `role_family` from existing record

### 2. Application Code Simplification (`patch-scd2/route.ts`)

**Before:** Complex workaround with multiple UPDATE statements
**After:** Single RPC call that handles everything

**Benefits:**
- ✅ All logic in one place (database)
- ✅ Transactional guarantees
- ✅ No hash conflicts
- ✅ Simpler, more maintainable code

### 3. Trigger Alignment

The following triggers now work together harmoniously:

1. **`tcm_entries_skip_noop`** (BEFORE UPDATE)
   - Checks all fields including `reason_code` and `multi_location`
   - Returns NULL to skip update if nothing changed

2. **`fn_user_entry_set_hashdiff`** (BEFORE INSERT/UPDATE)
   - Includes `reason_code` and `multi_location` in hash calculation
   - Requires `pgcrypto` extension (now enabled)

3. **`set_entry_user_id`** (BEFORE INSERT)
   - Sets `updated_by_user_id` from auth context

## Migration Steps

1. **Apply the migration:**
   ```sql
   -- Run in Supabase SQL Editor:
   -- supabase/migrations/20250131_update_rpc_and_fix_digest.sql
   ```

2. **Verify pgcrypto is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
   ```

3. **Test the RPC function:**
   ```sql
   -- Should return the current record if no changes
   SELECT * FROM fn_user_entry_patch_scd2(
     'your-entry-id'::uuid,
     NULL, -- reason_code
     NULL, -- multi_location
     NULL, -- qty
     NULL, -- location
     NULL, -- note
     NULL  -- locations
   );
   ```

## Testing Checklist

- [ ] Apply migration successfully
- [ ] Verify `pgcrypto` extension is enabled
- [ ] Test updating `reason_code` only
- [ ] Test updating `multi_location` only
- [ ] Test updating with child locations
- [ ] Test updating with no changes (should return existing record)
- [ ] Verify no duplicate SCD2 rows are created
- [ ] Verify hashdiff is calculated correctly
- [ ] Verify child locations are managed correctly

## Rollback Plan

If issues arise, you can rollback by:

1. **Restore old RPC function:**
   ```sql
   -- Restore from backup or recreate with old signature
   CREATE OR REPLACE FUNCTION public.fn_user_entry_patch_scd2(
     p_id uuid,
     p_qty integer,
     p_location text,
     p_note text
   ) RETURNS public.tcm_user_tally_card_entries ...
   ```

2. **Revert application code:**
   - Restore previous version of `patch-scd2/route.ts` from git history

## Notes

- The RPC function returns a single row type (`tcm_user_tally_card_entries`), not a TABLE
- Supabase's JavaScript client automatically converts arrays/objects to JSONB
- All parameters except `p_id` are optional (DEFAULT NULL) for flexibility
- The function uses `IS DISTINCT FROM` for proper NULL-aware comparison







