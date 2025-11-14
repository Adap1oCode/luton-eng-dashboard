# RLS Policies Explanation: tcm_tally_cards vs tcm_user_tally_card_entries

## Summary

The **open RLS policies** on `tcm_tally_cards` are **intentional and match the pattern** used for `tcm_user_tally_card_entries`. Both tables use open policies (`USING (true)`) because access control is enforced at the **application layer**, not the database layer.

## What Are RLS Policies?

Row Level Security (RLS) policies in PostgreSQL control which rows users can see/modify. They act as a filter on queries.

## Current Policies

### tcm_user_tally_card_entries (Parent Table)

From the documentation, this table has **open policies**:
- `entries_select_open` - SELECT with `USING (true)` 
- `entries_insert_open` - INSERT with `WITH CHECK (true)`
- `entries_update_open` - UPDATE with `USING (true)` and `WITH CHECK (true)`
- `entries_delete_open` - DELETE with `USING (true)`

**Meaning:** Any authenticated user can SELECT/INSERT/UPDATE/DELETE any row.

### tcm_tally_cards (Reference Table)

The new migration creates **identical open policies**:
- `tally_cards_select_open` - SELECT with `USING (true)`
- `tally_cards_insert_open` - INSERT with `WITH CHECK (true)`
- `tally_cards_update_open` - UPDATE with `USING (true)` and `WITH CHECK (true)`
- `tally_cards_delete_open` - DELETE with `USING (true)`

**Meaning:** Any authenticated user can SELECT/INSERT/UPDATE/DELETE any row.

## Why Open Policies?

### 1. Application-Layer Access Control

Access control is enforced in the **application code**, not the database:

- **Route Guards** (`src/lib/access/route-guards.ts`) check permissions before allowing access
- **Resource Config** (`src/lib/data/resources/*.config.ts`) enforces scoping:
  - `ownershipScope`: Filters by `role_family`
  - `warehouseScope`: Filters by `warehouse_id`
  - `bypassPermissions`: Allows admins to see all

### 2. View-Based Filtering

The application reads from **views** that already filter data:
- `v_tcm_user_tally_card_entries` - Only shows latest entry per `tally_card_number`
- Views join with `tcm_tally_cards` to get `warehouse_id`
- Application code filters by `warehouse_id` and `role_family`

### 3. Simpler Architecture

Open RLS policies mean:
- ✅ Database queries are simpler (no complex RLS conditions)
- ✅ Access control logic is centralized in application code
- ✅ Easier to test and debug
- ✅ Changes to permissions don't require database migrations

## How Access Control Actually Works

### Step 1: Route Protection
```typescript
// src/lib/access/route-guards.ts
const guards = buildGuards({
  roleCode: ctx.effectiveUser.roleCode,
  permissions: ctx.permissions,
  allowedWarehouseCodes: ctx.allowedWarehouseCodes,
});

if (!guards.canView("stock-adjustments")) {
  redirect("/"); // Blocked at route level
}
```

### Step 2: Resource Scoping
```typescript
// src/lib/data/resources/tcm_user_tally_card_entries.config.ts
ownershipScope: {
  mode: "role_family",
  column: "role_family",
  bypassPermissions: ["entries:read:any", "admin:read:any"],
},
warehouseScope: { 
  mode: "column", 
  column: "warehouse_id" 
}
```

### Step 3: Query Filtering
The resource fetch automatically adds WHERE clauses:
```sql
-- Automatically added by resource config
WHERE role_family = $1 
  AND warehouse_id = ANY($2)
```

## Comparison with Other Tables

### Tables with Open RLS Policies (Application-Layer Control)
- `tcm_user_tally_card_entries` - Access controlled by role_family + warehouse
- `tcm_tally_cards` - Reference table, access controlled via joins
- Likely other reference/lookup tables

### Tables with Restrictive RLS Policies (Database-Layer Control)
- `tcm_user_tally_card_entry_locations` - Has conditional policy:
  ```sql
  USING (
    EXISTS (
      SELECT 1 FROM tcm_user_tally_card_entries e
      WHERE e.id = entry_id
      AND e.updated_at = (SELECT MAX(updated_at) ...)
    )
  )
  ```
  This ensures locations can only be managed for "current" entries.

## Security Considerations

### Is This Secure?

**Yes, if:**
1. ✅ Route guards properly check permissions (they do)
2. ✅ Resource configs properly scope queries (they do)
3. ✅ API routes validate access (they do)
4. ✅ No direct database access from untrusted sources

**Potential Risks:**
1. ⚠️ If someone bypasses the application layer (direct DB access), they can see all data
2. ⚠️ If route guards have bugs, data could be exposed
3. ⚠️ If resource scoping has bugs, wrong data could be returned

### Mitigation

The codebase mitigates these risks:
- ✅ Server-side route guards (can't bypass from client)
- ✅ Resource configs enforce scoping (automatic WHERE clauses)
- ✅ RLS is still enabled (defense in depth - can add restrictive policies later)
- ✅ API routes use the same resource configs (consistent access control)

## Recommendation

**The open RLS policies on `tcm_tally_cards` are CORRECT and match the pattern.**

They should stay as-is because:
1. They match `tcm_user_tally_card_entries` pattern
2. Access control is enforced in application code
3. The table is a reference/lookup table (not sensitive user data)
4. Changing to restrictive policies would require complex joins in RLS conditions

## If You Want More Restrictive Policies

If you want database-layer enforcement for `tcm_tally_cards`, you'd need policies like:

```sql
-- Example: Only allow access to cards in user's warehouses
CREATE POLICY "tally_cards_select_warehouse"
ON tcm_tally_cards
FOR SELECT
TO authenticated
USING (
  warehouse_id IN (
    SELECT warehouse_id 
    FROM role_warehouse_rules 
    WHERE role_code = current_setting('app.current_role')::text
  )
);
```

But this would:
- Require setting session variables
- Add complexity
- Duplicate logic already in application code
- Not provide much additional security (application already filters)

## Conclusion

**The open RLS policies are intentional and correct.** They match the architecture pattern where access control is enforced in application code, not database policies. This is a valid and common pattern for applications with complex permission systems.


