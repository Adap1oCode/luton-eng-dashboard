RBAC v2 — Screen Permissions + Explicit Warehouse Scope (Cursor Implementation Spec)

This is the final strategy and implementation brief. Please follow it exactly.

1) What changed (the big idea)

Permissions are screen-focused: screen:{slug}:{action} (view|create|update|delete|export).

Role Family = template: concrete roles inherit from their role_family (plus optional overrides).

Warehouses are now explicit: a user/role sees only the warehouses explicitly assigned to their role via role_warehouse_rules.

There is no implicit “all warehouses if none assigned.”

If none assigned (and they’re not Admin with explicit grants), they see zero warehouses.

Single source of truth: the UI reads everything from mv_effective_permissions materialized view.

We have also decided to assign Adminexplicitly to all warehouses (done via a one-time SQL grant), so Admin’s scope is explicit too.

2) Data surfaces (what the UI gets)

Use mv_effective_permissions (already created). It returns:

type EffectiveAccessRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;

  role_id: string | null;
  role_code: string | null;
  role_name: string | null;
  role_family: string | null;

  // Screen perms (Admin is fully expanded to all keys)
  permissions: string[];
  permission_details: Array<{ key: string; description: string | null }>;

  // Scope — now ALWAYS explicit lists (no implicit "all")
  warehouse_scope: Array<{ 
    warehouse_code: string; 
    warehouse_id: string; 
    warehouse_name: string 
  }>;
  allowed_warehouse_codes: string[];  // derived from scope
  allowed_warehouse_ids: string[];    // derived from scope
};


Guarantees:

permissions for Admin is the full list of keys from permissions table.

allowed_warehouse_codes/ids are explicit. There is no “empty = all”.

If a non-admin has no scope rows → allowed_warehouse_codes/ids will be empty arrays.

3) API contract

Update /api/me/role to read from the MV and pass through the fields above.

Fetch with:

const { data } = await supabase
  .from("mv_effective_permissions")
  .select("*")
  .eq("user_id", appUserId)
  .maybeSingle();


Respond with:

roleName, roleCode, roleFamily

permissions, permissionDetails

allowedWarehouseCodes, allowedWarehouseIds, warehouseScope

Do not re-infer or expand scope/permissions in the API. Treat MV as authoritative.

**Note**: `canSeeAllWarehouses` has been removed. All warehouse access is now explicit via `warehouseScope`.

4) UI guard helpers (unchanged pattern, explicit scope)

Create/keep buildGuards(session) with:

export type SessionAccess = {
  roleCode: string | null;
  roleFamily: string | null;
  permissions: string[];
  allowedWarehouseCodes: string[];
};

const impliesView = (p: string) =>
  p.endsWith(":create") || p.endsWith(":update") || p.endsWith(":delete") || p.endsWith(":export");

export function buildGuards(s: SessionAccess) {
  const base = new Set(s.permissions ?? []);
  for (const p of Array.from(base)) {
    if (impliesView(p)) {
      const screen = p.split(":")[1];
      base.add(`screen:${screen}:view`);
    }
  }
  const has = (k: string) => base.has(k);
  return {
    has,
    canView: (screen: string) => has(`screen:${screen}:view`),
    canCreate: (screen: string) => has(`screen:${screen}:create`),
    canUpdate: (screen: string) => has(`screen:${screen}:update`),
    canDelete: (screen: string) => has(`screen:${screen}:delete`),
    canExport: (screen: string) => has(`screen:${screen}:export`),
    inWarehouse: (code?: string | null) =>
      !code ? false : (s.allowedWarehouseCodes ?? []).includes(code),
  };
}


Important change: inWarehouse(undefined) should now be false (no implicit all).
Always flow a real code when checking scope. If you’re on a “global” page without a warehouse context, gate by screen permissions only.

5) Where to apply guards (requirements)

Route gating (server):

In every /forms/{screen}/page.tsx, fetch session via MV.

