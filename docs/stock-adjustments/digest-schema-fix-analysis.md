# Digest Schema Qualification Fix - Root Cause Analysis

## The Error

```
function digest(text, unknown) does not exist
```

## Root Cause

**In Supabase, the `digest()` function from the `pgcrypto` extension is located in the `extensions` schema, NOT in `public` or `pg_catalog`.**

### What Happened

1. **Old migrations (working):** Used `extensions.digest()` - ✅ Works
   - `20250131_final_stock_adjustments_update.sql`: Line 707
   - `20250201_create_tally_card_hashdiff_function.sql`: Line 74
   - `20250201_fix_tally_card_patch_scd2_search_path.sql`: Line 124

2. **New production pattern (broken):** Used unqualified `digest()` - ❌ Fails
   - `20250202_create_production_scd2_pattern.sql`: Line 189
   - Comment even says: "Note: In Supabase, if digest() is in extensions schema, may need to adjust"
   - But it wasn't adjusted!

### Why It Failed

The function `fn_scd2_hash()` has:
```sql
SET search_path TO public
```

This means when it calls `digest()`, PostgreSQL looks for:
1. `public.digest()` - ❌ Doesn't exist
2. `pg_catalog.digest()` - ❌ Doesn't exist in Supabase
3. `extensions.digest()` - ✅ This is where it actually is!

But because `extensions` is not in the search_path, the unqualified `digest()` call fails.

## The Fix

**Change:** `digest(v_payload, 'sha256')`  
**To:** `extensions.digest(v_payload, 'sha256')`

### Why This Works

1. **Explicit schema qualification** bypasses search_path
2. **Matches existing pattern** used in all other migrations
3. **Single point of change** - only `fn_scd2_hash()` needs fixing
4. **Cascades automatically** - trigger shim and wrapper both call `fn_scd2_hash()`, so they inherit the fix

## Migration File

`supabase/migrations/20250202_fix_digest_schema_qualification.sql`

This migration:
1. Grants usage on `extensions` schema (safety)
2. Replaces `fn_scd2_hash()` with `extensions.digest()` version
3. Includes verification test

## Verification

After running the migration, the hash function should work. The verification block will:
- Test with a real config
- Generate a hash
- Show success message

## Prevention

**Going forward:** Always use `extensions.digest()` in Supabase migrations, never unqualified `digest()`.


