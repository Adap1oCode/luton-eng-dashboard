# SCD2 Exact Naming - Ordered Supabase Migration Plan

**Date**: 2025-02-02  
**Migration File**: `supabase/migrations/20250202_create_generic_scd2_base_exact_naming.sql`

## Prerequisites

- Supabase CLI installed and configured
- Database access (via CLI or Dashboard)
- pgcrypto extension enabled

## Step-by-Step Migration Plan

### Phase 1: Pre-Checks (Run First)

```sql
-- 1.1 Verify pgcrypto extension exists
SELECT 
  extname,
  extversion,
  n.nspname as schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'pgcrypto';

-- Expected: Should return pgcrypto row
-- If missing: Enable in Supabase Dashboard > Database > Extensions

-- 1.2 Check existing triggers (for reference)
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('tcm_user_tally_card_entries', 'tcm_tally_cards')
  AND t.tgname LIKE '%hash%'
ORDER BY c.relname, t.tgname;

-- 1.3 Check existing functions (for reference)
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%patch_scd2%'
    OR p.proname LIKE '%scd2%'
  )
ORDER BY p.proname;

-- 1.4 Test digest() availability
DO $$
BEGIN
  PERFORM encode(digest('test', 'sha256'), 'hex');
  RAISE NOTICE '✓ digest() is accessible';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'digest() failed: %. May need to use extensions.digest() or adjust search_path.', SQLERRM;
END $$;
```

### Phase 2: Apply Migration

**Option A: Using Supabase CLI**

```bash
# Navigate to project root
cd /path/to/luton-eng-dashboard

# Apply migration
supabase migration up

# Or apply specific migration
supabase db push
```

**Option B: Using Supabase Dashboard**

1. Open Supabase Dashboard > SQL Editor
2. Copy entire contents of `supabase/migrations/20250202_create_generic_scd2_base_exact_naming.sql`
3. Paste and execute
4. Verify no errors

### Phase 3: Verification (Run After Migration)

```sql
-- 3.1 Verify new functions exist
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proname LIKE '%_v3' THEN 'NEW'
    ELSE 'LEGACY'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'fn_scd2_hash',
    'fn_scd2_get_config',
    'fn_scd2_trigger_hash_shim',
    'fn_scd2_patch_base',
    'fn_tcm_user_tally_card_entries_patch_scd2_v3',
    'fn_tcm_tally_cards_patch_scd2_v3'
  )
ORDER BY p.proname;

-- Expected: All 6 functions should exist

-- 3.2 Verify triggers exist
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    ELSE 'DISABLED'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.tgname IN (
    'trg_tcm_user_tally_card_entries_hash',
    'trg_tcm_tally_cards_hash'
  )
ORDER BY c.relname;

-- Expected: Both triggers should exist and be ENABLED

-- 3.3 Test config retrieval
SELECT 
  'tcm_user_tally_card_entries' as table_name,
  jsonb_array_length(public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass)->'hashdiff_columns') as column_count
UNION ALL
SELECT 
  'tcm_tally_cards' as table_name,
  jsonb_array_length(public.fn_scd2_get_config('public.tcm_tally_cards'::regclass)->'hashdiff_columns') as column_count;

-- Expected: Both should return non-null column counts

-- 3.4 Verify function callability (syntax check only)
-- Note: Full execution requires auth context
SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'fn_tcm_user_tally_card_entries_patch_scd2_v3',
    'fn_tcm_tally_cards_patch_scd2_v3'
  );
```

### Phase 4: Test API Routes

**Stock Adjustments**:
```bash
# Test with real record ID (requires auth)
curl -X POST http://localhost:3000/api/stock-adjustments/{record-id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"qty": 100, "location": "G5"}'

# Expected: 200 OK with { row: {...} }
```

**Tally Cards**:
```bash
# Test with real record ID (requires auth)
curl -X POST http://localhost:3000/api/tally-cards/{record-id}/actions/patch-scd2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"note": "Updated note"}'

# Expected: 200 OK with { row: {...} }
```

### Phase 5: Validation Checklist

Run `scripts/validate-scd2-exact-naming.sql`:

```bash
# Using psql
psql $DATABASE_URL -f scripts/validate-scd2-exact-naming.sql

# Or in Supabase SQL Editor
# Copy and paste contents of validate-scd2-exact-naming.sql
```

