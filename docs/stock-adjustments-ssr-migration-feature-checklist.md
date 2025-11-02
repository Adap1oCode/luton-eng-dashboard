# Stock Adjustments SSR Migration - Feature Parity Checklist

## Phase 4: Feature Verification

### Core Features ✅ (Verified Working)
- [x] **Page renders** - Both routes display correctly
- [x] **Toolbar visible** - All buttons appear (New, Delete, Export)
- [x] **Columns display** - All column headers visible
- [x] **Data renders** - Rows populate correctly
- [x] **Pagination** - Page controls functional

### Advanced Features (Verify in SSR Test Route)

#### Status Filter (Quick Filter)
- [ ] **Filter appears** - Status dropdown visible (if implemented)
- [ ] **Filter works** - Changing status updates URL and filters data
- [ ] **URL sync** - Filter state reflected in URL params
- [ ] **Persistence** - Filter survives page refresh

**Note:** Quick filters in ResourceTableClient pattern:
- Config has `quickFilters` array in viewConfig
- Status filter logic handled server-side via `parseListParams` + `statusToQuery`
- UI component may need to be added to PageShell's `quickFiltersSlot` if needed

#### Column Management
- [ ] **Visibility toggle** - Columns menu shows/hides columns
- [ ] **Column resizing** - Drag column borders to resize
- [ ] **Column reordering** - Drag columns to reorder
- [ ] **Save view** - Save current column layout (if enabled)

#### Sorting
- [ ] **Column sorting** - Click headers to sort
- [ ] **Sort indicators** - Arrows show sort direction
- [ ] **Multi-column sort** - Can sort by multiple columns
- [ ] **Clear sorting** - Can reset sort state

#### Row Selection
- [ ] **Select rows** - Checkboxes work
- [ ] **Select all** - Header checkbox selects page
- [ ] **Bulk delete** - Delete button enabled when rows selected
- [ ] **Selection count** - Footer shows selected count

#### Inline Editing
- [ ] **Qty editing** - Can edit quantity inline (if configured)
- [ ] **Save changes** - Edits persist to server
- [ ] **Validation** - Invalid values rejected

#### Export & Actions
- [ ] **Export CSV** - Export button downloads CSV
- [ ] **New button** - Links to create form
- [ ] **Delete action** - Bulk delete works
- [ ] **Row actions** - Actions menu (⋯) on each row

#### Pagination & URL
- [ ] **Page navigation** - Previous/next/page numbers work
- [ ] **Page size** - Can change rows per page
- [ ] **URL sync** - Page/pageSize in URL
- [ ] **Direct URL** - Navigating to URL with params loads correct page

### Performance Checks
- [ ] **Initial load** - SSR data appears immediately (no loading spinner)
- [ ] **No client refetch** - First render doesn't trigger React Query
- [ ] **Fast navigation** - Page changes feel instant
- [ ] **Browser console** - No errors or warnings

---

## Differences Between Patterns

| Feature | ResourceListClient Pattern | SSR Pattern |
|---------|---------------------------|-------------|
| **Data Fetching** | Client-side React Query | Server-side only |
| **Quick Filters UI** | Built into ResourceListClient | Needs `quickFiltersSlot` in PageShell |
| **Error Boundary** | Local StockAdjustmentsErrorBoundary | Shared or none |
| **Loading States** | FullScreenLoader + BackgroundLoader | SSR only (no loading) |
| **Column Materialization** | Via buildColumns() | Via config.columns |

---

## Quick Filter Implementation Options

If quick filters don't appear in SSR route:

### Option A: Add QuickFiltersSlot to PageShell
```typescript
<PageShell
  // ... other props
  quickFiltersSlot={<QuickFiltersClient />}
>
```

### Option B: ResourceTableClient handles it internally
Check if ResourceTableClient renders quick filters from `config.quickFilters` automatically.

### Option C: Server-side only (current)
Status filter works via URL params, but no UI. User changes URL directly or uses browser back/forward.

---

## Next Steps

If all features verified:
1. ✅ Proceed to Phase 5: Switch production route to SSR pattern
2. ✅ Phase 6: Cleanup redundant files

If features missing:
1. Fix incrementally (one feature at a time)
2. Re-test after each fix
3. Document any differences or trade-offs

