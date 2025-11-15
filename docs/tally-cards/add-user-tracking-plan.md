# Tally Cards: Add User Tracking (E2E Plan)

## Overview
Add `updated_by_user_id` tracking to `tcm_tally_cards` table to match the pattern used in `tcm_user_tally_card_entries` (stock adjustments). This enables history views to show who made each change.

## Current State
- ❌ `tcm_tally_cards` table does NOT have `updated_by_user_id` column
- ❌ `fn_tally_card_patch_scd2` RPC function does NOT set `updated_by_user_id` when creating new SCD2 rows
- ❌ History enrichment does NOT include user lookup for tally cards
- ❌ History UI does NOT display user name column

## Target State (Matching Stock Adjustments Pattern)
- ✅ `tcm_tally_cards` table has `updated_by_user_id UUID` column
- ✅ Trigger automatically sets `updated_by_user_id` from auth context on INSERT
- ✅ `fn_tally_card_patch_scd2` RPC function sets `updated_by_user_id` when creating new SCD2 rows
- ✅ History enrichment includes user lookup and adds `full_name` to rows
- ✅ History UI displays "Updated By" column showing user name

---

## Phase 1: Database Schema Changes

### 1.1 Add `updated_by_user_id` Column
**File:** `supabase/migrations/YYYYMMDD_add_updated_by_user_id_to_tally_cards.sql`

```sql
-- Add updated_by_user_id column to tcm_tally_cards
ALTER TABLE public.tcm_tally_cards
ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES public.users(id);

-- Add index for performance (used in history queries and enrichment)
CREATE INDEX IF NOT EXISTS idx_tcm_tally_cards_updated_by_user_id 
ON public.tcm_tally_cards(updated_by_user_id);

-- Add comment
COMMENT ON COLUMN public.tcm_tally_cards.updated_by_user_id IS 
'User ID (users.id) of the user who last updated this record. Set automatically by trigger from auth context.';
```

### 1.2 Create Trigger to Auto-Set `updated_by_user_id` on INSERT
**Pattern:** Same as stock adjustments `set_entry_user_id` trigger

```sql
-- Create trigger function to set updated_by_user_id from auth context
CREATE OR REPLACE FUNCTION public.set_tally_card_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID from auth context (users.id, not auth.users.id)
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  
  -- Set updated_by_user_id if user found and not already set
  IF v_user_id IS NOT NULL AND NEW.updated_by_user_id IS NULL THEN
    NEW.updated_by_user_id := v_user_id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If auth context not available, leave as NULL (allows system inserts)
  RETURN NEW;
END;
$$;

-- Create trigger (BEFORE INSERT only - updates handled by RPC function)
CREATE TRIGGER trg_set_tally_card_user_id
BEFORE INSERT ON public.tcm_tally_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_tally_card_user_id();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_tally_card_user_id() TO authenticated;
```

**Note:** For UPDATE operations, the RPC function will explicitly set `updated_by_user_id` (see Phase 2).

---

## Phase 2: Update RPC Function

### 2.1 Update `fn_tally_card_patch_scd2` to Set `updated_by_user_id`
**File:** `supabase/migrations/YYYYMMDD_update_tally_card_patch_scd2_with_user_id.sql`

**Changes needed:**
1. Get current user ID from auth context at function start
2. Set `updated_by_user_id` when inserting new SCD2 row
3. Include `updated_by_user_id` in RETURN TABLE

**Pattern:** Follow `fn_user_entry_patch_scd2` from stock adjustments:

```sql
CREATE OR REPLACE FUNCTION fn_tally_card_patch_scd2(
  p_id UUID,
  p_tally_card_number TEXT DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_item_number BIGINT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  card_uid UUID,
  tally_card_number TEXT,
  warehouse_id UUID,
  item_number BIGINT,
  note TEXT,
  is_active BOOLEAN,
  snapshot_at TIMESTAMPTZ,
  updated_by_user_id UUID  -- ADD THIS
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_card_uid UUID;
  v_old_record RECORD;
  v_new_id UUID;
  v_me UUID;  -- ADD THIS: current user ID
BEGIN
  -- Get current user ID from auth context
  SELECT id INTO v_me
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  
  -- Fetch current record to get card_uid (anchor)
  SELECT card_uid INTO v_card_uid
  FROM tcm_tally_cards
  WHERE id = p_id
  LIMIT 1;
  
  IF v_card_uid IS NULL THEN
    RAISE EXCEPTION 'Record not found or access denied';
  END IF;
  
  -- Get the current record for comparison
  SELECT * INTO v_old_record
  FROM tcm_tally_cards
  WHERE card_uid = v_card_uid
  ORDER BY snapshot_at DESC
  LIMIT 1;
  
  -- Check if any values actually changed
  IF (p_tally_card_number IS NULL OR p_tally_card_number = COALESCE(v_old_record.tally_card_number, ''))
     AND (p_warehouse_id IS NULL OR p_warehouse_id = COALESCE(v_old_record.warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid))
     AND (p_item_number IS NULL OR p_item_number = COALESCE(v_old_record.item_number, 0))
     AND (p_note IS NULL OR p_note = COALESCE(v_old_record.note, ''))
     AND (p_is_active IS NULL OR p_is_active = COALESCE(v_old_record.is_active, true)) THEN
    -- No change, return existing record
    RETURN QUERY
    SELECT
      t.id,
      t.card_uid,
      t.tally_card_number,
      t.warehouse_id,
      t.item_number,
      t.note,
      t.is_active,
      t.snapshot_at,
      t.updated_by_user_id  -- ADD THIS
    FROM tcm_tally_cards t
    WHERE t.id = p_id;
    RETURN;
  END IF;
  
  -- Insert new record with updated values (SCD-2: don't update old, insert new)
  v_new_id := gen_random_uuid();
  
  INSERT INTO tcm_tally_cards (
    id,
    card_uid,
    tally_card_number,
    warehouse_id,
    item_number,
    note,
    is_active,
    snapshot_at,
    updated_by_user_id  -- ADD THIS
  ) VALUES (
    v_new_id,
    v_card_uid,
    COALESCE(p_tally_card_number, v_old_record.tally_card_number),
    COALESCE(p_warehouse_id, v_old_record.warehouse_id),
    COALESCE(p_item_number, v_old_record.item_number),
    COALESCE(p_note, v_old_record.note),
    COALESCE(p_is_active, v_old_record.is_active),
    NOW(),
    COALESCE(v_me, v_old_record.updated_by_user_id)  -- ADD THIS: use current user, fallback to old value
  );
  
  -- Return the new record
  RETURN QUERY
  SELECT
    t.id,
    t.card_uid,
    t.tally_card_number,
    t.warehouse_id,
    t.item_number,
    t.note,
    t.is_active,
    t.snapshot_at,
    t.updated_by_user_id  -- ADD THIS
  FROM tcm_tally_cards t
  WHERE t.id = v_new_id;
END;
$$;
```

---

## Phase 3: Update History Enrichment

### 3.1 Update History API Route
**File:** `src/app/api/resources/[resource]/[id]/history/route.ts`

**Current state:** Already handles `updated_by_user_id` for stock adjustments, but needs to work for tally cards too.

**Changes needed:**
1. ✅ Already collects `updated_by_user_id` from rows (line 50)
2. ✅ Already fetches users and creates `usersMap` (lines 63-79)
3. ✅ Already enriches rows with `full_name` (lines 126-136)
4. ✅ Already handles `snapshot_at_pretty` formatting (line 145)

**Status:** History enrichment already supports `updated_by_user_id`! No changes needed.

**Verification:** Ensure `updated_by_user_id` is included in base columns query (line 256).

---

## Phase 4: Update History UI Configuration

### 4.1 Add "Updated By" Column to History UI
**File:** `src/lib/data/resources/tally_cards.config.ts`