**Expected Results**:
- ✅ All functions exist
- ✅ All triggers exist and enabled
- ✅ Config retrieval works for both tables
- ✅ Hash parity test passes (or shows expected warnings)
- ✅ Idempotency WHERE matches constraints
- ✅ Digest() is accessible
- ✅ Legacy functions have deprecation comments

## Rollback Procedure

If issues occur:

### Quick Rollback (API Routes Only)

1. **Stock Adjustments**: Edit `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
   - Change line 57: `"fn_tcm_user_tally_card_entries_patch_scd2_v3"` → `"fn_user_entry_patch_scd2_v2"`

2. **Tally Cards**: Edit `src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts`
   - Change line 33: `"fn_tcm_tally_cards_patch_scd2_v3"` → `"fn_tally_card_patch_scd2"`

3. **Deploy**: Push changes to revert to legacy functions

### Full Rollback (If Needed)

```sql
-- Drop new triggers (if causing issues)
DROP TRIGGER IF EXISTS trg_tcm_user_tally_card_entries_hash ON public.tcm_user_tally_card_entries;
DROP TRIGGER IF EXISTS trg_tcm_tally_cards_hash ON public.tcm_tally_cards;

-- Recreate old triggers (if they existed)
-- Note: Old trigger functions may need to be recreated if they were dropped

-- Drop new functions (optional - they can coexist)
DROP FUNCTION IF EXISTS public.fn_tcm_user_tally_card_entries_patch_scd2_v3(uuid, text, boolean, integer, text, text);
DROP FUNCTION IF EXISTS public.fn_tcm_tally_cards_patch_scd2_v3(uuid, text, uuid, bigint, text, boolean);
```

## Troubleshooting

### Issue: digest() function not found

**Error**: `function digest(text, unknown) does not exist`

**Solution**:
1. Check if pgcrypto is enabled: `SELECT * FROM pg_extension WHERE extname = 'pgcrypto';`
2. If missing, enable in Supabase Dashboard > Database > Extensions
3. If enabled but still fails, update migration to use `extensions.digest()`:
   ```sql
   -- In fn_scd2_hash function, change line 91:
   RETURN encode(extensions.digest(v_payload, 'sha256'), 'hex');
   ```

### Issue: Function call fails with permission error

**Error**: `permission denied for function`

**Solution**:
```sql
-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.fn_tcm_user_tally_card_entries_patch_scd2_v3(uuid, text, boolean, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_tcm_tally_cards_patch_scd2_v3(uuid, text, uuid, bigint, text, boolean) TO authenticated;
```

### Issue: Trigger not firing

**Check**:
```sql
-- Verify trigger exists and is enabled
SELECT t.tgname, c.relname, t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname IN ('trg_tcm_user_tally_card_entries_hash', 'trg_tcm_tally_cards_hash');
```

**Solution**: If `tgenabled = 'D'`, enable it:
```sql
ALTER TABLE public.tcm_user_tally_card_entries ENABLE TRIGGER trg_tcm_user_tally_card_entries_hash;
ALTER TABLE public.tcm_tally_cards ENABLE TRIGGER trg_tcm_tally_cards_hash;
```

## Success Criteria

✅ All functions created with exact table names  
✅ All triggers created with exact table names  
✅ Config retrieval works for both tables  
✅ API routes updated to use new function names  
✅ Hash parity test passes  
✅ Idempotency WHERE matches constraints  
✅ No old function names in active use (only deprecated)  
✅ Legacy functions preserved with deprecation comments  

## Post-Migration Checklist

- [ ] Migration applied successfully
- [ ] All functions exist and are callable
- [ ] All triggers exist and are enabled
- [ ] Config retrieval works for both tables
- [ ] API routes tested (stock-adjustments)
- [ ] API routes tested (tally-cards)
- [ ] Hash parity verified
- [ ] Idempotency verified
- [ ] No errors in application logs
- [ ] Legacy functions have deprecation comments

## Next Steps After Migration

1. **Monitor**: Watch application logs for any errors
2. **Test**: Run full test suite
3. **Validate**: Compare v3 behavior with v1/v2
4. **Document**: Update any remaining documentation references
5. **Plan**: Schedule removal of v1/v2 functions (after v3 is proven)



