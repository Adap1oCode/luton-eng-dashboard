# SCD2 v3 Implementation Review Checklist

**Date**: 2025-02-02  
**Migration**: `20250202_create_generic_scd2_base.sql`

## Review Questions

### 1. Does the trigger and wrapper both rely on fn_scd2_hash (no divergence)?

**Answer**: ✅ **YES**

- **Trigger**: `fn_scd2_trigger_hash_shim()` calls `public.fn_scd2_hash(v_rec, v_config)` (line ~150)
- **Wrapper**: `fn_scd2_patch_base()` calls `public.fn_scd2_hash(v_updated_jsonb, p_hash_config)` (line ~306)
- **Single Source**: `fn_scd2_hash()` is the only function that calculates hashdiff

**Evidence**:
- `fn_scd2_hash()` is defined once (lines 17-93)
- Both trigger and base function call the same helper
- No duplicate hash calculation logic

---

### 2. Is digest() usage consistent (no extensions.digest anywhere)?

**Answer**: ✅ **YES**

- **Hash Helper**: Uses `digest(v_payload, 'sha256')` (line 91) - unqualified
- **No extensions.digest**: Not used anywhere in the migration
- **Note**: If `digest()` is in extensions schema in Supabase, may need to adjust search_path or use `extensions.digest()` as fallback. For now, follows requirement to use unqualified `digest()`.

**Evidence**:
- Single call to `digest()` in `fn_scd2_hash()` function
- No other digest() calls in the migration
- Consistent usage throughout

---

### 3. Is the Stock Adjustments wrapper free of hardcoded hash columns (pulled from fn_scd2_get_config)?

**Answer**: ✅ **YES**

- **Wrapper**: `fn_user_entry_patch_scd2_v3()` calls `fn_scd2_get_config()` to get config (line ~450)
- **No Hardcoding**: Config is retrieved dynamically, not hardcoded in wrapper
- **Base Function**: Uses `p_hash_config` parameter (passed from wrapper)

**Evidence**:
```sql
-- Wrapper (line ~450)
SELECT public.fn_scd2_get_config('public.tcm_user_tally_card_entries'::regclass) INTO v_cfg;

-- Base function uses v_cfg (no hardcoded columns)
v_new_id := public.fn_scd2_patch_base(..., v_cfg, ...);
```

---

### 4. Does the base function avoid dynamic SQL for business logic and return uuid?

**Answer**: ⚠️ **PARTIALLY**

- **Returns uuid**: ✅ Yes - function signature `RETURNS uuid` (line 200)
- **Dynamic SQL**: ⚠️ Uses some dynamic SQL for queries (EXECUTE format), but:
  - Only for table-agnostic queries (SELECT by id, anchor, etc.)
  - INSERT is table-specific (stock-adjustments only) - can be generalized later
  - No dynamic SQL for business rules (change detection, hashdiff calculation are static)

**Evidence**:
- Returns `uuid` (line 200)
- Dynamic SQL only for table-agnostic operations
- Business logic (change detection, hashdiff) is static
- INSERT is table-specific but can be generalized

**Note**: The INSERT statement is currently table-specific for stock-adjustments. This is acceptable for the initial implementation and can be generalized later when adding more resources.

---

### 5. Do the idempotency WHERE clauses exactly match the table's unique constraint?

**Answer**: ✅ **YES**

**Stock Adjustments Constraint** (expected):
```sql
CONSTRAINT uq_entries_uid_hash UNIQUE (updated_by_user_id, card_uid, hashdiff)
WHERE (card_uid IS NOT NULL)
```

**Base Function Idempotency Check** (lines 314-330):
- User-scoped: `WHERE updated_by_user_id = $1 AND card_uid = $2 AND hashdiff = $3`
- Matches constraint: ✅ `(updated_by_user_id, card_uid, hashdiff)`