**Changes needed:**
1. Add `updated_by_user_id` to projection columns (so it's queried)
2. Add `full_name` to UI columns (enriched server-side)

```typescript
projection: {
  columns: [
    "snapshot_at",
    "snapshot_at_pretty", // formatted server-side
    "updated_by_user_id",  // ADD THIS: needed for enrichment
    "tally_card_number",
    "warehouse_id",
    "item_number",
    "note",
    "is_active",
  ],
  orderBy: { column: "snapshot_at", direction: "desc" },
},
ui: {
  columns: [
    { key: "snapshot_at_pretty", label: "Snapshot", format: "date", width: 200 },
    { key: "full_name", label: "Updated By", width: 150 },  // ADD THIS: enriched server-side
    { key: "tally_card_number", label: "Tally Card Number", width: 180 },
    { key: "warehouse", label: "Warehouse", width: 200 },
    { key: "item_number", label: "Item Number", format: "plain-number", width: 180 },
    { key: "note", label: "Note", width: 280 },
    { key: "is_active", label: "Active", format: "boolean", width: 100 },
  ],
  tabBadgeCount: true,
},
```

**Note:** `full_name` is enriched server-side in `enrichHistoryRows()` function, so it won't be in the base query. The history route already filters out enriched columns (line 252), so `updated_by_user_id` will be queried but `full_name` will be added during enrichment.

---

## Phase 5: Update Hashdiff Calculation (If Applicable)

### 5.1 Check if Hashdiff Includes User ID
**File:** Check existing hashdiff trigger/function for `tcm_tally_cards`

**Question:** Does the hashdiff calculation include `updated_by_user_id`?

**Pattern from stock adjustments:**
- Hashdiff includes `updated_by_user_id` in the payload (line 694 of `20250131_final_stock_adjustments_update.sql`)
- This ensures different users creating identical changes produce different hashdiffs (audit trail)

**Action:** If `tcm_tally_cards` has a hashdiff trigger, update it to include `updated_by_user_id`:

```sql
-- If hashdiff trigger exists, update it to include updated_by_user_id
-- Pattern from stock adjustments:
v_payload := concat_ws(' | ',
  coalesce(NEW.updated_by_user_id::text, '∅'),  -- ADD THIS
  coalesce(lower(btrim(NEW.tally_card_number)), '∅'),
  -- ... other fields
);
```

**Note:** Check if `tcm_tally_cards` uses the generic SCD2 hashdiff shim (`fn_scd2_trigger_hash_shim`). If so, it may already handle `updated_by_user_id` automatically (see `20250202_create_generic_scd2_base.sql` lines 160-178).

---

## Phase 6: Testing Checklist

### 6.1 Database Tests
- [ ] Verify `updated_by_user_id` column exists and is nullable
- [ ] Verify trigger `trg_set_tally_card_user_id` fires on INSERT
- [ ] Verify trigger sets `updated_by_user_id` from auth context
- [ ] Verify RPC function `fn_tally_card_patch_scd2` sets `updated_by_user_id` on new SCD2 rows
- [ ] Verify RPC function returns `updated_by_user_id` in result

### 6.2 API Tests
- [ ] Verify history endpoint includes `updated_by_user_id` in base query
- [ ] Verify history enrichment adds `full_name` to rows
- [ ] Verify history response includes both `updated_by_user_id` and `full_name`

### 6.3 UI Tests
- [ ] Verify history tab shows "Updated By" column
- [ ] Verify "Updated By" column displays user name (not UUID)
- [ ] Verify existing history rows (without `updated_by_user_id`) show "-" or null gracefully
- [ ] Verify new edits create history rows with user name

### 6.4 Integration Tests
- [ ] Create new tally card → verify `updated_by_user_id` is set
- [ ] Edit tally card → verify new SCD2 row has `updated_by_user_id`
- [ ] View history → verify "Updated By" column shows correct user name
- [ ] Test with multiple users → verify each user's changes show their name

---

## Phase 7: Migration Order & Rollback

### 7.1 Migration Order
1. **Phase 1:** Add column + trigger (safe, backward compatible)
2. **Phase 2:** Update RPC function (breaking change - app must be updated simultaneously)
3. **Phase 3:** No changes needed (already supports pattern)
4. **Phase 4:** Update UI config (safe, additive)
5. **Phase 5:** Update hashdiff if needed (safe if using generic shim)

### 7.2 Rollback Plan
If issues occur:

1. **Rollback Phase 4:** Revert UI config changes (remove `full_name` column)
2. **Rollback Phase 2:** Restore previous RPC function signature (remove `updated_by_user_id` from INSERT and RETURN)
3. **Rollback Phase 1:** 
   - Drop trigger: `DROP TRIGGER IF EXISTS trg_set_tally_card_user_id ON tcm_tally_cards;`
   - Drop function: `DROP FUNCTION IF EXISTS set_tally_card_user_id();`
   - **DO NOT** drop column (data may exist) - just leave it NULL

### 7.3 Data Migration (Optional)
For existing rows without `updated_by_user_id`:
- Leave as NULL (acceptable - represents "unknown user" for historical data)
- Or run one-time migration to set a default/system user ID if needed

---

## Summary

**Total Changes:**
- 1 new migration: Add column + trigger
- 1 updated migration: Update RPC function
- 1 config file: Update history UI columns
- 0 API changes: Already supports pattern

**Risk Level:** Low (backward compatible, additive changes)

**Breaking Changes:** None (RPC function signature change is additive - old calls still work, new calls include user ID)

**Testing Priority:** High (user tracking is critical for audit trail)









