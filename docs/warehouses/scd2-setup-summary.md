# SCD2 Setup Summary for Warehouses and Warehouse Locations

## Current Status

### Resources Created
1. **`warehouses`** - ✅ Resource config exists, ❌ No SCD2 configured
2. **`warehouse_locations`** - ✅ Resource config exists, ❌ No SCD2 configured  
3. **`v_inventory_unique`** - ✅ View screen exists, ⚠️ No SCD2 needed (read-only view)

### Existing SCD2 Infrastructure

#### 1. Database Infrastructure
- **Migration**: `supabase/migrations/20250202_create_production_scd2_pattern.sql`
  - Creates `scd2_resource_config` table
  - Creates `fn_scd2_hash()` function
  - Creates `fn_scd2_patch_base()` function
  - Creates `fn_scd2_trigger_hash_shim()` function
  - Creates `fn_scd2_register_resource()` function
  - Creates `fn_scd2_attach_trigger()` function

#### 2. API Routes
- **History Endpoint**: `src/app/api/resources/[resource]/[id]/history/route.ts`
  - Generic endpoint that works for any resource with SCD2 enabled
  - Route: `GET /api/{resource}/{id}/history`
  - Returns all versions of a record grouped by anchor column
  - Mirrors list scoping (ownership + warehouse)

#### 3. Resource Config Pattern
- Resources can enable SCD2 by adding a `history` property to their `ResourceConfig`
- Example from `tcm_user_tally_card_entries.config.ts`:
  ```typescript
  history: {
    enabled: true,
    source: {
      anchorColumn: "tally_card_number",
    },
    projection: {
      columns: ["updated_at", "updated_at_pretty", "full_name", ...],
      orderBy: { column: "updated_at", direction: "desc" },
    },
    ui: {
      columns: [...],
      tabBadgeCount: true,
    },
  }
  ```

#### 4. Edit Page Pattern
- Edit pages can use SCD2 by:
  - Using `POST /api/{resource}/{id}/actions/patch-scd2` instead of `PATCH /api/{resource}/{id}`
  - Using `EditWithTabs` component to show History tab
  - Resolving resource config to get `historyUI` config

## What Needs to Be Created

### For `warehouses` Table

#### 1. Database Setup (SQL Migration)
```sql
-- Add hashdiff column
ALTER TABLE public.warehouses 
ADD COLUMN IF NOT EXISTS hashdiff text;

-- Add updated_by_user_id column (if not exists)
ALTER TABLE public.warehouses 
ADD COLUMN IF NOT EXISTS updated_by_user_id uuid REFERENCES auth.users(id);

-- Register for SCD2
SELECT public.fn_scd2_register_resource(
  p_table_name := 'public.warehouses',
  p_anchor_col := 'id',  -- UUID primary key as anchor
  p_temporal_col := 'updated_at',
  p_user_scoped := true,
  p_hashdiff_columns := '[
    {"name": "code", "type": "text", "normalize": "lower_trim"},
    {"name": "name", "type": "text", "normalize": "lower_trim"},
    {"name": "is_active", "type": "boolean", "normalize": "none"}
  ]'::jsonb,
  p_unique_key := ARRAY['updated_by_user_id', 'id', 'hashdiff']
);

-- Attach trigger
SELECT public.fn_scd2_attach_trigger('public.warehouses'::regclass);
```

#### 2. Update Resource Config
Add `history` property to `src/lib/data/resources/warehouses.config.ts`:
```typescript
history: {
  enabled: true,
  source: {
    anchorColumn: "id",  // UUID as anchor
  },
  projection: {
    columns: [
      "updated_at",
      "updated_at_pretty",
      "full_name",  // enriched from users
      "code",
      "name",
      "is_active",
    ],
    orderBy: { column: "updated_at", direction: "desc" },
  },
  ui: {
    columns: [
      { key: "updated_at_pretty", label: "Updated", format: "date", width: 200 },
      { key: "full_name", label: "User", width: 200 },
      { key: "code", label: "Code", width: 150 },
      { key: "name", label: "Name", width: 200 },
      { key: "is_active", label: "Active", format: "text", width: 100 },
    ],
    tabBadgeCount: true,
  },
}
```

