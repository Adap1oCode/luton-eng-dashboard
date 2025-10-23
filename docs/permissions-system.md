# Permissions System Documentation

## Overview

The permissions system is built around a database-driven approach with the following key components:

- **Database Tables**: `permissions`, `roles`, `role_permissions`, `role_warehouse_rules`, `users`
- **Frontend Components**: `PermissionGate`, `usePermissions` hook
- **Backend APIs**: `/api/me/permissions`, `/api/me/role`

## Database Schema

### Core Tables

1. **`permissions`** - Defines available permissions
   - `key` (text, PK) - Permission identifier
   - `description` (text, nullable) - Human-readable description

2. **`roles`** - Defines user roles
   - `id` (uuid, PK)
   - `role_code` (text) - Unique role identifier
   - `role_name` (text) - Display name
   - `description` (text, nullable)
   - `is_active` (boolean)
   - `can_manage_roles` (boolean)
   - `can_manage_cards` (boolean)
   - `can_manage_entries` (boolean)

3. **`role_permissions`** - Links roles to permissions
   - `role_id` (uuid, FK to roles.id)
   - `permission_key` (text, FK to permissions.key)

4. **`role_warehouse_rules`** - Warehouse access control
   - `role_id` (uuid, FK to roles.id)
   - `warehouse_id` (uuid, FK to warehouses.id)
   - `warehouse` (text) - Warehouse code
   - `role_code` (text) - Role code

5. **`users`** - User accounts
   - `id` (uuid, PK)
   - `role_id` (uuid, FK to roles.id)
   - `role_code` (text) - Denormalized for performance
   - Other user fields...

## Permission Naming Convention

### Menu Access Permissions
```
menu:dashboard                    # General dashboard access
menu:forms:stock_adjustments      # Stock Adjustments menu
menu:forms:tally_cards           # Tally Cards menu
menu:forms:tally_cards_current   # Tally Cards (Current) menu
menu:forms:users                 # Users menu
menu:forms:roles                 # Roles menu
menu:forms:role_warehouse_rules  # Role-Warehouse Rules menu
menu:forms:warehouses            # Warehouses menu
menu:forms:user_tally_card_entries # User Tally Card Entries menu
```

### Resource CRUD Permissions
```
resource:tcm_user_tally_card_entries:read
resource:tcm_user_tally_card_entries:create
resource:tcm_user_tally_card_entries:update
resource:tcm_user_tally_card_entries:delete

resource:tcm_tally_cards:read
resource:tcm_tally_cards:create
resource:tcm_tally_cards:update
resource:tcm_tally_cards:delete
```

### Admin Permissions
```
admin:impersonate
admin:manage_roles
admin:manage_users
```

## Frontend Integration

### PermissionGate Component

```tsx
import { PermissionGate } from "@/components/auth/permissions-gate";

// Require ANY of these permissions
<PermissionGate any={["resource:tcm_user_tally_card_entries:create"]}>
  <button>Create Adjustment</button>
</PermissionGate>

// Require ALL of these permissions
<PermissionGate all={["admin:manage_roles", "admin:manage_users"]}>
  <button>Admin Panel</button>
</PermissionGate>
```

### usePermissions Hook

```tsx
import { usePermissions } from "@/components/auth/permissions-gate";

function MyComponent() {
  const { list, isLoading, error } = usePermissions();
  
  if (list.includes("resource:tcm_user_tally_card_entries:create")) {
    // User can create adjustments
  }
}
```

### Sidebar Navigation

Permissions are integrated into the sidebar navigation:

```tsx
// In src/navigation/sidebar/sidebar-items.ts
{
  title: "Stock Adjustments",
  url: "/forms/stock-adjustments",
  icon: Grid2X2,
  requiredAny: ["menu:forms:stock_adjustments"]
}
```

### Toolbar Buttons

Toolbar buttons support permission gating:

```tsx
// In toolbar configs
{
  id: "new",
  label: "New Adjustment",
  icon: "Plus",
  href: "/forms/stock-adjustments/new",
  requiredAny: ["resource:tcm_user_tally_card_entries:create"]
}
```

## Backend Integration

### Permission Checking in APIs

```tsx
// In API routes
const { permissions } = await getSessionContext();

if (!permissions.includes("resource:tcm_user_tally_card_entries:create")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Warehouse Scoping

Users can be restricted to specific warehouses:

```tsx
// In API routes
const { allowedWarehouseIds, canSeeAllWarehouses } = await getSessionContext();

if (!canSeeAllWarehouses) {
  query = query.in("warehouse_id", allowedWarehouseIds);
}
```

## Implementation Checklist

### For New Features

1. **Define Permissions**: Add new permission keys to the database
2. **Update Sidebar**: Add permission requirements to navigation items
3. **Gate UI Elements**: Use `PermissionGate` for buttons and actions
4. **Update Toolbar Configs**: Add permission requirements to toolbar buttons
5. **Backend Validation**: Check permissions in API routes
6. **Test**: Verify permission gating works correctly

### For Stock Adjustments (Completed)

- ✅ Updated sidebar navigation with `menu:forms:stock_adjustments`
- ✅ Added permission gating to "New Adjustment" button
- ✅ Added permission gating to "Delete" button
- ✅ Added permission gating to form submit buttons
- ✅ Updated form configuration with consistent permission naming
- ✅ Extended toolbar types to support permissions
- ✅ Extended ResourceFormSSRPage to support permission gating

## Database Setup

To set up the permissions system, you'll need to:

1. **Create Permission Records**:
```sql
INSERT INTO permissions (key, description) VALUES
('menu:forms:stock_adjustments', 'Access to Stock Adjustments menu'),
('menu:forms:tally_cards', 'Access to Tally Cards menu'),
('resource:tcm_user_tally_card_entries:read', 'Read stock adjustments'),
('resource:tcm_user_tally_card_entries:create', 'Create stock adjustments'),
('resource:tcm_user_tally_card_entries:update', 'Update stock adjustments'),
('resource:tcm_user_tally_card_entries:delete', 'Delete stock adjustments');
```

2. **Assign Permissions to Roles**:
```sql
INSERT INTO role_permissions (role_id, permission_key) VALUES
(role_uuid, 'menu:forms:stock_adjustments'),
(role_uuid, 'resource:tcm_user_tally_card_entries:read'),
(role_uuid, 'resource:tcm_user_tally_card_entries:create');
```

3. **Set Up Warehouse Rules** (if needed):
```sql
INSERT INTO role_warehouse_rules (role_id, warehouse_id, warehouse, role_code) VALUES
(role_uuid, warehouse_uuid, 'RTZ', 'WAREHOUSE_MANAGER');
```

## Testing

To test the permissions system:

1. **Create test users** with different role assignments
2. **Verify menu visibility** based on permissions
3. **Test button availability** in forms and toolbars
4. **Verify API access** with different permission sets
5. **Test warehouse scoping** if applicable

## Troubleshooting

### Common Issues

1. **Permissions not loading**: Check `/api/me/permissions` endpoint
2. **UI elements not gating**: Verify `PermissionGate` usage
3. **API access denied**: Check backend permission validation
4. **Sidebar items hidden**: Verify permission keys match database

### Debug Tools

- Check browser network tab for `/api/me/permissions` response
- Use browser dev tools to inspect permission state
- Check server logs for permission-related errors
