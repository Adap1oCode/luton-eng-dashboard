# Stock Adjustments - Complete File Sitemap

**Purpose:** Master reference for all files involved in Stock Adjustments CRUD operations  
**Last Updated:** 2025-01-27

> 📋 **Related Documentation:** For detailed specifications, API contracts, and testing expectations, see [`docs/forms/stock-adjustments.md`](./stock-adjustments.md)

---

## 📋 Table of Contents

1. [Resource Organization](#1-resource-organization)
2. [Creating New Resources](#2-creating-new-resources)
3. [UI Pages (Server Components)](#3-ui-pages-server-components)
4. [Configuration Files](#4-configuration-files)
5. [API Routes](#5-api-routes)
6. [Shared Components](#6-shared-components)
7. [Hooks](#7-hooks)
8. [Utility Libraries](#8-utility-libraries)
9. [Tests](#9-tests)
10. [Documentation](#10-documentation)

---

## 1. Resource Organization

### Where Resources Live

All resources follow a consistent pattern with three primary locations:

#### 1. UI Pages (App Router)
```
src/app/(main)/forms/{resource-name}/
├── page.tsx                    # List view (required)
├── view.config.tsx             # Table configuration (required)
├── toolbar.config.tsx          # Toolbar configuration (required)
├── stock-adjustments-client.tsx        # Client component (optional)
├── stock-adjustments-error-boundary.tsx # Error boundary (optional)
├── quick-filters-client.tsx            # Quick filters (optional)
├── new/
│   ├── page.tsx                # Create form (required)
│   └── form.config.ts          # Form configuration (required)
└── [id]/
    └── edit/
        └── page.tsx            # Edit form (required)
```

#### 2. API Routes
```
src/app/api/{resource-name}/
├── [resource]/route.ts         # Generic CRUD endpoint (shared)
└── [id]/actions/
    └── patch-scd2/route.ts     # Custom actions (optional)
```

#### 3. Resource Registry
```
src/lib/data/resources/index.ts   # Maps UI names to backend names
```

### Resource Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **UI Path** | kebab-case | `/forms/stock-adjustments` |
| **Folder** | kebab-case | `stock-adjustments/` |
| **Config Export** | camelCase | `stockAdjustmentsViewConfig` |
| **Backend Resource** | snake_case | `tcm_user_tally_card_entries` |

### Resource Registry Pattern

Every resource must be registered in `src/lib/data/resources/index.ts`:

```typescript
export const RESOURCE_MAP = {
  'stock-adjustments': 'tcm_user_tally_card_entries',
  'users': 'users',
  'products': 'products',
  // Add new resources here
};
```

This enables:
- API alias system (`/api/stock-adjustments` → `/api/tcm_user_tally_card_entries`)
- Clean URLs vs. database naming
- Automatic resource resolution

---

## 2. Creating New Resources

### ✅ What to Create (Per Resource)

When adding a new resource (e.g., "inventory-transfers"), create these files:

```
src/app/(main)/forms/inventory-transfers/
├── page.tsx                    # ✅ CREATE - List view
├── view.config.tsx             # ✅ CREATE - Table columns
├── toolbar.config.tsx          # ✅ CREATE - Toolbar actions
├── new/
│   ├── page.tsx                # ✅ CREATE - Create form
│   └── form.config.ts          # ✅ CREATE - Form schema
└── [id]/
    └── edit/
        └── page.tsx            # ✅ CREATE - Edit form
```

**Also Create:**
- ✅ Add entry to `src/lib/data/resources/index.ts`
- ✅ Create API route if custom action needed
- ✅ Add tests in `tests/unit/forms/inventory-transfers/`
- ✅ Add E2E tests in `tests/e2e/inventory-transfers.spec.ts`

### ❌ What NOT to Create (Reuse Instead)

DO NOT create resource-specific versions of these generic components:

| Don't Create | Use Instead | Location |
|-------------|-------------|----------|
| ❌ `InventoryTransfersClient.tsx` | ✅ `ResourceTableClient` | `src/components/forms/resource-view/` |
| ❌ `InventoryTransfersForm.tsx` | ✅ `FormIsland` | `src/components/forms/shell/form-island.tsx` |
| ❌ `useInventoryTransfers.ts` | ✅ SSR data fetching | Direct in `page.tsx` |
| ❌ `InventoryTransfersTable.tsx` | ✅ `DataTable` | `src/components/data-table/` |
| ❌ Custom toolbar component | ✅ `ToolbarConfig` | Configuration in `toolbar.config.tsx` |

### 🔧 When to Enhance Generic Files

Only modify these generic files if you need to add **cross-resource functionality**:

#### Generic Files to Enhance (Rarely)
```
src/components/forms/resource-view/resource-table-client.tsx
  └─ Only enhance if feature benefits ALL resources

src/components/forms/shell/form-island.tsx
  └─ Only enhance if submission logic applies to ALL forms

src/components/forms/dynamic-form.tsx
  └─ Only enhance if field widget needed by multiple resources

src/components/data-table/data-table.tsx
  └─ Only enhance if table feature needed globally
```

**Decision Guide:**
- ❌ **Don't modify** if only 1-2 resources need the feature
  - Instead: Add to resource-specific config or create wrapper
- ✅ **Do modify** if 3+ resources would benefit
  - Update generic component
  - Update all resources to use new feature
  - Add backward compatibility if needed

### 📝 New Resource Checklist

When creating a new resource, follow this checklist:

- [ ] Create folder under `src/app/(main)/forms/{resource-name}/`
- [ ] Create `page.tsx` for list view (use `PageShell` + `ResourceTableClient`)
- [ ] Create `view.config.tsx` (columns, features)
- [ ] Create `toolbar.config.tsx` (buttons, actions, permissions)
- [ ] Create `new/page.tsx` (use `FormShell` + `FormIsland`)
- [ ] Create `new/form.config.ts` (schema, layout, validation)
- [ ] Create `[id]/edit/page.tsx` (use `ResourceFormSSRPage` or similar)
- [ ] Register resource in `src/lib/data/resources/index.ts`
- [ ] Create API route if custom actions needed
- [ ] Add unit tests in `tests/unit/forms/{resource-name}/`
- [ ] Add E2E tests in `tests/e2e/{resource-name}.spec.ts`
- [ ] Add smoke test to `tests/e2e/smoke.spec.ts`
- [ ] Update documentation in `docs/forms/`
- [ ] Verify `npm run ci:verify` passes

### 🎯 Key Principles

1. **Configuration Over Code**: Use configs (`view.config.tsx`, `form.config.ts`) instead of custom components
2. **Reuse, Don't Duplicate**: Generic components handle 95% of cases
3. **Extend When Needed**: Enhance generic files for cross-resource features
4. **Test Everything**: Every resource needs unit + E2E tests
5. **Document Changes**: Update docs when adding new resources

---

## 3. UI Pages (Server Components)

### List View (Read All)
```
src/app/(main)/forms/stock-adjustments/page.tsx
```
- **Purpose:** Main list view with data table
- **Type:** Server Component
- **Responsibilities:**
  - Fetches paginated data from API
  - Transforms domain data to row format
  - Renders `PageShell` + `ResourceTableClient`
- **Data Flow:** API → toRow() → ResourceTableClient

### Create Form
```
src/app/(main)/forms/stock-adjustments/new/page.tsx
src/app/(main)/forms/stock-adjustments/new/form.config.ts
```
- **page.tsx:** Server wrapper using `FormShell` + `FormIsland`
- **form.config.ts:** Zod schema, form fields, layout, validation
- ~~**form-component.tsx:** Deleted (unused legacy component)~~
- ~~**components.tsx:** Deleted (unused legacy components)~~

### Edit Form
```
src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx
```
- **Purpose:** Edit existing record with SCD-2 logic
- **Type:** Server Component
- **Responsibilities:**
  - Fetches existing record via `getRecordForEdit()`
  - Uses `ResourceFormSSRPage` wrapper
  - Configures SCD-2 endpoint

---

## 4. Configuration Files

### View Configuration
```
src/app/(main)/forms/stock-adjustments/view.config.tsx
```
- **Purpose:** Data table columns, features, behaviors
- **Exports:**
  - `StockAdjustmentRow` type
  - `stockAdjustmentsViewConfig` object
  - `buildColumns()` function

### Toolbar Configuration
```
src/app/(main)/forms/stock-adjustments/toolbar.config.tsx
```
- **Purpose:** Toolbar buttons, actions, permissions
- **Exports:**
  - `stockAdjustmentsToolbar`
  - `stockAdjustmentsActions`
  - `stockAdjustmentsChips`

### Empty File
```
~~src/app/(main)/forms/stock-adjustments/toolbar.tsx~~  ✅ DELETED
```
- ~~Empty placeholder file~~ - Deleted

---

## 5. API Routes

### Generic Resource API
```
src/app/api/[resource]/route.ts
```
- **Endpoints Handled:**
  - `GET /api/stock-adjustments` (list with pagination)
  - `GET /api/v_tcm_user_tally_card_entries` (original endpoint)
- **Both endpoints work identically** (alias system)

### SCD-2 Update Endpoint
```
src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts
```
- **Purpose:** Custom RPC-backed SCD-2 update for Edit
- **Method:** `POST`
- **Logic:** Preserves history by creating new record instead of mutating

### Form Submission
```
src/app/api/forms/stock-adjustments
```
- Handled by generic forms API route
- **Method:** `POST`

---

## 6. Shared Components

### Page Shell
```
src/components/forms/shell/page-shell.tsx
```
- **Purpose:** Server shell for list/view screens
- **Features:** Header, toolbar, footer, optimistic updates

### Resource Table Client
```
src/components/forms/resource-view/resource-table-client.tsx
```
- **Purpose:** Generic client island for data tables
- **Features:** Columns, selection, sorting, filtering, pagination, export
- **Used by:** stock-adjustments, users, products, tally-cards

### Form Shell
```
src/components/forms/shell/form-shell.tsx
```
- **Purpose:** Server shell for create/edit forms
- **Features:** Header, footer with Cancel/Submit buttons

### Form Island
```
src/components/forms/shell/form-island.tsx
```
- **Purpose:** Client form wrapper with submission logic
- **Features:** API calls, error handling, redirects

### Dynamic Form
```
src/components/forms/dynamic-form.tsx
```
- **Purpose:** Configuration-driven form rendering engine
- **Features:** Sections, fields, validation

### Dynamic Field
```
src/components/forms/dynamic-field.tsx
```
- **Purpose:** Individual field rendering
- **Widgets:** text, number, select, textarea, etc.

### Resource Form SSR Page
```
src/components/forms/form-view/resource-form-ssr-page.tsx
```
- **Purpose:** Generic SSR wrapper for edit forms
- **Pattern:** FormShell + FormIsland wrapper

### Data Table Components
```
src/components/data-table/
├── data-table.tsx                 # Core TanStack Table
├── data-table-pagination.tsx      # Pagination controls
├── columns-menu.tsx               # Column visibility
├── sort-menu.tsx                  # Multi-column sorting
├── auto-column-widths.ts          # Auto-sizing logic
├── table-utils.ts                 # String predicates
├── resizable-draggable-header.tsx # Column header with resize/drag
├── inline-edit-cell-wrapper.tsx   # Inline editing wrapper
├── status-cell-wrapper.tsx        # Status cell wrapper
└── view-defaults.tsx              # Global table defaults
```

---

## 7. Hooks

```
~~src/hooks/use-stock-adjustments.ts~~  ✅ DELETED
```
- ~~**Purpose:** React Query hooks for data fetching~~ - Deleted (unused legacy)
- ~~**Exports:**~~ No longer exists

---

## 8. Utility Libraries

### Resource Registry
```
src/lib/data/resources/index.ts
```
- Maps `"stock-adjustments"` → `tcm_user_tally_card_entries`
- Enables alias system

### Resource Fetch
```
src/lib/data/resource-fetch.ts
```
- Generic API fetching utility
- Used by `page.tsx` for SSR

### Client-Side Fetch
```
src/lib/api/client-fetch.ts
```
- Client-side data fetching utility for React Query
- Provides `fetchResourcePageClient()` function
- Uses `window.location.origin` for base URL
- Compatible with React Query for caching and background updates

### Forms Utilities
```
src/lib/forms/
├── get-record-for-edit.ts         # Fetches record for editing
├── config-normalize.ts            # Config normalization
├── schema.ts                      # Schema building utilities
└── types.ts                       # FormConfig types
```

### API Resolution
```
src/lib/api/resolve-resource.ts
```
- Resolves resource aliases
- Maps stock-adjustments → tcm_user_tally_card_entries

---

## 9. Tests

### E2E Tests
```
tests/e2e/stock-adjustments.spec.ts
tests/e2e/forms/stock-adjustments.spec.ts
```
- **Purpose:** End-to-end Playwright tests
- **Coverage:** Full CRUD workflows

### Unit Tests
```
tests/unit/forms/stock-adjustments/
├── page.test.tsx                  # Page component tests
├── view-config.test.tsx           # View config tests
├── toolbar-config.test.tsx        # Toolbar config tests
└── view-config.spec.tsx           # Additional config tests
```

### Integration Tests
```
tests/integration/forms/stock-adjustments/
└── api.test.ts                    # API endpoint tests
```

### Performance Tests
```
tests/performance/forms/stock-adjustments.benchmark.ts
```

### Hook Tests
```
~~src/tests/unit/hooks/use-stock-adjustments-simple.spec.tsx~~  ✅ DELETED
src/tests/unit/forms/stock-adjustments/basic.spec.tsx
src/tests/unit/forms/stock-adjustments/page-simple.spec.tsx
```

---

## 10. Documentation

```
docs/forms/stock-adjustments.md
```
- **Purpose:** Gold Standard Specification
- **Contents:** Overview, screens, API, permissions, testing, architecture

---

## 📊 Data Flow Summary

### List (Read All)
```
URL: /forms/stock-adjustments
  ↓
page.tsx (Server Component)
  ↓ fetches initial data from
API: GET /api/v_tcm_user_tally_card_entries
  ↓ renders
StockAdjustmentsErrorBoundary
  ↓ wraps
StockAdjustmentsClient (Client Component)
  ├── Uses React Query for client-side data fetching
  ├── Manages pagination, filters, column widths
  ├── Handles error states and loading indicators
  └── Renders PageShell with ResourceTableClient
      ↓ renders
      DataTable (TanStack Table)
```

### Create
```
URL: /forms/stock-adjustments/new
  ↓
page.tsx (Server Component)
  ↓ renders
FormShell + FormIsland
  ↓ uses
form.config.ts (Schema + Layout)
  ↓ submits to
API: POST /api/forms/stock-adjustments
  ↓ redirects to
URL: /forms/stock-adjustments
```

### Edit (SCD-2)
```
URL: /forms/stock-adjustments/[id]/edit
  ↓
page.tsx (Server Component)
  ↓ fetches existing record
API: GET /api/stock-adjustments/:id
  ↓ renders
ResourceFormSSRPage → FormShell + FormIsland
  ↓ submits to
API: POST /api/stock-adjustments/:id/actions/patch-scd2
  ↓ SCD-2: Creates new record (history preserved)
  ↓ redirects to
URL: /forms/stock-adjustments
```

### Delete
```
Button click in table
  ↓ triggers
DELETE API: DELETE /api/tcm_user_tally_card_entries/:id
  ↓ refreshes
page.tsx (SSR slice refresh)
```

---

## 🎯 Key Files Summary

| Category | File | Critical? |
|----------|------|-----------|
| **UI** | `page.tsx` | ✅ Yes |
| **UI** | `new/page.tsx` | ✅ Yes |
| **UI** | `[id]/edit/page.tsx` | ✅ Yes |
| **Config** | `view.config.tsx` | ✅ Yes |
| **Config** | `toolbar.config.tsx` | ✅ Yes |
| **Config** | `new/form.config.ts` | ✅ Yes |
| **API** | `[resource]/route.ts` | ✅ Yes |
| **API** | `patch-scd2/route.ts` | ✅ Yes |
| **Component** | `ResourceTableClient` | ✅ Yes |
| **Component** | `FormShell` | ✅ Yes |
| **Component** | `FormIsland` | ✅ Yes |
| ~~**Hook** | `use-stock-adjustments.ts` | ✅ Deleted~~ |
| ~~**Legacy** | `new/form-component.tsx` | ✅ Deleted~~ |
| ~~**Legacy** | `new/components.tsx` | ✅ Deleted~~ |
| ~~**Placeholder** | `toolbar.tsx` | ✅ Deleted~~ |

---

## 🔍 File Locations Summary

```
src/
├── app/
│   ├── (main)/forms/stock-adjustments/
│   │   ├── page.tsx                       # List view
│   │   ├── view.config.tsx                # Table config
│   │   ├── toolbar.config.tsx             # Toolbar config
│   │   ├── new/
│   │   │   ├── page.tsx                   # Create form
│   │   │   └── form.config.ts             # Form config
│   │   └── [id]/edit/
│   │       └── page.tsx                   # Edit form
│   └── api/
│       ├── [resource]/route.ts            # Generic API
│       └── stock-adjustments/[id]/actions/patch-scd2/
│           └── route.ts                   # SCD-2 endpoint
├── components/
│   ├── forms/
│   │   ├── shell/
│   │   │   ├── page-shell.tsx             # List shell
│   │   │   ├── form-shell.tsx             # Form shell
│   │   │   ├── form-island.tsx            # Client form
│   │   │   └── toolbar/
│   │   │       └── types.ts               # Toolbar types
│   │   ├── resource-view/
│   │   │   ├── resource-table-client.tsx  # Generic table
│   │   │   ├── resource-table-generic.tsx # ⚠️ UNUSED
│   │   │   └── resource-ssr-page.tsx      # SSR wrapper
│   │   └── form-view/
│   │       └── resource-form-ssr-page.tsx # Form SSR wrapper
│   └── data-table/
│       ├── data-table.tsx                 # Core table
│       ├── auto-column-widths.ts          # Auto-sizing
│       └── ... (many more)

├── lib/
│   ├── data/
│   │   ├── resource-fetch.ts              # Fetch utility
│   │   └── resources/index.ts             # Resource registry
│   ├── forms/
│   │   ├── get-record-for-edit.ts         # Edit fetcher
│   │   ├── config-normalize.ts            # Config normalizer
│   │   └── schema.ts                      # Schema builder
│   └── api/
│       └── resolve-resource.ts            # Resource resolver
└── tests/
    └── ... (many test files)
```

---

**Total Files:** ~45 files  
**Critical Files:** 15 core files  
**Deleted:** 5 files (unused legacy)  
**Test Files:** 14 test files
