# Stock Adjustments SSR Migration - Lessons Learned & Safe Approach

## Executive Summary

We attempted to migrate stock-adjustments from `ResourceListClient` (client-side fetching) pattern to direct `PageShell + ResourceTableClient` SSR pattern (like users/products). The migration failed due to several critical mismatches. This document captures lessons learned and proposes a safe, incremental migration strategy.

---

## What We Learned

### 1. **ResourceTableClient Column Resolution Logic**

**Critical Finding:**
```typescript
// ResourceTableClient checks in this order:
1. config.columns (preferred - SSR materialized array)
2. config.buildColumns(true) (fallback - function call with boolean arg)
3. [] (empty array if neither found)
```

**Our Problem:**
- We tried calling `buildColumns()` manually in `page.tsx`, but `view.config.tsx` had `buildColumns: () => _memoizedColumns` (no boolean param)
- ResourceTableClient expects `buildColumns(true)`, but our function signature didn't match
- Result: Empty columns array → no table headers/rows

**Working Examples:**
- `products.config.tsx`: Uses `buildColumns: () => [...]` with simple inline array
- ResourceTableClient successfully calls `buildColumns(true)` even though signature doesn't match (TypeScript allows this, but runtime may fail)

### 2. **"use client" Directive Conflicts**

**Critical Finding:**
- `view.config.tsx` has `"use client"` at the top
- Server components (`page.tsx`) importing from client files can cause:
  - Undefined exports (`config.viewConfig` was undefined)
  - Serialization issues
  - Runtime errors

**Our Problem:**
- `page.tsx` (server) importing `config` from `view.config.tsx` ("use client")
- `config.viewConfig` was undefined at runtime
- Error: "Cannot read properties of undefined (reading 'buildColumns')"

**Solution Patterns:**
- **Option A:** Remove `"use client"` if config is only data (no JSX in exports)
- **Option B:** Materialize columns in server component before passing to client
- **Option C:** Split config: server-safe exports in separate file

### 3. **Config Structure Differences**

**Current (stock-adjustments):**
```typescript
// view.config.tsx ("use client")
export const stockAdjustmentsViewConfig = {
  buildColumns: () => _memoizedColumns,  // Function reference
  // No columns property
};

export const config = {
  viewConfig: stockAdjustmentsViewConfig,  // Contains function
  // ...
};
```

**Working (products/users):**
```typescript
// products.config.tsx (no "use client")
export const productsViewConfig = {
  buildColumns: () => [ /* inline array */ ],  // Function returns array directly
  // No columns property either, but simpler structure
};

export const config = {
  viewConfig: productsViewConfig,
  // ...
};
```

**Key Difference:**
- Products/users have simpler, server-safe configs (no "use client", no memoized refs)
- Stock-adjustments has complex memoization + client directives

### 4. **Toolbar Rendering Requirements**

**Critical Finding:**
- PageShell requires `toolbarConfig` and `toolbarActions` props
- `chipConfig` must be truthy object (not `undefined`)
- Missing any of these = no toolbar rendered

**Our Problem:**
- `config.chips` was `undefined` (from `stockAdjustmentsChips = undefined`)
- We added fallback `chipConfig={config.chips ?? { filter: true, sorting: true }}` but still had column issues

### 5. **Column Materialization Requirements**

**ResourceTableClient expects:**
1. **Preferred:** `config.columns` as array (materialized on server)
2. **Fallback:** `config.buildColumns(true)` as function

**Successful Pattern (from resource-ssr-page.tsx):**
```typescript
// Materialize on server before passing to client
const clientConfig = {
  ...config,
  columns: config.buildColumns(),  // Call function
};
delete clientConfig.buildColumns;  // Remove function (not serializable)
```

**Why This Works:**
- Server can execute functions
- Client receives plain data (no functions)
- Next.js serialization succeeds

---

## Key Differences: Current vs Target Pattern

| Aspect | Current (ResourceListClient) | Target (Direct SSR) |
|--------|------------------------------|---------------------|
| **Data Flow** | SSR → StockAdjustmentsClient → ResourceListClient → PageShell + ResourceTableClient | SSR → PageShell + ResourceTableClient (direct) |
| **Fetching** | Client-side React Query (ResourceListClient) | Server-side only (page.tsx) |
| **Config Import** | From "use client" file (OK for client components) | From "use client" file (problematic for server) |
| **Column Materialization** | ResourceListClient handles it | Must materialize in page.tsx |
| **Error Boundary** | Local StockAdjustmentsErrorBoundary | Shared or none |
| **Quick Filters** | Local QuickFiltersClient | Via config.quickFilters in ResourceTableClient |

---

## Safe Migration Strategy

### Phase 0: Preparation & Validation

**Goal:** Understand current working state before making changes

1. **Create baseline checklist:**
   ```bash
   # Verify current functionality
   - [ ] Page renders with data
   - [ ] Toolbar shows buttons
   - [ ] Columns display correctly
   - [ ] Quick filters work
   - [ ] Pagination works
   - [ ] Row selection works
   ```

2. **Document current file structure:**
   - List all files in folder
   - Document dependencies
   - Note which files are client vs server

3. **Create feature branch:**
   ```bash
   git checkout -b feat/stock-adjustments-ssr-migration
   ```

### Phase 1: Make Config Server-Safe (Low Risk)

**Goal:** Enable server component imports without breaking current pattern

**Changes:**
1. **Split config files:**
   - Create `view.config.server.tsx` (server-safe exports)
   - Keep `view.config.tsx` for client-specific parts (columns with JSX)

