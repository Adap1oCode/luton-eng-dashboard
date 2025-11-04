# Screen Creation Checklist

**Purpose:** Step-by-step guide for creating new resource-based screens by cloning the stock-adjustments gold standard  
**Last Updated:** 2025-01-29  
**Reference:** See [`docs/forms/stock-adjustments.md`](./stock-adjustments.md) for detailed specifications

---

## Overview

This checklist guides you through cloning the stock-adjustments screen structure to create a new resource screen. The stock-adjustments module is the gold standard and should be used as the template for all new screens.

---

## Prerequisites

Before starting, ensure you have:
- Schema information for your new resource (table/view definitions)
- Understanding of which table is for list/view (typically a view)
- Understanding of which table is for new/edit/history (SCD-2 base table)
- Anchor column identifier (for SCD-2 history tracking)
- Resource key (snake_case database name)
- Route segment name (kebab-case UI name)

---

## Step-by-Step Checklist

### Phase 1: Directory Structure & File Cloning

- [ ] **Create feature branch**
  ```bash
  git checkout -b feat/{resource-name}-screen
  ```

- [ ] **Clone UI directory structure**
  ```bash
  # Windows PowerShell
  xcopy /E /I /Y "src\app\(main)\forms\stock-adjustments" "src\app\(main)\forms\{resource-name}"
  
  # Or use Git/File Explorer to copy the directory
  ```

- [ ] **Clone API routes**
  ```bash
  xcopy /E /I /Y "src\app\api\stock-adjustments" "src\app\api\{resource-name}"
  ```

- [ ] **Clone test directories**
  ```bash
  # Unit tests
  xcopy /E /I /Y "src\tests\unit\forms\stock-adjustments" "src\tests\unit\forms\{resource-name}"
  
  # Integration tests
  xcopy /E /I /Y "src\tests\integration\forms\stock-adjustments" "src\tests\integration\forms\{resource-name}"
  ```

- [ ] **Rename main config file**
  ```bash
  Move-Item "src\app\(main)\forms\{resource-name}\stock-adjustments.config.tsx" "src\app\(main)\forms\{resource-name}\{resource-name}.config.tsx"
  ```

- [ ] **Rename table client file**
  ```bash
  Move-Item "src\app\(main)\forms\{resource-name}\stock-adjustments-table-client.tsx" "src\app\(main)\forms\{resource-name}\{resource-name}-table-client.tsx"
  ```

---

### Phase 2: Configuration Updates (Form-Specific Files Only)

#### 2.1 Main Config (`{resource-name}.config.tsx`)

- [ ] Update constants:
  - `ROUTE_SEGMENT`: `"{resource-name}"` (kebab-case)
  - `API_ENDPOINT`: `"/api/{view_name}"` (view endpoint for list screen)
  - `RESOURCE_KEY`: `"{resource_key}"` (snake_case database name)
  - `PERMISSION_PREFIX`: `"resource:{resource_key}"`
  - `RESOURCE_TITLE`: `"{Resource Name}"` (human-readable title)

- [ ] Update row type (`{ResourceName}Row`):
  - Map all columns from the view used for list screen
  - Ensure nullable fields are marked as `| null`
  - Use appropriate types (string, number, boolean, etc.)

- [ ] Update `buildColumns()`:
  - Replace all column definitions with your resource fields
  - Update column headers, sizes, and sortability
  - Update edit links to use `{resource-name}` route
  - Add inline edit configs if needed
  - Remove columns that don't exist in your schema

- [ ] Update quick filters (if applicable):
  - Remove/edit filters that don't apply to your resource
  - Update filter meta array

- [ ] Update toolbar config:
  - Update button labels (e.g., "New {Resource Name}")
  - Update href paths to use `{resource-name}`
  - Update permissions to use `{resource_key}`

- [ ] Update actions config:
  - Update endpoints to use your view endpoint

#### 2.2 Table Client (`{resource-name}-table-client.tsx`)

- [ ] Update imports:
  - Change from `stock-adjustments.config` to `{resource-name}.config`
  - Update type references from `StockAdjustmentRow` to `{ResourceName}Row`

- [ ] Update component name:
  - Change from `StockAdjustmentsTableClient` to `{ResourceName}TableClient`
  - Update props interface name

#### 2.3 Row Transformer (`to-row.ts`)