If !canView(screen), block (redirect/403).

For warehouse-scoped routes (e.g., /forms/stock-adjustments?warehouse=RTZ), also validate:

guards.inWarehouse(paramWarehouse) === true, else block.

Menu items:

Each item defines {screen, action:'view'}.

Filter menu by guards.canView(screen).

(No warehouse check at menu level.)

Toolbar buttons:

New: canCreate(screen)

Export: canExport(screen)

Delete: canDelete(screen)

Edit: canUpdate(screen) combined with per-row guards.inWarehouse(row.warehouseCode).

Table datasets:

Client filtering is required to hide records from disallowed warehouses:
data = data.filter(d => guards.inWarehouse(d.warehouse))

Ensure every relevant dataset contains a warehouse (code) field.

If dataset spans multiple warehouses and none are allowed → show an “No warehouse access” empty state.

Forms / dialogs:

When creating/updating, the selected warehouse must be one of allowedWarehouseCodes.
Validate and disable otherwise.

Global “no scope” UX:

If non-admin and allowedWarehouseCodes.length === 0:

Show a non-blocking banner: “You don’t have access to any warehouses. Ask an admin to assign at least one.”

Hide all warehouse-dependent actions and data.

Don’t default to “All”.

6) Warehouse filter UI (header control)

The global warehouse selector (if present) must only list allowedWarehouseCodes.

If empty:

Disable the selector.

Show the “no scope” banner as above.

7) Export & aggregate endpoints

Any CSV/PDF export buttons must be gated by both:

guards.canExport(screen)

For dataset rows, only export rows where guards.inWarehouse(row.warehouse) is true.

Aggregate widgets (KPIs, charts) must aggregate only allowed warehouses.
If you cannot filter server-side yet, filter result sets client-side by allowedWarehouseCodes.

8) Refresh policy (MV)

After any change to roles, permission assignments, or role_warehouse_rules, we must refresh:

refresh materialized view concurrently public.mv_effective_permissions;


Add a small admin operation to run this or schedule a Supabase cron (every 5–10 min).
(Cursor: add a utility in the admin panel if available, or a CLI script.)

9) Acceptance criteria (must pass)

Admin:

Receives full permissions from MV.

Sees all warehouses explicitly (because we granted them).

All menus, actions, and data visible.

Store Officer (RTZ only):

allowedWarehouseCodes = ['RTZ']

/forms/tally-cards blocked (as per family bundle).

/forms/stock-adjustments and /forms/stock-compare visible.

Buttons: create/update/export allowed, delete hidden (per family).

Data tables show only RTZ rows; exporting only includes RTZ.

User with no warehouse scope:

allowedWarehouseCodes = []

Sees “no warehouse access” banner.

All warehouse-dependent tables empty; actions disabled.

Can still access non-warehouse screens if permissions allow (e.g., user admin screens later).

Menu:

Only shows screens where canView(screen) is true.

Warehouse filter:

Options limited to allowedWarehouseCodes.

Selecting an unassigned code is impossible.

10) File-level changes (Cursor, do this)

API

src/app/api/me/role/route.ts: ✅ DONE - reads from mv_effective_permissions.

Passes through: permissions, permission_details, allowedWarehouseCodes, allowedWarehouseIds, warehouseScope.

**Note**: `canSeeAllWarehouses` removed - all warehouse access is explicit.

Access utilities

src/lib/access/guards.ts: ✅ DONE - implements buildGuards() helper.

src/lib/access/useAccess.ts: ✅ DONE - memoized hook wrapping guards for client-side.

src/lib/access/server.ts: ✅ DONE - getEffectiveAccess(appUserId) and getGuards() querying MV.

src/lib/access/route-guards.ts: ✅ DONE - protectRoute() and protectEditRoute() for server-side route protection.

Route guards