2. **Or remove "use client" if possible:**
   - Check if columns can be built without JSX in exports
   - If JSX only in cell renderers, move to separate file

**Validation:**
- [ ] Current page still works (ResourceListClient pattern)
- [ ] Config exports accessible from server component
- [ ] No runtime errors

**Rollback Plan:**
- Single file revert
- No breaking changes to current pattern

### Phase 2: Materialize Columns at Export Time (Low Risk)

**Goal:** Provide `config.columns` array alongside `buildColumns` function

**Changes:**
```typescript
// view.config.tsx
const _memoizedColumns = buildColumns();

export const stockAdjustmentsViewConfig = {
  // ... other props
  buildColumns: () => _memoizedColumns,  // Keep for backwards compat
  columns: _memoizedColumns,  // NEW: Materialized array
};
```

**Why This Is Safe:**
- Adds property, doesn't remove anything
- ResourceListClient still works (uses buildColumns)
- ResourceTableClient can use columns (preferred path)
- No breaking changes

**Validation:**
- [ ] Current page still works
- [ ] Columns array exists and has length > 0
- [ ] Both buildColumns and columns available

**Rollback Plan:**
- Remove `columns` property
- Keep buildColumns only

### Phase 3: Create Parallel SSR Page (Zero Risk)

**Goal:** Build new pattern alongside old one for comparison

**Changes:**
1. **Create `page.ssr.tsx` (temporary test file):**
   ```typescript
   // Copy page.tsx, modify to use PageShell + ResourceTableClient
   // Keep original page.tsx intact
   ```

2. **Test new pattern:**
   - Verify columns render
   - Verify toolbar renders
   - Verify data displays
   - Compare side-by-side

**Validation:**
- [ ] Both patterns work independently
- [ ] Can switch between them
- [ ] Identical functionality

**Rollback Plan:**
- Delete `page.ssr.tsx`
- Original pattern untouched

### Phase 4: Gradual Feature Parity (Low Risk)

**Goal:** Ensure new pattern matches all features

**Checklist:**
- [ ] Status filter (quick filters)
- [ ] Pagination with URL sync
- [ ] Column visibility
- [ ] Sorting
- [ ] Row selection
- [ ] Bulk delete
- [ ] Export CSV
- [ ] Inline editing (qty column)

**Fix Issues One by One:**
- Test each feature
- Fix before moving to next
- Document any differences

**Rollback Plan:**
- Revert to Phase 3 state
- Keep test file for reference

### Phase 5: Switch Over (Medium Risk)

**Goal:** Replace old pattern with new one

**Changes:**
1. **Backup current files:**
   ```bash
   cp page.tsx page.client.backup.tsx
   cp stock-adjustments-client.tsx stock-adjustments-client.backup.tsx
   ```

2. **Replace page.tsx:**
   - Copy tested SSR version
   - Remove test file suffix

3. **Keep wrapper files temporarily:**
   - Don't delete yet
   - Mark as deprecated
   - Remove after confirming stability

**Validation:**
- [ ] Full feature parity
- [ ] No console errors
- [ ] Performance acceptable
- [ ] All tests pass

**Rollback Plan:**
- Restore from backups
- Re-enable old pattern

### Phase 6: Cleanup (Low Risk, After Stability)

**Goal:** Remove redundant files

**Changes:**
- Delete `stock-adjustments-client.tsx`
- Delete `stock-adjustments-error-boundary.tsx`
- Delete `quick-filters-client.tsx`
- Delete backup files
- Update any imports

**Validation:**
- [ ] No broken imports
- [ ] No orphaned files
- [ ] Codebase clean

---

## Critical Success Factors

### 1. **Column Materialization Must Happen on Server**

**Wrong:**
```typescript
// Client receives function (not serializable)
<ResourceTableClient config={config.viewConfig} />
```

**Right:**
```typescript
// Server materializes, client receives array
const viewConfigForClient = {
  ...config.viewConfig,
  columns: config.viewConfig.buildColumns(),
};
delete (viewConfigForClient as any).buildColumns;
<ResourceTableClient config={viewConfigForClient} />
```

### 2. **Config Must Be Server-Safe**

**Options:**
- Remove `"use client"` if possible
- Split into server-safe and client-only files
- Materialize at import boundary

### 3. **Toolbar Config Must Be Complete**

```typescript
<PageShell
  toolbarConfig={config.toolbar}      // Required
  toolbarActions={config.actions}     // Required
  chipConfig={config.chips ?? {...}}  // Must be truthy
/>
```

### 4. **Test Incrementally**

- Never change multiple things at once
- Test after each change
- Have rollback ready
- Compare before/after behavior

---

## Recommended First Steps

1. **Start with Phase 1:** Make config server-safe
   - Lowest risk
   - Enables future changes
   - Doesn't break current pattern

2. **Then Phase 2:** Add columns property
   - Prepares for SSR pattern
   - ResourceTableClient can use it if available
   - Still backwards compatible

3. **Then Phase 3:** Create test SSR page
   - Zero risk to production
   - Allows experimentation
   - Side-by-side comparison

---

## Red Flags to Watch For

1. **Undefined imports** → Config export/import mismatch
2. **Empty columns array** → Materialization not happening
3. **Missing toolbar** → Config props incomplete
4. **No rows rendering** → Row shape mismatch or serialization issue
5. **Runtime errors on buildColumns** → Function signature mismatch

---

## Conclusion

The migration failed because we tried to do too much at once without understanding:
- How ResourceTableClient resolves columns
- Server/client boundary requirements
- Config serialization constraints

The safe approach is **incremental, tested, and reversible** at each step.

