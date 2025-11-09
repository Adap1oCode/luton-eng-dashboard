# Parent-Child SCD2 Flow Documentation

## Overview

This document describes the correct flow for updating parent records with SCD2 when child records need to be aggregated into parent fields. This pattern is generic and can be reused for any parent-child resource relationship.

## The Problem

When a parent record uses SCD2 and has child records that need to be aggregated (e.g., `qty = SUM(child.qty)`, `location = JOIN(child.location)`), we cannot send the aggregated values in the first SCD2 call because:

1. **Child records don't exist yet** - We need the parent `entry_id` to save children
2. **Aggregation must happen after children are saved** - We need to fetch actual saved data
3. **SCD2 creates new rows only when data changes** - If we send wrong data, we get wrong rows

## The Solution: Two-Phase SCD2 Update

### Phase 1: Update Parent Metadata (Get Entry ID)

**Purpose**: Get or create a parent record with a valid `entry_id` for saving child records.

**What to send**:
- Metadata fields only: `reason_code`, `note`, `multi_location` (flag)
- **DO NOT send**: `location`, `qty` (these will be aggregated from children)

**SCD2 Behavior**:
- If metadata changed → Creates new SCD2 row → Returns new `id`
- If no changes → Returns existing `id` (this is fine, we just need the ID)

**Result**: We have a valid `entry_id` to use for child records.

### Phase 2: Save Child Records

**Purpose**: Save individual child records with the parent `entry_id`.

**Steps**:
1. Delete existing child records for this `entry_id`
2. Insert new child records with correct `entry_id`

**Result**: Child records are saved and linked to parent.

### Phase 3: Aggregate and Update Parent

**Purpose**: Calculate aggregated values from saved children and update parent.

**Steps**:
1. Fetch saved child records (from database, not form state)
2. Calculate aggregates:
   - `totalQty = SUM(child.qty)`
   - `locationString = JOIN(child.location, ", ")`
3. Call SCD2 again with aggregated values:
   - `qty: totalQty`
   - `location: locationString`
   - `multi_location: true`

**SCD2 Behavior**:
- If aggregated values changed → Creates new SCD2 row → Returns new `id`
- If no changes → Returns existing `id`

**Result**: Parent record has correct aggregated values.

### Phase 4: Move Children (If Needed)

**Purpose**: If Phase 3 created a new parent row, move children to the new `entry_id`.

**Steps**:
1. Check if `newEntryId !== oldEntryId`
2. If different:
   - Fetch children from old `entry_id`
   - Delete children from old `entry_id`
   - Insert children with new `entry_id`

**Result**: Children are always linked to the latest parent row.

## Generic Pattern

This pattern works for any parent-child relationship where:

1. **Parent uses SCD2** (creates new rows on changes)
2. **Child has foreign key to parent** (`entry_id` or similar)
3. **Child data needs aggregation** (sum, count, join, etc.)

### Example Resources

- **Stock Adjustments**: `tcm_user_tally_card_entries` (parent) → `tcm_user_tally_card_entry_locations` (child)
- **Future**: Any resource with aggregated child data

### Implementation Checklist

For each parent-child resource:

1. ✅ Identify metadata fields (don't aggregate from children)
2. ✅ Identify aggregated fields (calculated from children)
3. ✅ Strip aggregated fields from first SCD2 call
4. ✅ Save children after first call
5. ✅ Fetch children and calculate aggregates
6. ✅ Make second SCD2 call with aggregates
7. ✅ Move children if second call created new row

## Code Example

```typescript
// Phase 1: Update metadata only
const firstCallPayload = { ...values };
if (multi_location) {
  delete firstCallPayload.location;  // Aggregated from children
  delete firstCallPayload.qty;        // Aggregated from children
}
const result1 = await fetch('/api/parent/update', {
  body: JSON.stringify(firstCallPayload)
});
const entryId = result1.row.id;

// Phase 2: Save children
await deleteChildren(entryId);
await insertChildren(entryId, children);

// Phase 3: Aggregate and update
const savedChildren = await fetchChildren(entryId);
const aggregates = calculateAggregates(savedChildren);
const result2 = await fetch('/api/parent/update', {
  body: JSON.stringify(aggregates)
});
const newEntryId = result2.row.id;

// Phase 4: Move children if needed
if (newEntryId !== entryId) {
  await moveChildren(entryId, newEntryId);
}
```

## Why This Works

1. **First call gets entry_id**: Even if no changes, SCD2 returns existing ID
2. **Children saved correctly**: Using the entry_id from first call
3. **Aggregation is accurate**: Based on actual saved data, not form state
4. **Second call updates parent**: With correct aggregated values
5. **Children stay linked**: Moved to new parent row if needed

## Testing Checklist

- [ ] First SCD2 call with only metadata creates/returns entry_id
- [ ] Children are saved with correct entry_id
- [ ] Aggregation calculates correct totals from saved children
- [ ] Second SCD2 call updates parent with aggregated values
- [ ] If second call creates new row, children are moved correctly
- [ ] Final parent row has correct aggregated values
- [ ] Final children are linked to latest parent row