- [ ] Update imports:
  - Change from `stock-adjustments.config` to `{resource-name}.config`
  - Update type reference

- [ ] Update transformation logic:
  - Map all view columns to row type
  - Handle type conversions (string to number, etc.)
  - Handle null/undefined values appropriately

#### 2.4 List Page (`page.tsx`)

- [ ] Update file header comment (route path)

- [ ] Update imports:
  - Change from `stock-adjustments.config` to `{resource-name}.config`
  - Change from `StockAdjustmentsTableClient` to `{ResourceName}TableClient`

- [ ] Update filter logic:
  - Remove status filter logic if not applicable
  - Update filter meta reference

- [ ] Update component references:
  - Change table client component name

#### 2.5 Create Form (`new/form.config.ts`)

- [ ] Update file header comment

- [ ] Update form schema (`formSchema`):
  - Match fields to your base table schema
  - Use appropriate Zod validators
  - Mark required fields

- [ ] Update default values:
  - Set appropriate defaults for your fields

- [ ] Update form config:
  - `key`: `"{resource-name}"`
  - `title`: `"New {Resource Name}"`
  - `resource`: `"{resource_key}"` (base table for create)
  - `permissionKey`: `"resource:{resource_key}:create"`
  - `submitLabel`: `"Save {Resource Name}"`

- [ ] Update form fields:
  - List all fields from your schema
  - Set appropriate field types (text, number, select, checkbox, etc.)
  - Configure required/optional status
  - Add placeholders and descriptions

- [ ] Update form sections:
  - Organize fields into logical sections
  - Set column layout (2-col, 3-col, etc.)
  - Set field spans for full-width fields

- [ ] Update submit function:
  - Change endpoint to `/api/forms/{resource-name}`

- [ ] Update redirect function:
  - Change paths to use `{resource-name}`

#### 2.6 Create Form Page (`new/page.tsx`)

- [ ] Update imports:
  - Change from `stockAdjustmentCreateConfig` to `{resourceName}CreateConfig`

- [ ] Update function name:
  - Change from `NewStockAdjustmentPage` to `New{ResourceName}Page`

- [ ] Update form ID:
  - Change from `"stock-adjustment-form"` to `"{resource-name}-form"`

- [ ] Update permissions:
  - Change to `"resource:{resource_key}:create"`

#### 2.7 Edit Form (`[id]/edit/page.tsx`)

- [ ] Update file header comment

- [ ] Update imports:
  - Change from `stockAdjustmentCreateConfig` to `{resourceName}CreateConfig`

- [ ] Update function name:
  - Change from `EditStockAdjustmentPage` to `Edit{ResourceName}Page`

- [ ] Update resource key references:
  - Ensure it uses the form config's `key` property

- [ ] Update SCD-2 endpoint:
  - Change to `/api/{resource-name}/[id]/actions/patch-scd2`

- [ ] Update permissions:
  - Change to `"resource:{resource_key}:update"`

- [ ] Update error messages:
  - Change "stock adjustment" to "{resource name}"

- [ ] Update form ID:
  - Change to `"{resource-name}-form"`

- [ ] Update title:
  - Change to `"Edit {Resource Name}"`

#### 2.8 API Route (`api/{resource-name}/[id]/actions/patch-scd2/route.ts`)

- [ ] Update file header comment

- [ ] Update RPC function call:
  - Change from `fn_user_entry_patch_scd2` to `fn_{resource_name}_patch_scd2`
  - Update parameter names to match your schema
  - Map payload fields correctly

- [ ] Update error handling (if needed)

---

### Phase 3: Resource Registry & History Configuration

#### 3.1 Resource Registry (`src/lib/data/resources/index.ts`)

- [ ] Verify resource alias exists:
  ```typescript
  "{resource-name}": {resource_config},
  ```
  - If missing, add the alias mapping

- [ ] Verify resource config is imported:
  ```typescript
  import {resource_config} from "./{resource_config}.config.ts";
  ```

- [ ] Verify view config is imported (if using a view):
  ```typescript
  import {view_config} from "./{view_config}.config.ts";
  ```

#### 3.2 Resource Config (`src/lib/data/resources/{resource_key}.config.ts`)

