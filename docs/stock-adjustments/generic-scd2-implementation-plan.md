# Generic SCD2 Implementation Plan

## Overview

Create a generic, config-driven SCD2 base function that supports stock-adjustments as the first use case, with extensibility for future resources.

## Design Principles

1. **Safety First**: Keep existing `fn_user_entry_patch_scd2` unchanged
2. **Prove the Pattern**: New function `fn_user_entry_patch_scd2_v2` uses generic base
3. **Config-Driven**: Use JSONB for flexible configuration
4. **Extensible**: Easy to add new resources without code changes
5. **Backward Compatible**: Old function remains until new one is proven

## Architecture

### Base Function: `fn_scd2_patch_base`

**Purpose**: Generic SCD2 logic that works with any table/resource

**Parameters**:
- `p_table_name text` - Target table (e.g., 'tcm_user_tally_card_entries')
- `p_id uuid` - Current record ID
- `p_config jsonb` - Configuration object (see below)
- `p_update_fields jsonb` - Fields to update with new values

**Configuration Object** (`p_config`):
```jsonb
{
  "anchor_column": "tally_card_number",        // Column that doesn't change (anchor)
  "temporal_column": "updated_at",             // Column for temporal ordering
  "id_column": "id",                           // Primary key column
  "hashdiff_columns": [                        // Columns to include in hashdiff
    {
      "name": "updated_by_user_id",
      "type": "uuid",
      "normalize": false
    },
    {
      "name": "tally_card_number",
      "type": "text",
      "normalize": "lower_trim"
    },
    {
      "name": "card_uid",
      "type": "uuid",
      "normalize": false
    },
    {
      "name": "qty",
      "type": "integer",
      "normalize": false
    },
    {
      "name": "location",
      "type": "text",
      "normalize": "lower_trim"
    },
    {
      "name": "note",
      "type": "text",
      "normalize": "lower_trim"
    },
    {
      "name": "role_family",
      "type": "text",
      "normalize": "lower_trim"
    },
    {
      "name": "reason_code",
      "type": "text",
      "normalize": "lower_trim",
      "default": "unspecified"
    },
    {
      "name": "multi_location",
      "type": "boolean",
      "normalize": false,
      "default": "false"
    }
  ],
  "uniqueness_columns": ["updated_by_user_id", "card_uid"],  // For duplicate check
  "user_scoped": true,                                        // Include user in uniqueness
  "user_resolution": {                                        // How to get user_id
    "type": "auth_to_app_user",
    "table": "users",
    "auth_column": "auth_id",
    "app_column": "id"
  },
  "preserve_columns": ["role_family"],                        // Columns to copy from old record
  "return_type": "single_row"                                 // single_row | table
}
```

### Wrapper Function: `fn_user_entry_patch_scd2_v2`

**Purpose**: Stock-adjustments specific wrapper that calls base function

**Parameters**: Same as current function (for easy migration)

**Implementation**: Calls `fn_scd2_patch_base` with stock-adjustments config

## Implementation Steps

### Step 1: Create Hashdiff Helper Function ✅
- **Function**: `fn_scd2_calculate_hashdiff(jsonb, jsonb)`
- **Purpose**: Config-driven hashdiff calculation
- **Input**: Record JSONB + config JSONB
- **Output**: SHA256 hash (hex string)
- **Status**: Implemented in `20250202_create_generic_scd2_base.sql`

### Step 2: Create Stock Adjustments Wrapper (v2) ✅
- **Function**: `fn_user_entry_patch_scd2_v2(...)`
- **Purpose**: Stock-adjustments SCD2 using generic helper
- **Pattern**: Same as v1, but uses `fn_scd2_calculate_hashdiff` for hashdiff
- **Status**: Implemented in `20250202_create_generic_scd2_base.sql`
- **Safety**: Old `fn_user_entry_patch_scd2` remains unchanged

### Step 3: Test Script ✅
- **File**: `scripts/test-generic-scd2-v2.sql`
- **Purpose**: Verify functions exist and hashdiff calculation works
- **Status**: Created

### Step 4: Update API Route (Future)
- Add feature flag to use v2
- Test in parallel with v1
- Switch to v2 once validated

## Key Features

### Hashdiff Calculation
- Config-driven column list
- Normalization rules: `lower_trim`, `none`, `default_value`
- Consistent NULL handling (`'∅'` placeholder)

### Change Detection
- Generic `IS DISTINCT FROM` comparison
- Handles NULL defaults (e.g., `'UNSPECIFIED'` for reason_code)
- Config-driven field comparison

### Race Condition Handling
- `FOR UPDATE` lock on current record
- Pre-insert hashdiff check
- Unique constraint exception handling
- Idempotent returns

### Extensibility Points

1. **New Resource**: Add config object, create wrapper function
2. **New Hashdiff Column**: Add to config, no code changes
3. **Different Normalization**: Add new normalization type
4. **Different Uniqueness**: Change uniqueness_columns in config
5. **No User Scoping**: Set `user_scoped: false`

## Safety Measures

1. **Old Function Unchanged**: `fn_user_entry_patch_scd2` remains active
2. **New Function Separate**: `fn_user_entry_patch_scd2_v2` for testing
3. **Feature Flag**: API route can switch between versions
4. **Rollback Plan**: Can disable v2, revert to v1
5. **Testing**: Side-by-side comparison possible

## Migration Path

1. **Phase 1**: ✅ Create helper + v2 wrapper (completed)
   - `fn_scd2_calculate_hashdiff` - generic hashdiff helper
   - `fn_user_entry_patch_scd2_v2` - stock-adjustments wrapper
   - Test script created
   
2. **Phase 2**: Test v2 in parallel with v1
   - Run test script: `scripts/test-generic-scd2-v2.sql`
   - Compare hashdiff outputs
   - Test with real records
   
3. **Phase 3**: Switch API route to v2 (feature flag)
   - Update `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
   - Add feature flag to choose v1 or v2
   - Test in staging
   
4. **Phase 4**: Validate v2 works correctly
   - E2E tests
   - Compare behavior with v1
   - Performance check
   
5. **Phase 5**: Remove v1, rename v2 to v1
   - Once v2 is proven, remove old function
   - Rename v2 to v1
   - Update all references

## Next Resources

After stock-adjustments is proven:
- Tally Cards (different anchor, no user scoping)
- Future resources with different patterns

