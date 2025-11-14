# Plan: Standardize Locations Table for All Entries

## Goal
Make the locations table the single source of truth for ALL entries (single and multi-location). Remove the manual toggle and auto-detect multi-location based on locations array length.

## Phase 1: Backfill & Standardization (Current)

### 1. Backfill Migration
**Purpose**: Create child location rows for all existing single-location entries

**SQL Migration**:
```sql
-- For each entry where:
--   - multi_location = false
--   - No child locations exist
--   - parent has qty and location values
-- Create one child location row

INSERT INTO tcm_user_tally_card_entry_locations (entry_id, location, qty, pos)
SELECT 
  e.id as entry_id,
  e.location,
  e.qty,
  1 as pos
FROM tcm_user_tally_card_entries e
WHERE e.multi_location = false
  AND e.location IS NOT NULL
  AND e.qty IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM tcm_user_tally_card_entry_locations l 
    WHERE l.entry_id = e.id
  )
  -- Only process latest entry per tally_card_number (SCD2)
  AND e.updated_at = (
    SELECT MAX(updated_at)
    FROM tcm_user_tally_card_entries
    WHERE tally_card_number = e.tally_card_number
  );
```

### 2. UI Changes

#### A. Remove Multi-Location Toggle
- Remove `MultiLocationToggle` component from form wrapper
- Remove toggle from form config

#### B. Always Show Locations Table
- Remove conditional rendering: `if (!multiLocation) return null`
- Always render locations table component
- For new entries, pre-populate with one empty row

#### C. Auto-Detect Multi-Location
- In form wrapper: `multi_location = locations.length > 1`
- Update on every locations array change
- Remove manual toggle logic

### 3. Form Logic Updates

#### Edit Page (`[id]/edit/page.tsx`)
- Always load locations (even for single-location entries)
- If no locations exist but entry has qty/location, create default location row
- Remove `multi_location` check when loading locations

#### Form With Locations Component
- Remove `if (!multiLocation) return null` guard
- Always render locations table
- Auto-update `multi_location` based on locations.length

#### Form Wrapper (`stock-adjustment-form-wrapper.tsx`)
- Remove MultiLocationToggle injection
- Auto-set `multi_location = locations.length > 1` before save
- Always save locations (even if just one)

### 4. Validation
- Always require at least one location
- Validate location names are not empty
- Validate quantities are numbers

## Phase 2: Remove Parent Qty/Location (Future)

**Note**: This is for future consideration, not part of current work.

- Remove `qty` and `location` columns from parent table
- Update views to calculate from child locations
- Update all queries to use aggregated values
- Migration to backfill parent qty/location from children (for compatibility)

## Testing Checklist

- [ ] Backfill migration runs successfully
- [ ] Existing single-location entries show locations table
- [ ] Existing multi-location entries still work
- [ ] New single-location entry: locations table shows one row
- [ ] Adding second location auto-sets multi_location = true
- [ ] Removing locations back to one auto-sets multi_location = false
- [ ] Save works for both single and multi-location
- [ ] Edit page loads locations correctly for all entries
- [ ] No regressions in existing functionality