✅ IMPLEMENTED: Each page.tsx under /forms/* uses protectRoute() to check canView(screen).
If route accepts a warehouse param, also validates inWarehouse(param).

✅ IMPLEMENTED: Edit pages use protectEditRoute() to check canUpdate(screen) and warehouse access.

Redirects to home page (/) if access denied.

**Example**:
```typescript
import { protectRoute } from "@/lib/access/route-guards";

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const warehouseParam = sp.get("warehouse");
  await protectRoute("/forms/stock-adjustments", warehouseParam || undefined);
  // ... rest of page logic
}
```

Menu

Central menu config with {screen, action:'view'}.

Filter with guards (no warehouse logic here).

Components

✅ IMPLEMENTED: ResourceTableClient filters rows by guards.inWarehouse(row.warehouse_code || row.warehouse) as client-side safety net.

**Buttons** (to be implemented in action columns):
- New button: guards.canCreate(screen)
- Export button: guards.canExport(screen)
- Edit button (toolbar/menu/inline): guards.canUpdate(screen) && guards.inWarehouse(row.warehouse_code)
- Delete button (toolbar/menu): guards.canDelete(screen) && guards.inWarehouse(row.warehouse_code)

**Hyperlinks**:
- Links to detail pages: Check guards.canView(screen)
- Links to edit pages: Check guards.canUpdate(screen) && guards.inWarehouse(row.warehouse_code)
- Links to create pages: Check guards.canCreate(screen)

✅ IMPLEMENTED: WarehouseFilterDropdown restricted to allowedWarehouseCodes.

UX

✅ IMPLEMENTED: NoWarehouseAccessBanner component (src/components/access/no-warehouse-access-banner.tsx).

Shown when allowedWarehouseCodes.length === 0 and user isn't Administrator.

**Usage**: Add `<NoWarehouseAccessBanner />` to page layouts where warehouse access is relevant.

Tests

Playwright smoke tests for: Admin, Store Officer RTZ, No-Scope user.

11) Seed & Admin scope

Admin warehouse scope is explicitly granted (done).

Store Officer family has:

No access to tally-cards

stock-adjustments: view/create/update/export

stock-compare: view/create/update/export

No delete

---

## 12) Implementation Checklist for New Screens

When adding a new screen, follow this checklist:

### Route Protection
- [ ] Add `protectRoute("/forms/{screen-slug}", warehouseParam)` to page.tsx
- [ ] For edit pages, add `protectEditRoute("/forms/{screen-slug}/[id]/edit", recordWarehouseCode)` after fetching record

### Client-Side Filtering
- [ ] Table rows automatically filtered by ResourceTableClient (if warehouse column exists)
- [ ] Verify warehouse column name matches (`warehouse_code` or `warehouse`)

### Action Buttons & Links
- [ ] New button: Check `guards.canCreate(screen)`
- [ ] Export button: Check `guards.canExport(screen)`
- [ ] Edit actions (toolbar/menu/inline): Check `guards.canUpdate(screen) && guards.inWarehouse(row.warehouse_code)`
- [ ] Delete actions (toolbar/menu): Check `guards.canDelete(screen) && guards.inWarehouse(row.warehouse_code)`
- [ ] Hyperlinks: Check appropriate permission before rendering

### Warehouse Filter
- [ ] Add `<WarehouseFilterDropdown hasWarehouseScope={hasWarehouseScope} />` if resource has warehouseScope config
- [ ] Filter automatically restricted to allowedWarehouseCodes

### Permissions Required
- [ ] Ensure permissions exist in database: `screen:{screen-slug}:view`, `screen:{screen-slug}:create`, etc.
- [ ] Assign permissions to role families as needed

### Testing
- [ ] Test with Admin (should see all warehouses explicitly)
- [ ] Test with restricted user (should see only assigned warehouses)
- [ ] Test with no warehouse access (should see banner and empty tables)
- [ ] Verify route protection blocks unauthorized access
- [ ] Verify edit pages check update permission and warehouse access