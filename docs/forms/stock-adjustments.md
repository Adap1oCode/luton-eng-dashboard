# Stock Adjustments — Gold Standard Specification

**Version:** 1.0  
**Purpose:** Master reference for all resource-based screens (View, Edit, Delete, Create) within IMS  
**Applies To:** Any resource with tabular view + CRUD form behavior

> 📁 **Related Documentation:** For a complete file sitemap and guidance on creating new resources, see [`docs/forms/stock-adjustments-files-sitemap.md`](./stock-adjustments-files-sitemap.md)  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Screen Structure](#2-screen-structure)
3. [Row Actions](#3-row-actions)
4. [Edit / Create Form](#4-edit--create-form)
5. [API Contracts](#5-api-contracts)
6. [Permissions](#6-permissions)
7. [Test Hooks](#7-test-hooks-shared-identifiers)
8. [Testing Expectations](#8-testing-expectations)
9. [Performance & UX](#9-performance--ux)
10. [Accessibility](#10-accessibility)
11. [Definition of Done](#11-definition-of-done)
12. [File Map](#12-file-map-reference)
13. [Reuse Guidance](#13-reuse-guidance)

---

## 1. Overview

The **Stock Adjustments** module allows authorized users to view, create, edit, and delete stock adjustment records. It serves as the **reference implementation** for all resource pages in the system, covering:

- Layout and structure
- Permissions enforcement
- API structure
- Testing expectations

### Key Principles

- ✅ All interactions use **API endpoints only** (no direct database calls)
- ✅ All CRUD operations update the record count and refresh the SSR slice automatically
- ✅ "Edit" uses **SCD-2 logic** — saving a new record rather than mutating history
- ✅ Permissions fully gate all visible actions (View, Create, Edit, Delete, Export)

---

## 2. Screen Structure

### 2.1 Header

- Displays title: **"Stock Adjustments"**
- Shows record count chip (e.g. `310 total records`)
- Record count updates live after every create/delete

### 2.2 Action Toolbar

Buttons (permission-gated):

| Button | Description | Permission |
|--------|-------------|------------|
| **New Adjustment** | Navigate to create form | `resource:tcm_user_tally_card_entries:create` |
| **Bulk Delete** | Delete selected rows | `resource:tcm_user_tally_card_entries:delete` |

Follows consistent test IDs:
- `data-testid="btn-new"`
- `data-testid="btn-bulk-delete"`
- `data-testid="btn-export"`

### 2.3 Data Table

Standardized shared component used for all list pages.

#### Columns

| Column | Header | Sortable | Filterable |
|--------|--------|----------|------------|
| **Selection** | Checkbox (first column) | ❌ | ❌ |
| **Name** | Name | ✅ | ✅ |
| **Warehouse** | Warehouse | ✅ | ✅ |
| **Tally Card** | Tally Card # | ✅ | ✅ |
| **Qty** | Quantity | ✅ | ✅ |
| **Location** | Location | ✅ | ✅ |
| **Note** | Note | ❌ | ✅ |
| **Updated** | Updated | ✅ | ✅ |
| **Actions** | ⋯ (last column) | ❌ | ❌ |

#### Features

**Row Rendering Rules:**
- Text truncates with ellipsis
- Horizontal scrollbar appears if width exceeded
- No overflow

**Pagination (footer):**
- X of Y selected indicator
- Rows per page: 10, 20, 30, 40, 50
- Page indicator: Page 1 of N
- Next / Prev / First / Last controls
- Controlled via URL parameters

**Dates:**
- Pretty format (e.g. `26 Oct 2025, 09:05`)
- ISO tooltip on hover

**Data Table Features:**
- ✅ **Column reordering** (drag and drop)
- ✅ **Column resizing** (manual width adjustment)
- ✅ **Column show/hide** (visibility toggle)
- ✅ **Multi-column sorting** (click headers to sort)
- ✅ **Global filtering** (text search across all columns)
- ✅ **Per-column filtering** (specific column filters)
- ✅ **Row selection** (checkbox for bulk actions)
- ✅ **Row actions menu** (View/Edit/Delete per row)
- ✅ **Export to CSV** (download visible data)
- ✅ **URL state persistence** (pagination/filters in URL)
- ✅ **Responsive design** (mobile-friendly)
- ✅ **Keyboard navigation** (accessibility)

---

## 3. Row Actions

| Action | Description | Permission | Endpoint |
|--------|-------------|------------|----------|
| **View** | Opens record in read-only mode | `resource:tcm_user_tally_card_entries:read` | `GET /api/v_tcm_user_tally_card_entries/:id` |
| **Edit** | Opens 3-column edit form | `resource:tcm_user_tally_card_entries:create` | `POST /api/stock-adjustments/:id/actions/patch-scd2` (SCD-2) |
| **Delete** | Opens confirm modal, deletes record | `resource:tcm_user_tally_card_entries:delete` | `DELETE /api/tcm_user_tally_card_entries/:id` |

### 3.1 Delete Confirmation Modal

- **Title:** "Delete Stock Adjustment?"
- **Message:** "This action cannot be undone. Are you sure you want to delete Adjustment #XYZ?"
- **Buttons:** Cancel (default) and Delete (destructive)

**On success:**
- Toast "Deleted"
- SSR slice refresh (count and list update)

---

## 4. Edit / Create Form

### Form Fields

| Field | Type | Required | Widget | Span | Notes |
|-------|------|----------|--------|------|-------|
| **Tally Card #** | Text | ✅ | text input | 1 | Read-only, warehouse-scoped |
| **Quantity** | Number | ✅ | number input | 1 | Positive integers, negative allowed |
| **Location** | Text | ❌ | text input | 1 | Rack / Aisle / Bin |
| **Note** | Text | ❌ | textarea | 3 | Expands full width |

### Form Behavior

- Required fields marked with asterisk (*)
- Read-only fields carry `data-readonly="true"`
- **Create** uses `POST /api/forms/stock-adjustments`
- **Edit** uses `POST /api/stock-adjustments/:id/actions/patch-scd2` (SCD-2 rule)
- Success toast and redirect to list
- Form uses standard ShadCN UI + Tangerine theme

### Page Structure

- **Create:** `/forms/stock-adjustments/new`
- **Edit:** `/forms/stock-adjustments/[id]/edit`

---

## 5. API Contracts

| Method | Route | Description | Notes |
|--------|-------|-------------|-------|
| `GET` | `/api/v_tcm_user_tally_card_entries` | Paginated list; returns `{ rows, total }` | Original endpoint |
| `GET` | `/api/stock-adjustments` | Paginated list (alias) | Alias for above |
| `GET` | `/api/v_tcm_user_tally_card_entries/:id` | Single record | Original endpoint |
| `GET` | `/api/stock-adjustments/:id` | Single record (alias) | Alias for above |
| `POST` | `/api/forms/stock-adjustments` | Creates a new record (Create form) | Form submission |
| `POST` | `/api/stock-adjustments/:id/actions/patch-scd2` | SCD-2 update for Edit | Custom RPC-backed |
| `DELETE` | `/api/tcm_user_tally_card_entries/:id` | Deletes a record | Original endpoint |
| `DELETE` | `/api/stock-adjustments/:id` | Deletes a record (alias) | Alias for above |

### API Rules

- ✅ All routes respect RLS and forward cookies
- ✅ GET uses deterministic default sort
- ✅ `no-store` caching
- ✅ SCD-2 logic preserves history
- ✅ **Both original and alias endpoints work identically**
- ✅ Resource aliases are resolved via `resolveResource()` in `src/lib/api/`

---

## 6. Permissions

| Action | Permission Key | Behavior |
|--------|----------------|----------|
| View Screen | `resource:tcm_user_tally_card_entries:read` | Route allowed |
| Create / Edit | `resource:tcm_user_tally_card_entries:create` | "New" + "Save" visible |
| Delete | `resource:tcm_user_tally_card_entries:delete` | Delete button visible |

**Note:** If a permission is missing → button hidden (preferred) or disabled.

---

## 7. Test Hooks (Shared Identifiers)

| Element | Test ID |
|---------|---------|
| Screen root | `screen-stock-adjustments` |
| Record count | `record-count` |
| Buttons | `btn-new`, `btn-bulk-delete`, `btn-export` |
| Table | `resource-table` |
| Table header | `table-header` |
| Column grip | `col-grip` |
| Column resize handle | `col-resize` |
| Row select | `row-select` |
| Actions menu | `row-actions` |
| Pagination | `pagination` |
| Form field wrappers | `data-field="field_name"` |
| Delete modal | `confirm-delete` |

---

## 8. Testing Expectations

### 8.1 Playwright E2E Conformance Tests

**Files:**
```
tests/e2e/
  stock-adjustments.spec.ts              # Main E2E tests for stock adjustments
tests/e2e/forms/
  stock-adjustments.spec.ts               # Alternate location (duplicate)
src/tests/unit/forms/stock-adjustments/  # Unit tests
src/tests/integration/forms/stock-adjustments/  # Integration tests
```

**Core assertions:**
- ✅ Header + total count render and update after CRUD
- ✅ Toolbar actions respect permissions
- ✅ Table supports show/hide, sort, filter, drag, resize, pagination
- ✅ Form fields match config: required, read-only, correct widget
- ✅ Create → Edit (POST) → Delete all work end-to-end
- ✅ CSV export includes visible columns only
- ✅ All API calls return expected HTTP codes

### 8.2 Unit Tests

- Column header sort toggle
- Resize hook width logic
- Selection store (add/remove/clear)
- Form field rendering based on config

### 8.3 Integration Tests

- GET pagination math (`pageCount = ceil(total/pageSize)`)
- POST creates new record
- DELETE removes record and decreases count
- Auth + RLS enforced via cookies

---

## 9. Performance & UX

- ✅ SSR API must respond < 300 ms warm cache
- ✅ Page load < 1 s visible render
- ✅ All dates formatted prettily
- ✅ Errors displayed via standard toast
- ✅ Empty state shown when no results

---

## 10. Accessibility

- ✅ Keyboard reorder & resize fallback
- ✅ ARIA labels for toolbar buttons
- ✅ a11y audit with axe-core (no violations)
- ✅ Locale-aware dates and numbers

---

## 11. Definition of Done

- ✅ All CRUD + conformance tests pass
- ✅ Permissions enforced and UI gated
- ✅ Table behaviors consistent with contract
- ✅ Form fields validated and correctly rendered
- ✅ SSR slice refreshes on create/delete
- ✅ CI pipeline green (lint, typecheck, unit, e2e)
- ✅ Weekly compliance report shows ✅ for this resource

---

## 12. Component Architecture (Bug Fixing Reference)

### 12.1 View Screen (List Page) Components

**Flow:** `page.tsx` (server) → `PageShell` (server shell) → `StockAdjustmentsClient` (client) → `ResourceTableClient` → `DataTable`

#### Server Components (Rendered on Server)

1. **`src/app/(main)/forms/stock-adjustments/page.tsx`**
   - **Purpose:** Thin SSR wrapper that fetches initial data
   - **Responsibilities:** 
     - Fetches paginated data from API via `fetchResourcePage()`
     - Transforms domain data to row format via `toRow()`
     - Renders `PageShell` with `StockAdjustmentsClient` as children
   - **Bug Fixes:** API endpoint issues, data transformation problems

2. **`src/components/forms/shell/page-shell.tsx`** 
   - **Purpose:** Shared server shell for all list/view screens
   - **Responsibilities:**
     - Renders header card with title and record count
     - Renders toolbar (buttons, filters, export)
     - Renders footer (pagination)
     - Provides optimistic updates context
   - **Bug Fixes:** Layout issues, toolbar not showing, count not updating

#### Client Components (Hydrated in Browser)

3. **`src/components/forms/stock-adjustments/stock-adjustments-client.tsx`**
   - **Purpose:** Data fetching and state management wrapper
   - **Responsibilities:**
     - Uses React Query for client-side data fetching
     - Manages pagination state (page, pageSize)
     - Manages filter state
     - Performance monitoring
   - **Bug Fixes:** Data not refreshing, pagination broken, filters not working

4. **`src/components/forms/resource-view/resource-table-client.tsx`**
   - **Purpose:** Generic client island for data tables
   - **Responsibilities:**
     - Column management (visibility, order, resize)
     - Row selection state
     - Sorting state
     - Drag-and-drop column reordering
     - Inline editing
     - Export to CSV
   - **Bug Fixes:** Columns disappearing, sort not working, selection broken

5. **`src/components/data-table/data-table.tsx`**
   - **Purpose:** Core table rendering component (TanStack Table)
   - **Responsibilities:**
     - Renders table HTML structure
     - Handles row expansion
     - Renders custom cells
     - Keyboard navigation
   - **Bug Fixes:** Cells not rendering, expansion broken, keyboard navigation issues

6. **`src/components/forms/shell/toolbar/toolbar.tsx` & `toolbar-client.tsx`**
   - **Purpose:** Toolbar with buttons and actions
   - **Responsibilities:**
     - Renders left/right button clusters
     - Permission gating
     - Action handlers (delete, export, etc.)
   - **Bug Fixes:** Buttons not showing, permissions not enforced, actions not working

7. **`src/components/data-table/columns-menu.tsx`**
   - **Purpose:** Column visibility toggle menu
   - **Bug Fixes:** Columns can't be hidden/shown

8. **`src/components/data-table/sort-menu.tsx`**
   - **Purpose:** Multi-column sorting interface
   - **Bug Fixes:** Sort order incorrect, can't add multiple sorts

9. **`src/components/data-table/data-table-pagination.tsx`**
   - **Purpose:** Pagination controls
   - **Bug Fixes:** Page navigation broken, page size selector not working

### 12.2 Create/Edit Form Components

**Flow:** `new/page.tsx` (server) → `FormShell` (server shell) → `FormIsland` (client) → `DynamicForm` → `DynamicField`

#### Server Components

1. **`src/app/(main)/forms/stock-adjustments/new/page.tsx`**
   - **Purpose:** Thin SSR wrapper for create form
   - **Responsibilities:**
     - Loads `form.config.ts`
     - Normalizes config with `ensureSections()`
     - Builds defaults with `buildDefaults()`
     - Strips non-serializable functions
     - Renders `FormShell` with `FormIsland` as children
   - **Bug Fixes:** Form not loading, validation issues, submit not working

2. **`src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`**
   - **Purpose:** Thin SSR wrapper for edit form
   - **Responsibilities:**
     - Fetches existing record via `getRecordForEdit()`
     - Prepares config and defaults
     - Uses `ResourceFormSSRPage` instead of manual `FormShell`
   - **Bug Fixes:** Record not loading, SCD-2 update failing

3. **`src/components/forms/shell/form-shell.tsx`**
   - **Purpose:** Shared server shell for all forms (Create/Edit)
   - **Responsibilities:**
     - Renders header card with title and description
     - Renders footer with Cancel/Submit buttons
     - Permission gating on primary action
   - **Bug Fixes:** Header not showing, buttons missing, layout broken

4. **`src/components/forms/form-view/resource-form-ssr-page.tsx`**
   - **Purpose:** Generic SSR wrapper for edit forms (alternative to manual FormShell)
   - **Responsibilities:**
     - Wraps FormShell + FormIsland pattern
     - Handles Cancel button (Link)
     - Handles Submit button with permissions
   - **Bug Fixes:** Same as FormShell

#### Client Components

5. **`src/components/forms/shell/form-island.tsx`**
   - **Purpose:** Client form wrapper with submission logic
   - **Responsibilities:**
     - Calls API on form submit
     - Handles success/error states
     - Redirects on success
     - Shows error notifications
   - **Bug Fixes:** Submit not calling API, redirect broken, errors not showing

6. **`src/components/forms/dynamic-form.tsx`**
   - **Purpose:** Form rendering engine (configuration-driven)
   - **Responsibilities:**
     - Renders sections (collapsible cards)
     - Renders fields in grid layout
     - React Hook Form integration
     - Validation (Zod schema)
   - **Bug Fixes:** Fields not rendering, validation not working, layout broken

7. **`src/components/forms/dynamic-field.tsx`**
   - **Purpose:** Individual field rendering
   - **Responsibilities:**
     - Renders correct widget (text, number, select, etc.)
     - Shows label, description, error message
     - Handles disabled/readonly state
   - **Bug Fixes:** Wrong widget type, label missing, error not showing

8. **`src/components/forms/shell/section-card.tsx`**
   - **Purpose:** Collapsible section wrapper
   - **Bug Fixes:** Section not collapsing, default state wrong

### 12.3 Configuration Files

1. **`view.config.tsx`** - Table columns, features, row type
2. **`toolbar.config.tsx`** - Toolbar buttons, actions, permissions
3. **`form.config.ts`** - Form fields, schema, layout, validation

See "Configuration Files Reference" section for details.

### 12.4 Common Bug Scenarios & Where to Look

| Symptom | Likely Component | Fix Location |
|---------|-----------------|--------------|
| Column not showing | `view.config.tsx` → `buildColumns()` | Add column definition |
| Button not appearing | `toolbar.config.tsx` → `stockAdjustmentsToolbar` | Add button config |
| Form field not rendering | `form.config.ts` → `sections[].fields[]` | Add field definition |
| Data not loading | `page.tsx` → API call | Check API endpoint |
| Submit not working | `form-island.tsx` → `onSubmit` | Check API endpoint, payload |
| Validation error not showing | `form.config.ts` → `formSchema` | Fix Zod schema |
| Pagination broken | `resource-table-client.tsx` → state management | Check page/pageSize state |
| Sort not working | `resource-table-client.tsx` → sorting state | Check sort state management |
| Row selection broken | `useSelectionStore` → selection store | Check store state |
| Permission not enforced | Button's `requiredAny` in config | Check permission key |
| Layout broken | `form-shell.tsx` or `page-shell.tsx` | Check Tailwind classes |

---

## 14. File Map (Reference)

```
app/(main)/forms/stock-adjustments/
  page.tsx                    # Main list view (SSR wrapper)
  view.config.tsx             # Table columns + config
  toolbar.config.tsx          # Toolbar actions + permissions
  toolbar.tsx                 # ⚠️ EMPTY (unused placeholder)
  new/
    page.tsx                  # Create form (SSR wrapper using FormShell + FormIsland)
    form.config.ts            # Form fields + schema + layout
    form-component.tsx        # ❌ UNUSED (legacy, replaced by FormIsland)
    components.tsx            # ❌ UNUSED (legacy header/toolbar components)
  [id]/
    edit/
      page.tsx                # Edit form (SSR wrapper using ResourceFormSSRPage)

tests/e2e/forms/
  stock-adjustments.spec.ts   # E2E tests

docs/forms/
  stock-adjustments.md        # This document
```

**Note:** The files marked with ❌ (form-component.tsx, components.tsx) are legacy and not used by the current implementation. They can be safely deleted.

---

## 15. Reuse Guidance

When creating a new screen:

1. **Duplicate** the `stock-adjustments` folder structure
2. **Replace** resource name & config fields throughout
3. **Copy and adapt** contracts/tests
4. **Ensure** all conformance tests pass

This guarantees uniform functionality across all modules.

---

## Appendix: Current Implementation Notes

### Backend Resources

- **UI Path:** `/forms/stock-adjustments`
- **DB Table:** `tcm_user_tally_card_entries`
- **API Base:** `/api/v_tcm_user_tally_card_entries` (for list/read)
- **Form API:** `/api/forms/stock-adjustments` (for create)
- **SCD-2 API:** `/api/stock-adjustments/:id/actions/patch-scd2` (for edit)

### Permission Keys Used

- `resource:tcm_user_tally_card_entries:read`
- `resource:tcm_user_tally_card_entries:create`
- `resource:tcm_user_tally_card_entries:delete`

### Key Components

- `PageShell` - Wraps list view with toolbar
- `StockAdjustmentsClient` - Client-side data table
- `FormShell` - Wraps form views
- `FormIsland` - Client-side form component

### Data Table Implementation

The data table uses React Table (TanStack Table v8) with the following features:

- **Column Definitions:** Defined in `view.config.tsx` via `buildColumns()`
- **Row Data:** Mapped from API response in `page.tsx` via `toRow()` function
- **State Management:** URL state for pagination, filters, sorting
- **Selection Store:** Client-side row selection state
- **Actions:** Row actions (View/Edit/Delete) rendered via `makeActionsColumn()`
- **Pagination:** Server-side with URL param persistence
- **Filtering:** Global and per-column filters
- **Sorting:** Multi-column sorting with visual indicators
- **Responsive:** Mobile-friendly with horizontal scroll on small screens

### API Alias System

The `stock-adjustments` resource is an alias that maps to `tcm_user_tally_card_entries`:

```typescript
// In src/lib/data/resources/index.ts
"stock-adjustments": tcm_user_tally_card_entries,
```

Both endpoints work identically:
- `/api/v_tcm_user_tally_card_entries` (original)
- `/api/stock-adjustments` (alias)

Aliases are resolved via `resolveResource()` in `src/lib/api/resolve-resource.ts`.

---

## Configuration Files Reference

This section documents all configuration files used by the Stock Adjustments module. **All tests should validate that the UI behavior matches what's configured in these files.**

### 1. `view.config.tsx` - Data Table Configuration

**Location:** `src/app/(main)/forms/stock-adjustments/view.config.tsx`  
**Purpose:** Defines table columns, features, and view behavior

**Key Exports:**
- `StockAdjustmentRow` - TypeScript type for row data
- `stockAdjustmentsViewConfig: BaseViewConfig<StockAdjustmentRow>`
  - `resourceKeyForDelete` - API resource key for delete operations
  - `formsRouteSegment` - Route segment for form pages
  - `idField` - Field to use as unique identifier
  - `buildColumns()` - Function that returns column definitions
  - `features` - Table features (sorting, filtering, pagination, etc.)
  - `toolbar` - Toolbar configuration (references toolbar.config.tsx)

**Testing Requirements:**
- ✅ All columns defined in `buildColumns()` are rendered
- ✅ Column order matches `buildColumns()` return order
- ✅ Column headers match configured labels
- ✅ Sortable columns have sort indicators
- ✅ Filterable columns have filter controls
- ✅ Actions column (View/Edit/Delete) is last column
- ✅ Features (sorting, pagination, etc.) match `features` config

### 2. `toolbar.config.tsx` - Toolbar and Actions

**Location:** `src/app/(main)/forms/stock-adjustments/toolbar.config.tsx`  
**Purpose:** Defines toolbar buttons, actions, and permissions

**Key Exports:**
- `stockAdjustmentsToolbar: ToolbarConfig`
  - `left[]` - Buttons on the left (New, Delete, etc.)
  - `right[]` - Buttons on the right (Export, Filters, etc.)
  - Each button has: `id`, `label`, `icon`, `variant`, `href`, `requiredAny` (permissions)
- `stockAdjustmentsActions: ActionConfig`
  - `deleteSelected` - Bulk delete action
  - `exportCsv` - Export to CSV action
- `stockAdjustmentsChips: ChipsConfig` - Quick filter chips (currently undefined)

**Testing Requirements:**
- ✅ All buttons defined in `left[]` and `right[]` are rendered
- ✅ Button labels match configuration
- ✅ Buttons are hidden/disabled based on `requiredAny` permissions
- ✅ Action behaviors match `stockAdjustmentsActions` config
- ✅ Icons render correctly from `icon` field

### 3. `form.config.ts` - Form Configuration

**Location:** `src/app/(main)/forms/stock-adjustments/new/form.config.ts`  
**Purpose:** Defines form schema, fields, layout, and behavior

**Key Exports:**
- `formSchema` - Zod validation schema
- `defaultValues` - Default values for form fields
- `stockAdjustmentCreateConfig: FormConfig`
  - `key` - Form identifier
  - `title` - Form title
  - `subtitle` - Form subtitle
  - `permissionKey` - Required permission
  - `resource` - Backend resource name
  - `submitLabel` - Submit button label
  - `fields[]` - All fields (for schema/defaults)
  - `sections[]` - Layout sections with fields and layout config

**Testing Requirements:**
- ✅ All fields in `sections[]` are rendered
- ✅ Field labels match configuration
- ✅ Required fields show asterisk and validate
- ✅ Field types (text, number, textarea, etc.) match `kind`
- ✅ Read-only fields are disabled
- ✅ Default values populate correctly
- ✅ Validation errors match schema rules
- ✅ Layout matches `layout.columns` and `span` settings

### 4. `view-defaults.tsx` - Global Data Table Defaults

**Location:** `src/components/data-table/view-defaults.tsx`  
**Purpose:** Provides shared defaults and helpers for all data tables

**Key Exports:**
- `DEFAULT_FEATURES` - Default table features (sortable, pagination, etc.)
- `makeDefaultToolbar()` - Creates default toolbar config
- `DEFAULT_ACTIONS` - Default row actions (View, Edit, Delete)
- `makeActionsColumn()` - Helper to create actions column
- `BaseViewConfig<TRow>` - Base configuration type
- `createViewConfig()` - Helper to create full view config

**Usage:** This is referenced by all resource views and provides the foundation for table behavior.

**Testing Requirements:**
- ✅ Default features match `DEFAULT_FEATURES`
- ✅ Row actions menu shows View, Edit, Delete
- ✅ Toolbar defaults work when not overridden
- ✅ Actions column renders with three-dot menu

### Configuration Testing Strategy

When writing tests, validate:

1. **UI matches config** - Every UI element should have a corresponding configuration
2. **Permissions are enforced** - Test with users who have/don't have required permissions
3. **Config changes affect UI** - Modify config and verify UI updates
4. **Defaults work** - Verify default behaviors when config fields are undefined
5. **Type safety** - Configs should be TypeScript-typed and validated

### Configuration Files Summary

| File | Purpose | Key Concern |
|------|---------|-------------|
| `view.config.tsx` | Table columns, features | What columns show, in what order, with what features |
| `toolbar.config.tsx` | Toolbar buttons, actions | What buttons appear, what they do, permissions |
| `form.config.ts` | Form fields, layout, validation | What fields appear, layout, validation rules |
| `view-defaults.tsx` | Global table defaults | Default behaviors for all tables |

**Critical:** All three configs (`view`, `toolbar`, `form`) must be kept in sync. If you add a column in `view.config.tsx`, ensure the API returns that data. If you add a button in `toolbar.config.tsx`, implement the action handler.

---

**Last Updated:** 2025-01-27  
**Status:** ✅ Reference Implementation
