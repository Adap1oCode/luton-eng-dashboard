# RLS Requirements for History Tab Enrichment

## Context
The history API route (`/api/resources/[resource]/[id]/history`) enriches history rows with user names and warehouse names. This happens server-side during the enrichment process.

## Tables That Need RLS Access

### 1. `users` Table

**Location**: `src/app/api/resources/[resource]/[id]/history/route.ts` lines 70-73

**Query Pattern**:
```typescript
await sb
  .from("users")
  .select("id, full_name")
  .in("id", userIdsArray);
```

**Access Required**:
- **Table**: `users`
- **Operation**: SELECT
- **Columns**: `id`, `full_name`
- **Filter**: `id IN (array of user IDs)`
- **Purpose**: Look up user full names using `updated_by_user_id` values from history entries

**RLS Policy Needed**:
- Allow SELECT on `users` table for authenticated users
- Filter: Can read `id` and `full_name` columns
- Context: This is server-side enrichment in an API route, called when viewing history

**Example Policy**:
```sql
-- Allow authenticated users to read user names for history enrichment
CREATE POLICY "Users can read names for history enrichment"
ON users
FOR SELECT
TO authenticated
USING (true);  -- or more restrictive based on your needs
```

---

### 2. `tcm_tally_cards` Table

**Location**: `src/app/api/resources/[resource]/[id]/history/route.ts` lines 94-97

**Query Pattern**:
```typescript
await sb
  .from("tcm_tally_cards")
  .select("card_uid, warehouse")
  .in("card_uid", Array.from(cardUids));
```

**Access Required**:
- **Table**: `tcm_tally_cards`
- **Operation**: SELECT
- **Columns**: `card_uid`, `warehouse`
- **Filter**: `card_uid IN (array of card UIDs)`
- **Purpose**: Look up warehouse names using `card_uid` values from history entries

**RLS Policy Needed**:
- Allow SELECT on `tcm_tally_cards` table for authenticated users
- Filter: Can read `card_uid` and `warehouse` columns
- Context: This is server-side enrichment in an API route, called when viewing history

**Example Policy**:
```sql
-- Allow authenticated users to read warehouse info for history enrichment
CREATE POLICY "Users can read warehouse for history enrichment"
ON tcm_tally_cards
FOR SELECT
TO authenticated
USING (true);  -- or more restrictive based on your needs
```

---

## Summary

**Two tables need RLS policies for history enrichment:**

1. **`users`** - SELECT on `id`, `full_name` columns
   - Used to enrich `updated_by_user_id` → `full_name` for display

2. **`tcm_tally_cards`** - SELECT on `card_uid`, `warehouse` columns  
   - Used to enrich `card_uid` → `warehouse` name for display

**Execution Context:**
- Both queries run in the server-side API route: `/api/resources/[resource]/[id]/history`
- Uses `supabaseServer()` which uses the authenticated user's session
- RLS policies will apply based on the authenticated user's context

**Note**: If you want more restrictive policies, you could:
- Limit to users who can view stock adjustments (e.g., check for `resource:tcm_user_tally_card_entries:read` permission)
- Limit warehouse access based on role_warehouse_rules
- Or use a service role client / RPC function to bypass RLS for this enrichment