#### 3. Update Edit Page
Change `src/app/(main)/forms/warehouses/[id]/edit/page.tsx` to use SCD2:
- Change action from `PATCH /api/warehouses/{id}` to `POST /api/warehouses/{id}/actions/patch-scd2`
- Use `EditWithTabs` component instead of `ResourceFormSSRPage`
- Resolve resource config for `historyUI`

### For `warehouse_locations` Table

#### 1. Database Setup (SQL Migration)
```sql
-- Add hashdiff column
ALTER TABLE public.warehouse_locations 
ADD COLUMN IF NOT EXISTS hashdiff text;

-- Add updated_by_user_id column (if not exists)
ALTER TABLE public.warehouse_locations 
ADD COLUMN IF NOT EXISTS updated_by_user_id uuid REFERENCES auth.users(id);

-- Register for SCD2
SELECT public.fn_scd2_register_resource(
  p_table_name := 'public.warehouse_locations',
  p_anchor_col := 'id',  -- UUID primary key as anchor
  p_temporal_col := 'updated_at',
  p_user_scoped := true,
  p_hashdiff_columns := '[
    {"name": "warehouse_id", "type": "uuid", "normalize": "none"},
    {"name": "name", "type": "text", "normalize": "lower_trim"},
    {"name": "is_active", "type": "boolean", "normalize": "none"}
  ]'::jsonb,
  p_unique_key := ARRAY['updated_by_user_id', 'id', 'hashdiff']
);

-- Attach trigger
SELECT public.fn_scd2_attach_trigger('public.warehouse_locations'::regclass);
```

#### 2. Update Resource Config
Add `history` property to `src/lib/data/resources/warehouse_locations.config.ts`

#### 3. Update Edit Page
Change `src/app/(main)/forms/warehouse-locations/[id]/edit/page.tsx` to use SCD2

### For `v_inventory_unique` View
- **No SCD2 needed** - This is a read-only view, not a table
- Views cannot have SCD2 tracking (they don't have primary keys or update capabilities)

## Files That Exist

### Database
- ✅ `supabase/migrations/20250202_create_production_scd2_pattern.sql` - Core SCD2 infrastructure

### API Routes
- ✅ `src/app/api/resources/[resource]/[id]/history/route.ts` - Generic history endpoint
- ✅ `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts` - Example SCD2 patch endpoint
- ⚠️ Need to create: `src/app/api/warehouses/[id]/actions/patch-scd2/route.ts`
- ⚠️ Need to create: `src/app/api/warehouse-locations/[id]/actions/patch-scd2/route.ts`

### Resource Configs
- ✅ `src/lib/data/resources/tcm_user_tally_card_entries.config.ts` - Example with SCD2
- ✅ `src/lib/data/resources/warehouses.config.ts` - Needs history config added
- ✅ `src/lib/data/resources/warehouse_locations.config.ts` - Needs history config added

### Edit Pages
- ✅ `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx` - Example with SCD2
- ✅ `src/app/(main)/forms/warehouses/[id]/edit/page.tsx` - Needs SCD2 integration
- ✅ `src/app/(main)/forms/warehouse-locations/[id]/edit/page.tsx` - Needs SCD2 integration

### Components
- ✅ `src/components/history/edit-with-tabs.tsx` - History tab component
- ✅ `src/components/forms/form-view/resource-form-ssr-page.tsx` - Standard form page

## Decision: Do You Want SCD2 for Warehouses and Locations?

**Considerations:**
- **Warehouses**: Master data that changes infrequently. SCD2 provides audit trail of who changed what and when.
- **Warehouse Locations**: Reference data that may change more often. SCD2 provides history of location name changes, activation/deactivation.

**Recommendation**: Enable SCD2 for both if you want:
- Audit trail of changes
- History tab in edit screens
- Ability to see who made changes and when

If you don't need history tracking, you can keep the current simple update pattern.


