# Stock Adjustments SCD2 Pattern - Quick Reference Summary

**Date**: 2025-02-02  
**Full Analysis**: See [`scd2-pattern-analysis-and-standardization.md`](./scd2-pattern-analysis-and-standardization.md)

---

## Current Architecture: How Edits Work

### Flow Overview

```
User submits form
  ↓
Client: stock-adjustment-form-wrapper.tsx
  ↓
POST /api/stock-adjustments/${id}/actions/patch-scd2
  ↓
RPC: fn_user_entry_patch_scd2()
  ├─ Load current record (by tally_card_number, FOR UPDATE)
  ├─ Detect changes (IS DISTINCT FROM)
  ├─ Calculate hashdiff (parent fields only)
  ├─ Check duplicate (idempotency)
  ├─ Insert new SCD2 row (if changes)
  └─ Handle race conditions
  ↓
If multi_location=true:
  ├─ Delete old child locations (via resource API)
  ├─ Insert new child locations (via resource API)
  ├─ Aggregate (sum qty, join locations)
  └─ Update parent again via SCD2
  ↓
Response: Enriched row + child locations
```

### SCD2 Boundary

- **Starts**: RPC function entry
- **Ends**: After INSERT completes
- **Excludes**: Child location management (handled in client)

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Edit Page** | `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx` | SSR entry point |
| **Form Wrapper** | `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx` | Client-side submission logic |
| **API Route** | `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts` | HTTP handler |
| **RPC Function** | `supabase/migrations/20250202_remove_locations_from_scd2.sql` | SCD2 logic |
| **Hashdiff Trigger** | `supabase/migrations/20250131_final_stock_adjustments_update.sql` | Sets hashdiff on INSERT |

---

## Parent-Child Pattern

### Parent Table: `tcm_user_tally_card_entries`

- **Anchor**: `tally_card_number` (text, doesn't change)
- **Temporal**: `updated_at` (determines "current" record)
- **Uniqueness**: `(updated_by_user_id, card_uid, hashdiff)`
- **SCD2**: New row created on each change

### Child Table: `tcm_user_tally_card_entry_locations`

- **Linkage**: `entry_id` → tcm_user_tally_card_entries(id)`
- **Issue**: References `id` which changes on SCD2 insert
- **Current**: Child rows deleted/recreated on edit (no SCD2 preservation)
- **Migration**: Client manually moves locations to new `entry_id` if parent changed

### Current Issues

1. **Child locations not versioned**: Deleted/recreated, loses history
2. **Manual migration**: Client must move locations when parent `id` changes
3. **Hashdiff limitation**: Child locations not included in hash (can't detect child-only changes)
4. **Logic duplication**: Change detection, aggregation, migration logic in multiple places

---

## Comparison: Stock Adjustments vs Tally Cards

| Aspect | Stock Adjustments | Tally Cards |
|--------|------------------|-------------|
| **Anchor** | `tally_card_number` (text) | `card_uid` (UUID) |
| **Temporal** | `updated_at` | `snapshot_at` |
| **User Scoping** | Yes (`updated_by_user_id`) | No (global) |
| **Uniqueness** | `(updated_by_user_id, card_uid, hashdiff)` | `(card_uid, hashdiff)` |
| **Child Tables** | Yes (`entry_locations`) | No |
| **Return Type** | Single row | Table |

**Similarities**:
- Both use `FOR UPDATE` lock
- Both check changes before insert
- Both calculate hashdiff pre-insert
- Both handle race conditions via constraint + exception

---

## Standardization Proposal

### Shared SCD2 Base Function

**Concept**: Config-driven base function that handles all SCD2 logic

```sql
fn_scd2_patch_base(
  p_table_name text,
  p_id uuid,
  p_anchor_column text,
  p_temporal_column text,
  p_hashdiff_config jsonb,
  p_update_fields jsonb,
  p_user_scoped boolean
)
```

**Benefits**:
- Single source of truth for SCD2 logic
- Consistent change detection
- Consistent hashdiff calculation
- Consistent race condition handling

### Child Table Integration Options

**Option A: Anchor-Based Linkage**
- Child tables reference anchor value (e.g., `tally_card_number`)
- View joins on anchor + temporal to get current children
- Automatic versioning with parent

**Option B: Temporal Join**
- Child tables include temporal column
- Child rows inserted with same temporal as parent
- View joins on anchor + temporal

**Option C: Separate Child SCD2**
- Child tables have own SCD2 pattern
- Linkage via anchor + temporal range
- More complex but preserves independent history

---

## Migration Strategy

### Phase 1: Extract Common Logic
- Create `fn_scd2_patch_base`
- Keep existing wrappers (backward compatible)
- Test with both resources

### Phase 2: Standardize Hashdiff
- Move hashdiff calculation to shared function
- Update trigger functions
- Ensure consistent normalization

### Phase 3: Child Table Integration
- Decide on linkage pattern (A/B/C)
- Migrate child handling to shared pattern
- Update views

### Phase 4: Client Simplification
- Remove client-side aggregation
- Remove location migration logic
- Rely on server-side SCD2 for all changes

---

## Key Findings

### What's Generic (Reusable)
- Change detection (`IS DISTINCT FROM`)
- Hashdiff calculation algorithm
- Race condition handling
- Temporal ordering logic

### What's Customizable (Per Resource)
- Field lists for hashdiff
- Anchor column (text vs UUID)
- Temporal column (`updated_at` vs `snapshot_at`)
- User scoping (yes/no)
- Child table linkage pattern

### Safety Considerations
- **Backward Compatible**: Keep existing RPC signatures
- **Testable**: Unit + integration + E2E tests
- **Reversible**: Migrations can be rolled back

---

## Next Steps

1. ✅ **Discovery Complete**: Architecture mapped and documented
2. **Validate Assumptions**: Test both patterns in staging
3. **Identify All Resources**: List all resources using SCD2
4. **Create Shared Base**: Extract common SCD2 logic
5. **Standardize Hashdiff**: Use shared calculation function
6. **Migrate Child Tables**: Implement chosen linkage pattern
7. **Simplify Client**: Remove location migration code



