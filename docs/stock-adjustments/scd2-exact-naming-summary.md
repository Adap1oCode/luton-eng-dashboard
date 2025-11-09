# SCD2 Exact Naming Implementation Summary

**Date**: 2025-02-02  
**Migration**: `supabase/migrations/20250202_create_generic_scd2_base_exact_naming.sql`

## Overview

All resource-specific artifacts now use exact table/view names with no aliases. This ensures 1:1 naming consistency across functions, triggers, and configs.

## Naming Changes

### Functions Renamed

| Old Name | New Name | Table |
|----------|----------|-------|
| `fn_user_entry_patch_scd2_v3` | `fn_tcm_user_tally_card_entries_patch_scd2_v3` | `tcm_user_tally_card_entries` |
| `fn_tally_card_patch_scd2` | `fn_tcm_tally_cards_patch_scd2_v3` | `tcm_tally_cards` |

### Triggers Renamed

| Old Name | New Name | Table |
|----------|----------|-------|
| `trg_user_entry_set_hashdiff` | `trg_tcm_user_tally_card_entries_hash` | `tcm_user_tally_card_entries` |
| `trg_entries_hash` | `trg_tcm_user_tally_card_entries_hash` | `tcm_user_tally_card_entries` |
| `trg_tally_card_set_hashdiff` | `trg_tcm_tally_cards_hash` | `tcm_tally_cards` |

### Shared Functions (Unchanged)

- `fn_scd2_hash` - Hash helper (single source of truth)
- `fn_scd2_get_config` - Config retrieval (updated to use exact table names)
- `fn_scd2_trigger_hash_shim` - Generic trigger shim
- `fn_scd2_patch_base` - Shared SCD2 base

## Code Changes

### API Routes Updated

1. **Stock Adjustments**: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
   - Line 57: `"fn_user_entry_patch_scd2"` → `"fn_tcm_user_tally_card_entries_patch_scd2_v3"`

2. **Tally Cards**: `src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts`
   - Line 33: `"fn_tally_card_patch_scd2"` → `"fn_tcm_tally_cards_patch_scd2_v3"`

## Migration Steps

### 1. Pre-Checks

```sql
-- Verify pgcrypto extension
SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') as pgcrypto_installed;

-- Check existing triggers
SELECT t.tgname, c.relname 
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname IN ('tcm_user_tally_card_entries', 'tcm_tally_cards')
  AND t.tgname LIKE '%hash%';
```

### 2. Apply Migration

```bash
# Using Supabase CLI
supabase migration up

# Or apply directly in Supabase SQL Editor
# Copy contents of: supabase/migrations/20250202_create_generic_scd2_base_exact_naming.sql
```

### 3. Verification

```bash
# Run validation script
psql $DATABASE_URL -f scripts/validate-scd2-exact-naming.sql
```

## Constraint Parity

### Stock Adjustments

- **Table**: `tcm_user_tally_card_entries`
- **Constraint**: `uq_entries_uid_hash UNIQUE (updated_by_user_id, card_uid, hashdiff) WHERE (card_uid IS NOT NULL)`
- **Idempotency WHERE**: `updated_by_user_id = $1 AND card_uid = $2 AND hashdiff = $3`
- **Match**: ✅ Exact match

### Tally Cards

- **Table**: `tcm_tally_cards`
- **Expected Constraint**: `UNIQUE (card_uid, hashdiff)` (or similar)
- **Idempotency WHERE**: `card_uid = $1 AND hashdiff = $2` (when `p_user_scoped = false`)
- **Status**: ✅ Implemented in base function

## Digest Namespace

- **Usage**: Unqualified `digest()` throughout
- **Location**: `fn_scd2_hash()` function (line 91)
- **Note**: If Supabase requires `extensions.digest()`, update line 91

## Backward Compatibility

- ✅ v1 functions preserved: `fn_user_entry_patch_scd2`, `fn_tally_card_patch_scd2`
- ✅ v2 functions preserved: `fn_user_entry_patch_scd2_v2`
- ✅ Deprecation comments added to legacy functions
- ✅ All versions can coexist

## Rollback Plan

If issues occur, revert API routes:

1. **Stock Adjustments**: Change RPC call back to `"fn_user_entry_patch_scd2_v2"`
2. **Tally Cards**: Change RPC call back to `"fn_tally_card_patch_scd2"`

Legacy functions remain functional.

## Files Modified

1. **Migration**: `supabase/migrations/20250202_create_generic_scd2_base_exact_naming.sql`
2. **API Route**: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
3. **API Route**: `src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts`
4. **Validation Script**: `scripts/validate-scd2-exact-naming.sql`
5. **Migration Plan**: `docs/stock-adjustments/scd2-exact-naming-migration-plan.md`

## Next Steps

1. ✅ Apply migration
2. ✅ Run validation script
3. ✅ Test API routes
4. ✅ Verify hash parity
5. ✅ Monitor for issues