- [ ] Verify config exists and is correct:
  - Check `table` matches base table name
  - Check `pk` matches primary key column
  - Check `select` includes all needed columns
  - Check `search` fields are appropriate

- [ ] **Add history configuration** (if SCD-2):
  ```typescript
  history: {
    enabled: true,
    source: {
      anchorColumn: "{anchor_column}", // e.g., "card_uid", "tally_card_number"
      warehouseColumn: "{warehouse_column}", // if warehouse-scoped
    },
    projection: {
      columns: [
        "{timestamp_column}", // e.g., "snapshot_at" or "updated_at"
        "{timestamp_column}_pretty",
        // ... other columns to show in history
      ],
      orderBy: { column: "{timestamp_column}", direction: "desc" },
    },
    ui: {
      columns: [
        { key: "{timestamp_column}_pretty", label: "Updated", format: "date", width: 200 },
        // ... other UI columns
      ],
      tabBadgeCount: true,
    },
  },
  ```

---

### Phase 4: Database Function (SCD-2 Patch)

- [ ] **Check if RPC function exists:**
  ```sql
  -- Search for existing function
  SELECT proname FROM pg_proc WHERE proname LIKE '%{resource_name}%patch%';
  ```

- [ ] **Create migration** (if function doesn't exist):
  - File: `supabase/migrations/YYYYMMDD_create_{resource_name}_patch_scd2_function.sql`
  - Function signature based on your schema fields
  - Use anchor column to group history (e.g., `card_uid`)
  - Handle all editable fields
  - Set timestamp column (e.g., `snapshot_at = now()`)
  - Return new record
  - Grant execute permission to authenticated users

---

### Phase 5: Test Updates

#### 5.1 Unit Tests (`__tests__/` and `src/tests/unit/forms/{resource-name}/`)

- [ ] **Update `columns.spec.ts`:**
  - Change imports to use `{resource-name}.config`
  - Update column ID expectations
  - Update column property tests

- [ ] **Update `to-row.spec.ts`:**
  - Change imports
  - Update test data to match your schema
  - Update expected output structure

- [ ] **Update `filters.spec.ts`:**
  - Change imports
  - Update filter logic tests (or remove if no filters)

- [ ] **Update `view-config.spec.tsx`:**
  - Change imports
  - Update type tests
  - Update column expectations

- [ ] **Update `toolbar-config.spec.tsx`:**
  - Change imports
  - Update button label expectations
  - Update permission expectations
  - Update endpoint expectations

- [ ] **Update `page-simple.spec.tsx`:**
  - Change imports
  - Update metadata title expectation

- [ ] **Update `basic.spec.tsx`:**
  - Change imports
  - Update config structure tests

#### 5.2 Integration Tests (`src/tests/integration/forms/{resource-name}/`)

- [ ] **Update `api.spec.ts`:**
  - Change all resource references
  - Update endpoint URLs
  - Update mock data structure
  - Update column expectations in responses
  - Remove ownership scoping tests if not applicable

---

### Phase 6: Verification

- [ ] **Run typecheck:**
  ```bash
  pnpm typecheck
  ```

- [ ] **Run lint:**
  ```bash
  pnpm lint
  ```

- [ ] **Fix any lint errors:**
  - Update imports
  - Fix type mismatches
  - Remove unused imports

- [ ] **Build check:**
  ```bash
  pnpm build
  ```

- [ ] **Run tests:**
  ```bash
  pnpm test
  ```

---

## Key Configuration Mappings Reference

When updating files, use this mapping table:

| Stock Adjustments | Your Resource |
|------------------|---------------|
| `tcm_user_tally_card_entries` | `{your_base_table}` |
| `v_tcm_user_tally_card_entries` | `{your_view_table}` |
| `fn_user_entry_patch_scd2` | `fn_{your_resource}_patch_scd2` |
| Anchor: `tally_card_number` | Anchor: `{your_anchor_column}` |
| Fields: `qty`, `location`, `note` | Fields: `{your_editable_fields}` |
| `updated_at` | `{your_timestamp_column}` (snapshot_at or updated_at) |

---

## Common Gotchas

1. **Naming Consistency:**
   - UI route: kebab-case (`tally-cards`)
   - Resource key: snake_case (`tcm_tally_cards`)
   - Component names: PascalCase (`TallyCardsTableClient`)
   - Config exports: camelCase (`tallyCardsViewConfig`)

2. **Import Paths:**
   - Always use relative imports within the same directory
   - Use `@/` alias for shared components
   - Double-check import paths after renaming files

3. **Type Safety:**
   - Ensure row types match the actual view columns
   - Use proper null handling (`| null` for nullable fields)
   - Convert types correctly in `to-row.ts`

4. **History Configuration:**
   - Anchor column must exist in the base table
   - Warehouse column (if used) must exist in the base table
   - Timestamp column should match your SCD-2 pattern
   - UI columns should match projection columns

5. **SCD-2 Function:**
   - Function must use anchor column to group history
   - Must insert new record (not update existing)
   - Must set timestamp column
   - Must return the new record

6. **Permissions:**
   - Always use pattern: `resource:{resource_key}:{action}`
   - Update all permission references consistently

7. **Test Updates:**
   - Update all test imports
   - Update all test data structures
   - Update all expectations
   - Remove tests for features not applicable to your resource

---

## Files Checklist Summary

### Files to Create/Update:
- [x] `src/app/(main)/forms/{resource-name}/page.tsx`
- [x] `src/app/(main)/forms/{resource-name}/{resource-name}.config.tsx`
- [x] `src/app/(main)/forms/{resource-name}/{resource-name}-table-client.tsx`
- [x] `src/app/(main)/forms/{resource-name}/to-row.ts`
- [x] `src/app/(main)/forms/{resource-name}/new/page.tsx`
- [x] `src/app/(main)/forms/{resource-name}/new/form.config.ts`
- [x] `src/app/(main)/forms/{resource-name}/[id]/edit/page.tsx`
- [x] `src/app/(main)/forms/{resource-name}/__tests__/*.spec.ts`
- [x] `src/app/api/{resource-name}/[id]/actions/patch-scd2/route.ts`
- [x] `src/tests/unit/forms/{resource-name}/*.spec.tsx`
- [x] `src/tests/integration/forms/{resource-name}/*.spec.ts`
- [x] `src/lib/data/resources/{resource_key}.config.ts` (add history config)
- [x] `supabase/migrations/YYYYMMDD_create_{resource_name}_patch_scd2_function.sql` (if needed)

### Files NOT to Modify:
- Generic components (ResourceTableClient, FormShell, FormIsland, etc.)
- Shared utilities
- Generic hooks

---

## Completion Checklist

Before considering the task complete:

- [ ] All files updated with correct names and references
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Unit tests pass (`pnpm test`)
- [ ] Integration tests pass
- [ ] History configuration added (if SCD-2)
- [ ] SCD-2 RPC function created (if needed)
- [ ] Resource registry updated
- [ ] All imports corrected
- [ ] All permissions updated
- [ ] All endpoints updated
- [ ] Documentation updated (if needed)

---

## Next Steps After Completion

1. Test the screen manually:
   - Navigate to `/forms/{resource-name}`
   - Verify list view displays correctly
   - Test create form
   - Test edit form
   - Test history tab (if SCD-2)

2. Run full verification:
   ```bash
   pnpm ci:verify
   ```

3. Create PR with:
   - Branch name
   - `ci:verify` output
   - List of updated files
   - Vercel preview URL

---

## Reference Documentation

- **Gold Standard Spec:** [`docs/forms/stock-adjustments.md`](./stock-adjustments.md)
- **File Sitemap:** [`docs/forms/stock-adjustments-files-sitemap.md`](./stock-adjustments-files-sitemap.md)
- **History Enrichment:** [`RLS_REQUIREMENTS_FOR_HISTORY_ENRICHMENT.md`](../../RLS_REQUIREMENTS_FOR_HISTORY_ENRICHMENT.md)

---

## Example: Tally Cards Implementation

This checklist was created while implementing the tally-cards screen. Key learnings:

- **Anchor Column:** Used `card_uid` from `tcm_tally_card_anchor` table
- **View vs Base:** `v_tcm_tally_cards_current` for list, `tcm_tally_cards` for edit/history
- **Timestamp:** Used `snapshot_at` instead of `updated_at` for SCD-2
- **No Ownership Scoping:** Tally cards don't have ownership scope (unlike stock-adjustments)
- **History Columns:** Included `snapshot_at`, `tally_card_number`, `warehouse_id`, `item_number`, `note`, `is_active`

