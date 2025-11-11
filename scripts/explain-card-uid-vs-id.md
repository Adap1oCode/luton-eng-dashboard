# Why `card_uid` instead of `id` for SCD2 Updates?

## SCD2 (Slowly Changing Dimension Type 2) Pattern

In SCD2, when you update a record, you **don't modify the existing row**. Instead, you **create a new row** with:
- A **new `id`** (unique per row)
- The **same `card_uid`** (business key that stays constant)

## Example Timeline

```
Initial Record:
  id: abc-123
  card_uid: xyz-999  ← This stays the same
  tally_card_number: "TC-001"
  note: "Original note"
  snapshot_at: 2025-01-01

After Update (note changed):
  id: def-456        ← New ID
  card_uid: xyz-999  ← Same card_uid (links to same logical record)
  tally_card_number: "TC-001"
  note: "Updated note"
  snapshot_at: 2025-02-01

Result: Two rows with same card_uid, different ids
```

## Why Use `card_uid`?

1. **Find Current Version**: To get the latest version, we query by `card_uid` and order by `snapshot_at DESC`
2. **Track History**: All versions of the same logical record share the same `card_uid`
3. **Idempotency Check**: We check if a row with the same `card_uid` + `hashdiff` already exists
4. **Insert New Version**: When inserting, we use the same `card_uid` but generate a new `id`

## The Function Flow

1. **Input**: `p_id` (the specific row ID you clicked "edit" on)
2. **Step 1**: Look up that row by `id` to get its `card_uid`
3. **Step 2**: Find the CURRENT version by querying `WHERE card_uid = ... ORDER BY snapshot_at DESC`
4. **Step 3**: Compare new values with current version
5. **Step 4**: If changed, insert new row with same `card_uid`, new `id`

This is why we use `card_uid` - it's the "anchor" that ties all versions together!