**Evidence**:
- Line 316-319: User-scoped check uses `(updated_by_user_id, card_uid, hashdiff)`
- Matches constraint definition exactly
- Same column order and conditions

**Documentation Note**: The idempotency WHERE clause in `fn_scd2_patch_base()` (lines 314-330) exactly matches the unique constraint `uq_entries_uid_hash` on `tcm_user_tally_card_entries`: `(updated_by_user_id, card_uid, hashdiff)`.

---

### 6. Are existing functions preserved (backward compatibility)?

**Answer**: ✅ **YES**

- **v1**: `fn_user_entry_patch_scd2` - unchanged (not in this migration)
- **v2**: `fn_user_entry_patch_scd2_v2` - unchanged (not in this migration)
- **v3**: `fn_user_entry_patch_scd2_v3` - new function (line ~440)

**Evidence**:
- Migration only creates new functions
- No DROP statements for v1 or v2
- All versions can coexist
- API route can choose which version to use

---

### 7. Do tests cover no-op, insert, duplicate, and hash parity?

**Answer**: ⚠️ **PARTIALLY**

**Test File**: `scripts/test-scd2-v3.sql`

- ✅ **Hash Parity**: TEST 4 - Compares trigger hash vs helper hash
- ✅ **Functions Exist**: TEST 1 - Verifies all functions created
- ✅ **Config Retrieval**: TEST 3 - Verifies config works
- ⚠️ **No-Change**: TEST 5 - Signature check only (requires auth context to test fully)
- ⚠️ **Insert**: Not explicitly tested (requires auth context)
- ⚠️ **Duplicate**: Not explicitly tested (requires auth context and concurrent calls)

**Evidence**:
- Test file created with structure for all scenarios
- Some tests require auth context (need to run manually)
- Hash parity test is included and can run automatically

**Recommendation**: Add integration tests with auth context to cover no-op, insert, and duplicate scenarios.

---

## Summary

| Requirement | Status | Notes |
|------------|--------|-------|
| Single hash source | ✅ YES | `fn_scd2_hash()` used by both trigger and wrapper |
| Consistent digest() | ✅ YES | Unqualified `digest()` used (may need adjustment for Supabase) |
| Config-driven wrapper | ✅ YES | Wrapper pulls config from `fn_scd2_get_config()` |
| Base returns uuid | ✅ YES | Function signature returns `uuid` |
| No dynamic SQL for business logic | ⚠️ PARTIAL | Dynamic SQL only for table-agnostic queries |
| Idempotency matches constraint | ✅ YES | WHERE clause matches constraint exactly |
| Backward compatible | ✅ YES | v1/v2 preserved, v3 is new |
| Tests cover scenarios | ⚠️ PARTIAL | Hash parity covered, others need auth context |

## Next Steps

1. **Test in Supabase**: Verify `digest()` is accessible (may need `extensions.digest()` or search_path adjustment)
2. **Run Test Script**: Execute `scripts/test-scd2-v3.sql` to verify functions
3. **Integration Tests**: Add tests with auth context for no-op, insert, duplicate scenarios
4. **API Integration**: Add feature flag to API route to use v3
5. **Validation**: Compare v3 behavior with v1 to ensure no regressions

## Constraint Parity Documentation

**Stock Adjustments** (`tcm_user_tally_card_entries`):
- **Constraint**: `uq_entries_uid_hash UNIQUE (updated_by_user_id, card_uid, hashdiff) WHERE (card_uid IS NOT NULL)`
- **Idempotency WHERE**: `updated_by_user_id = $1 AND card_uid = $2 AND hashdiff = $3`
- **Match**: ✅ Exact match (same columns, same order)

**Tally Cards** (future):
- **Expected Constraint**: `UNIQUE (card_uid, hashdiff)`
- **Idempotency WHERE**: `card_uid = $1 AND hashdiff = $2` (when `p_user_scoped = false`)
- **Status**: Not yet implemented (base function supports it)



