# SCD2 v3 - Current State & Next Steps

## ✅ Migration Status

**All SQL migration steps completed successfully!**

The production SCD2 pattern is now deployed:
- Config table created and populated
- All functions created (hash helper, base function, wrappers)
- Triggers attached to both tables
- Constraint parity view created

## 📊 Current SCD2 Function Usage

### Stock Adjustments Screen
**API Route:** `/api/stock-adjustments/[id]/actions/patch-scd2`

**Currently Using:** `fn_tcm_user_tally_card_entries_patch_scd2_v3` (v3) ✅

**Fallback:** `fn_user_entry_patch_scd2_v2` (if `NEXT_PUBLIC_SCD2_USE_V3=false`)

**Feature Flag:** `NEXT_PUBLIC_SCD2_USE_V3` (default: `true` = v3 enabled)

### Tally Cards Screen
**API Route:** `/api/tally-cards/[id]/actions/patch-scd2`

**Currently Using:** `fn_tcm_tally_cards_patch_scd2_v3` (v3) ✅

**Fallback:** `fn_tally_card_patch_scd2` (if `NEXT_PUBLIC_SCD2_USE_V3=false`)

**Feature Flag:** `NEXT_PUBLIC_SCD2_USE_V3` (default: `true` = v3 enabled)

## 🎯 Next Steps: Testing

### Step 1: Verify Feature Flag (Optional)

Check if the environment variable is set (it defaults to `true` if not set):

```bash
# Check current value (if set)
echo $NEXT_PUBLIC_SCD2_USE_V3

# If you want to explicitly enable v3 (default behavior)
export NEXT_PUBLIC_SCD2_USE_V3=true
```

### Step 2: Test Stock Adjustments Edit Screen

1. **Navigate to:** Stock Adjustments Edit screen
2. **Test Scenarios:**
   - ✅ **No Change Test**: Open an entry, don't change anything, save → Should return existing row (no new SCD2 row)
   - ✅ **Single Change Test**: Change `qty` or `note`, save → Should create new SCD2 row with new `id`
   - ✅ **Duplicate Submit Test**: Make same change twice → Should return same row (idempotent)
   - ✅ **Hash Parity**: Check browser console logs for `[patch-scd2] Calling RPC function fn_tcm_user_tally_card_entries_patch_scd2_v3`

3. **Check Browser Console:**
   - Look for: `[patch-scd2] Calling RPC function fn_tcm_user_tally_card_entries_patch_scd2_v3 (v3=true)...`
   - This confirms v3 is being used

4. **Check Database:**
   ```sql
   -- Verify new SCD2 row was created (if change was made)
   SELECT id, qty, note, updated_at, hashdiff
   FROM public.tcm_user_tally_card_entries
   WHERE tally_card_number = '<your_test_card_number>'
   ORDER BY updated_at DESC;
   ```

### Step 3: Test Tally Cards Edit Screen

1. **Navigate to:** Tally Cards Edit screen
2. **Test Scenarios:**
   - ✅ **No Change Test**: Open a card, don't change anything, save → Should return existing row
   - ✅ **Single Change Test**: Change `note` or `item_number`, save → Should create new SCD2 row
   - ✅ **Hash Parity**: Check browser console for v3 function call

3. **Check Browser Console:**
   - Look for v3 function being called (check network tab for API calls)

### Step 4: Verify Hash Parity (Optional)

Run the test script to verify hash calculation:

```bash
# Run test script
psql $DATABASE_URL -f scripts/test-production-scd2-v3.sql
```

Or manually test:

```sql
-- Quick hash parity check
DO $$
DECLARE
  v_config jsonb;
  v_test_record jsonb;
  v_helper_hash text;
  v_trigger_hash text;
BEGIN
  v_config := public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass);
  
  v_test_record := jsonb_build_object(
    'updated_by_user_id', (SELECT id FROM public.users LIMIT 1),
    'tally_card_number', 'TEST-HASH',
    'card_uid', NULL,
    'qty', 10,
    'location', 'A1',
    'note', 'Test',
    'role_family', 'test',
    'reason_code', 'TEST',
    'multi_location', false
  );
  
  v_helper_hash := public.fn_scd2_hash(v_test_record, jsonb_build_object('hashdiff_columns', v_config->'hashdiff_columns'));
  
  INSERT INTO public.tcm_user_tally_card_entries (
    updated_by_user_id, role_family, tally_card_number, qty, location, note, reason_code, multi_location
  ) VALUES (
    (SELECT id FROM public.users LIMIT 1), 'test', 'TEST-HASH', 10, 'A1', 'Test', 'TEST', false
  ) RETURNING hashdiff INTO v_trigger_hash;
  
  IF v_helper_hash = v_trigger_hash THEN
    RAISE NOTICE '✓ Hash parity: PASSED';
  ELSE
    RAISE EXCEPTION '✗ Hash parity: FAILED';
  END IF;
  
  DELETE FROM public.tcm_user_tally_card_entries WHERE tally_card_number = 'TEST-HASH';
END $$;
```

## 🔍 What to Look For

### ✅ Success Indicators

1. **Browser Console:**
   - `[patch-scd2] Calling RPC function fn_tcm_user_tally_card_entries_patch_scd2_v3 (v3=true)...`
   - No errors

2. **Network Tab:**
   - API call to `/api/stock-adjustments/[id]/actions/patch-scd2` returns 200 OK
   - Response contains updated row with new `id` (if change was made)

3. **Database:**
   - New SCD2 row created when changes are made
   - `hashdiff` column populated
   - No duplicate rows for identical changes (idempotency)

### ⚠️ Potential Issues

1. **If v3 function not found:**
   - Check that migration ran successfully
   - Verify function exists: `\df+ public.fn_tcm_user_tally_card_entries_patch_scd2_v3`

2. **If hashdiff is NULL:**
   - Check trigger is attached: `SELECT * FROM pg_trigger WHERE tgname = 'trg_tcm_user_tally_card_entries_hash';`
   - Verify config table has entry: `SELECT * FROM public.scd2_resource_config;`

3. **If duplicate rows created:**
   - Check constraint parity: `SELECT * FROM public.v_scd2_constraint_parity;`
   - Verify unique constraint exists on table

## 📝 Summary

| Screen | Current Function | Version | Feature Flag |
|--------|-----------------|---------|--------------|
| **Stock Adjustments** | `fn_tcm_user_tally_card_entries_patch_scd2_v3` | v3 ✅ | `NEXT_PUBLIC_SCD2_USE_V3=true` (default) |
| **Tally Cards** | `fn_tcm_tally_cards_patch_scd2_v3` | v3 ✅ | `NEXT_PUBLIC_SCD2_USE_V3=true` (default) |

## 🚀 Ready to Test!

Everything is set up and ready. The UI should be using v3 by default. Go ahead and test the edit screens!



