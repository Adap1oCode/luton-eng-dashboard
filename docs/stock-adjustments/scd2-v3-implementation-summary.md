# SCD2 v3 Implementation Summary

**Date**: 2025-02-02  
**Status**: ✅ Complete - Ready for Testing

## What Was Implemented

### 1. Hash Helper (Single Source of Truth) ✅

**Function**: `fn_scd2_hash(jsonb, jsonb)`

- **Purpose**: Single function that calculates hashdiff for all SCD2 operations
- **Used By**: 
  - Trigger shim (`fn_scd2_trigger_hash_shim`)
  - Base function (`fn_scd2_patch_base`)
- **Location**: `supabase/migrations/20250202_create_generic_scd2_base.sql` (lines 17-93)

**Features**:
- Config-driven column list
- Normalization rules (lower_trim, none)
- Default value handling
- Consistent NULL representation (`'∅'`)
- Uses `digest()` (unqualified, per requirements)

### 2. Resource Config Retrieval ✅

**Function**: `fn_scd2_get_config(regclass)`

- **Purpose**: Returns hashdiff config for a given table
- **Location**: Lines 98-120
- **Current**: Hardcoded config for `tcm_user_tally_card_entries`
- **Future**: Can be moved to a config table

### 3. Generic Trigger Hash Shim ✅

**Function**: `fn_scd2_trigger_hash_shim()`

- **Purpose**: Generic trigger function called by BEFORE INSERT OR UPDATE triggers
- **Location**: Lines 125-185
- **Features**:
  - Gets config for table via `TG_TABLE_NAME`
  - Builds record JSONB from NEW
  - Resolves `updated_by_user_id` if needed
  - Calls `fn_scd2_hash()` to set `NEW.hashdiff`

### 4. Shared SCD2 Base Function ✅

**Function**: `fn_scd2_patch_base(regclass, uuid, text, text, boolean, jsonb, jsonb)`

- **Purpose**: Generic SCD2 logic that works with any table
- **Returns**: `uuid` (id of new/existing row)
- **Location**: Lines 190-420

**Features**:
- Loads current record and locks with FOR UPDATE
- Change detection (compares updates with current)
- Calculates expected hashdiff using `fn_scd2_hash()`
- Idempotency check (matches unique constraint)
- Inserts new row (hashdiff set by trigger)
- Handles race conditions (unique_violation)

**Note**: INSERT is currently table-specific for stock-adjustments. Can be generalized later.

### 5. Stock Adjustments Wrapper (v3) ✅

**Function**: `fn_user_entry_patch_scd2_v3(...)`

- **Purpose**: Thin wrapper that calls base function
- **Location**: Lines 440-475
- **Features**:
  - Gets config from `fn_scd2_get_config()`
  - Calls `fn_scd2_patch_base()` with stock-adjustments parameters
  - Returns row (fetches by id returned from base)

### 6. Trigger Update ✅

**Trigger**: `trg_entries_hash`

- **Replaces**: `trg_user_entry_set_hashdiff`
- **Uses**: `fn_scd2_trigger_hash_shim()`
- **Location**: Lines 480-485

### 7. Backward Compatibility ✅

- **v1**: `fn_user_entry_patch_scd2` - unchanged (not in this migration)
- **v2**: `fn_user_entry_patch_scd2_v2` - unchanged (not in this migration)
- **v3**: `fn_user_entry_patch_scd2_v3` - new function

All versions can coexist. API route can choose which to use.

## Files Created

1. **Migration**: `supabase/migrations/20250202_create_generic_scd2_base.sql`
   - All functions and trigger

2. **Test Script**: `scripts/test-scd2-v3.sql`
   - Function existence checks
   - Hash parity test
   - Config retrieval test
   - Constraint verification

3. **Review Checklist**: `docs/stock-adjustments/scd2-v3-review-checklist.md`
   - Answers to all review questions
   - Evidence for each requirement

4. **Implementation Summary**: `docs/stock-adjustments/scd2-v3-implementation-summary.md` (this file)

## Review Checklist Results

| Requirement | Status | Evidence |
|------------|--------|----------|
| Single hash source | ✅ YES | `fn_scd2_hash()` used by both trigger and wrapper |
| Consistent digest() | ✅ YES | Unqualified `digest()` used (may need Supabase adjustment) |
| Config-driven wrapper | ✅ YES | Wrapper pulls config from `fn_scd2_get_config()` |
| Base returns uuid | ✅ YES | Function signature returns `uuid` |
| No dynamic SQL for business logic | ⚠️ PARTIAL | Dynamic SQL only for table-agnostic queries |
| Idempotency matches constraint | ✅ YES | WHERE clause matches constraint exactly |
| Backward compatible | ✅ YES | v1/v2 preserved, v3 is new |
| Tests cover scenarios | ⚠️ PARTIAL | Hash parity covered, others need auth context |

See `scd2-v3-review-checklist.md` for detailed answers.

## Known Issues / Notes

### 1. Digest() Namespace

**Issue**: Uses unqualified `digest()` per requirements, but in Supabase it may be in `extensions` schema.

**Solution**: 
- If migration fails, change line 91 from `digest(...)` to `extensions.digest(...)`
- Or adjust search_path to include extensions schema

**Test**: Run `scripts/test-scd2-v3.sql` TEST 6 to verify.

### 2. INSERT Statement

**Issue**: Base function INSERT is table-specific for stock-adjustments.

**Status**: Acceptable for initial implementation. Can be generalized when adding more resources.

**Future**: Could use `jsonb_populate_record()` or build INSERT dynamically from config.

### 3. Integration Tests

**Status**: Test script covers hash parity and function existence, but no-op/insert/duplicate tests require auth context.

**Next Step**: Add integration tests with auth context.

## Next Steps

1. **Apply Migration**: Run `supabase/migrations/20250202_create_generic_scd2_base.sql`
2. **Run Tests**: Execute `scripts/test-scd2-v3.sql` to verify
3. **Fix Digest()**: If needed, adjust for Supabase (extensions.digest or search_path)
4. **API Integration**: Add feature flag to use v3
5. **Validation**: Compare v3 behavior with v1 to ensure no regressions
6. **Generalize**: Extend base function to support other tables (tally-cards, etc.)

## Constraint Parity

**Stock Adjustments** (`tcm_user_tally_card_entries`):
- **Constraint**: `uq_entries_uid_hash UNIQUE (updated_by_user_id, card_uid, hashdiff) WHERE (card_uid IS NOT NULL)`
- **Idempotency WHERE**: `updated_by_user_id = $1 AND card_uid = $2 AND hashdiff = $3`
- **Match**: ✅ Exact match

**Documentation**: See `scd2-v3-review-checklist.md` section 5 for details.

## Safety Measures

✅ **Old Functions Unchanged**: v1 and v2 remain active  
✅ **New Function Separate**: v3 is new, doesn't affect existing code  
✅ **Feature Flag Ready**: API route can switch between versions  
✅ **Easy Rollback**: Can disable v3, revert to v1/v2  
✅ **No Breaking Changes**: All existing code continues to work  

## Design Decisions

1. **Started with Hash Helper**: Most reusable part, single source of truth
2. **Config-Driven**: JSONB config makes it easy to extend
3. **Table-Specific INSERT**: Acceptable for initial implementation, can generalize later
4. **Trigger Shim Pattern**: Generic trigger that works for any table with config
5. **Backward Compatible**: All versions coexist, no breaking changes



