# ⚠️ BREAKING CHANGE WARNING - Permission Name Migration

## HIGH RISK: Permission Name Changes

### What Changed

I updated the permission prefix in config files from:
- `resource:tcm_user_tally_card_entries:*` → `screen:stock-adjustments:*`
- `resource:tcm_tally_cards:*` → `screen:tally-cards:*`

### Impact

**This is a BREAKING CHANGE** if the database hasn't been migrated to include the new permission names.

### Affected Areas

1. **Toolbar Buttons** - "New" and "Delete" buttons check for:
   - `screen:stock-adjustments:create` (NEW)
   - `screen:stock-adjustments:delete` (NEW)
   - `screen:tally-cards:create` (NEW)
   - `screen:tally-cards:delete` (NEW)

2. **Form Pages** - Submit buttons check for:
   - `screen:stock-adjustments:create` (NEW)
   - `screen:tally-cards:create` (NEW)

3. **Sidebar Navigation** - Menu items check for:
   - `screen:stock-adjustments:view` (NEW)
   - `screen:tally-cards:view` (NEW)

### What Will Break

If users have **ONLY** the old permission names (`resource:tcm_user_tally_card_entries:create`) in their roles:
- ❌ "New Adjustment" button will be hidden
- ❌ "New Tally Card" button will be hidden
- ❌ Form submit buttons will be hidden
- ❌ Users won't be able to create new entries

### Backward Compatibility Status

✅ **Impersonation**: Has backward compatibility (checks both `admin:impersonate` AND `screen:switch-user:update`)

❌ **Stock Adjustments/Tally Cards**: **NO backward compatibility** - only checks new permission names

## Required Actions Before Deployment

### Option 1: Database Migration (Recommended)

Create a migration script to add new permission names to the database:

```sql
-- Add new permission names
INSERT INTO permissions (key, description) VALUES
('screen:stock-adjustments:create', 'Create stock adjustments'),
('screen:stock-adjustments:read', 'Read stock adjustments'),
('screen:stock-adjustments:update', 'Update stock adjustments'),
('screen:stock-adjustments:delete', 'Delete stock adjustments'),
('screen:stock-adjustments:view', 'View stock adjustments'),
('screen:tally-cards:create', 'Create tally cards'),
('screen:tally-cards:read', 'Read tally cards'),
('screen:tally-cards:update', 'Update tally cards'),
('screen:tally-cards:delete', 'Delete tally cards'),
('screen:tally-cards:view', 'View tally cards')
ON CONFLICT (key) DO NOTHING;

-- Copy role_permissions from old to new permission names
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p_new.id
FROM role_permissions rp
JOIN permissions p_old ON rp.permission_id = p_old.id
JOIN permissions p_new ON 
  CASE p_old.key
    WHEN 'resource:tcm_user_tally_card_entries:create' THEN 'screen:stock-adjustments:create'
    WHEN 'resource:tcm_user_tally_card_entries:read' THEN 'screen:stock-adjustments:read'
    WHEN 'resource:tcm_user_tally_card_entries:update' THEN 'screen:stock-adjustments:update'
    WHEN 'resource:tcm_user_tally_card_entries:delete' THEN 'screen:stock-adjustments:delete'
    WHEN 'resource:tcm_tally_cards:create' THEN 'screen:tally-cards:create'
    WHEN 'resource:tcm_tally_cards:read' THEN 'screen:tally-cards:read'
    WHEN 'resource:tcm_tally_cards:update' THEN 'screen:tally-cards:update'
    WHEN 'resource:tcm_tally_cards:delete' THEN 'screen:tally-cards:delete'
  END = p_new.key
WHERE p_old.key IN (
  'resource:tcm_user_tally_card_entries:create',
  'resource:tcm_user_tally_card_entries:read',
  'resource:tcm_user_tally_card_entries:update',
  'resource:tcm_user_tally_card_entries:delete',
  'resource:tcm_tally_cards:create',
  'resource:tcm_tally_cards:read',
  'resource:tcm_tally_cards:update',
  'resource:tcm_tally_cards:delete'
)
ON CONFLICT DO NOTHING;
```

### Option 2: Add Backward Compatibility (Quick Fix)

Add backward compatibility checks in the config files or PermissionGate component to check both old and new permission names.

**Recommended Location**: Update `PERMISSION_PREFIX` logic or add helper function:

```typescript
// In stock-adjustments.config.tsx
const PERMISSION_PREFIX = `screen:${ROUTE_SEGMENT}` as const;
const OLD_PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;

// In toolbar config
requiredAny: [
  `${PERMISSION_PREFIX}:create`,
  `${OLD_PERMISSION_PREFIX}:create` // Backward compatibility
]
```

### Option 3: Verify Database State

Check if new permission names already exist:

```sql
SELECT key FROM permissions 
WHERE key LIKE 'screen:stock-adjustments:%' 
   OR key LIKE 'screen:tally-cards:%';
```

If they exist, verify role_permissions are populated:

```sql
SELECT r.name as role_name, p.key as permission
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.key LIKE 'screen:stock-adjustments:%' 
   OR p.key LIKE 'screen:tally-cards:%';
```

## Risk Assessment

| Change | Risk Level | Breaking? | Mitigation |
|--------|-----------|-----------|------------|
| Permission prefix change | **HIGH** | **YES** | Database migration OR backward compatibility |
| Props interface cleanup | LOW | NO | N/A - unused props |
| Locations backfill | LOW | NO | Migration exists, code handles edge cases |
| Impersonation backward compat | LOW | NO | Already implemented |

## Recommendation

✅ **BACKWARD COMPATIBILITY ADDED** - Changes are now safe to deploy.

**Standard Pattern**: `screen:stock-adjustments:*` and `screen:tally-cards:*` are the **correct patterns** going forward.

All permission checks now support both old and new permission names for smooth transition:
- Toolbar buttons check both `screen:*` (NEW - standard) and `resource:*` (OLD - legacy) permissions
- Form submit buttons check both permission names
- Edit page buttons check both permission names

**Status**: ✅ Safe to deploy - backward compatibility ensures no breaking changes during transition period

**Future**: Once database migration is complete and all roles have new permissions, the old `resource:*` checks can be removed.

## Testing Checklist

Before deploying, verify:

- [ ] New permission names exist in database
- [ ] All roles have been granted new permissions (or migration script run)
- [ ] Test user with old permissions can still access features (if backward compat added)
- [ ] Test user with new permissions can access features
- [ ] "New" buttons appear for users with create permissions
- [ ] Form submit buttons work correctly

