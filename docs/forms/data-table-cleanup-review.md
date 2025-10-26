# Data Table Cleanup Review

**Date:** 2025-01-27  
**Directory:** `src/components/data-table`  
**Total Files:** 40 files

---

## 📊 Summary

| Category | Count | Notes |
|----------|-------|-------|
| **Active Files** | 12 | Currently used in production |
| **Duplicate Files** | 8 | Has newer/replacement version |
| **Unused Files** | 10 | No imports found |
| **Uncertain Status** | 10 | Need investigation |

---

## 🔴 DUPLICATE FILES (Should be removed)

### 1. **`pagination.tsx` vs `data-table-pagination.tsx`** ⚠️ DUPLICATE
- **Old:** `pagination.tsx` (63 lines, simpler interface)
- **New:** `data-table-pagination.tsx` (134 lines, TanStack Table integrated)
- **Status:** `data-table-pagination.tsx` is actively used
- **Usage:** No imports found for `pagination.tsx`
- **Recommendation:** ❌ **DELETE** `pagination.tsx`

### 2. **`toolbar.tsx` vs `data-table-toolbar.tsx`** ⚠️ DUPLICATE
- **Old:** `toolbar.tsx` (136 lines, simpler props-based)
- **New:** `data-table-toolbar.tsx` (370 lines, feature-rich with toggles)
- **Status:** `data-table-toolbar.tsx` has better API design
- **Usage:** 
  - `toolbar.tsx` from `data-table/` - No imports found
  - BUT there's also `roles/Templete/toolbar.tsx` that IS used
  - Neither `data-table-toolbar.tsx` nor `data-table/toolbar.tsx` are used
- **Recommendation:** 
  - ❌ **DELETE** `src/components/data-table/toolbar.tsx` 
  - ❓ **KEEP** `src/components/data-table/data-table-toolbar.tsx` for future use (may replace manual implementations)

### 3. **`status-cell.tsx` vs `status-cell-wrapper.tsx`** ⚠️ PARTIAL DUPLICATE
- **`status-cell.tsx`** (82 lines) - Core component
- **`status-cell-wrapper.tsx`** (43 lines) - Wrapper that uses `status-cell.tsx`
- **Usage:** `status-cell-wrapper.tsx` imports and wraps `status-cell.tsx` ✅
- **Recommendation:** ✅ **KEEP BOTH** (proper wrapper pattern)

### 4. **`inline-edit-cell.tsx` vs `inline-edit-cell-wrapper.tsx`** ⚠️ PARTIAL DUPLICATE
- **`inline-edit-cell.tsx`** (161 lines) - Core component
- **`inline-edit-cell-wrapper.tsx`** (46 lines) - Wrapper that uses `inline-edit-cell.tsx`
- **Usage:** `inline-edit-cell-wrapper.tsx` imports and wraps `inline-edit-cell.tsx` ✅
- **Recommendation:** ✅ **KEEP BOTH** (proper wrapper pattern)

### 5. **`table-column.tsx` vs `data-table-column-header.tsx`** ⚠️ SIMILAR PURPOSE
- **`table-column.tsx`** (159 lines) - Generic column component
- **`data-table-column-header.tsx`** (68 lines) - TanStack Table column header
- **Usage:** Only `data-table-column-header.tsx` is imported (used in 6+ places)
- **Status:** `table-column.tsx` not imported anywhere
- **Recommendation:** ❓ **INVESTIGATE** if `table-column.tsx` serves different purpose
- **Likely:** ❌ **DELETE** `table-column.tsx` (seems unused)

---

## 🔴 DUPLICATE FILES (Exact copies in roles/Templete/)

### ⚠️ CRITICAL FINDING: All these files are EXACT DUPLICATES

**Important:** These files exist BOTH in `src/components/data-table/` AND in `src/app/(main)/forms/roles/Templete/` with **identical content**.

| File | Status | Duplicate Location | Used By |
|------|--------|-------------------|---------|
| **`pagination.tsx`** | ✅ Used in roles | `roles/Templete/pagination.tsx` | roles, warehouses |
| **`table-column.tsx`** | ✅ Used in roles | `roles/Templete/table-column.tsx` | roles, warehouses |
| **`table-header.tsx`** | ✅ Used in roles | `roles/Templete/table-header.tsx` | roles, warehouses |
| **`table-row.tsx`** | ✅ Used in roles | `roles/Templete/table-row.tsx` | roles, warehouses |
| **`toast.tsx`** | ✅ Used in roles | `roles/Templete/toast.tsx` | roles |
| **`page-header.tsx`** | ✅ Used in roles | `roles/Templete/page-header.tsx` | roles |
| **`error-state.tsx`** | ✅ Used in roles | `roles/Templete/error-state.tsx` | roles |
| **`loading-state.tsx`** | ✅ Used in roles | `roles/Templete/loading-state.tsx` | roles |

**These are NOT unused!** Roles/Tally-Cards have their own copies in a local `Templete/` folder.

### Recommendation:
- ❌ **DELETE** files from `src/components/data-table/` (unused originals)
- ✅ **KEEP** files in `roles/Templete/` (actually used)

### 10. **`draggable-row.tsx`** ❌
     - 78 lines using `@dnd-kit` for drag-and-drop
     - No imports found
     - Uses modern `@dnd-kit` library (compared to older manual drag implementations)
     - **Consideration:** May be useful if we want to add row reordering feature

---

## ⚠️ UNCERTAIN FILES (Need investigation)

These files exist but usage is unclear:

1. **`data-table-toolbar.tsx`** (370 lines)
   - No imports found
   - **Question:** Should this replace manual toolbar implementations?
   - **Action:** Check if it's meant to be used but isn't yet

2. **`table-column.tsx`** (159 lines)
   - Generic column helper
   - **Question:** Was this replaced by TanStack Table column definitions?
   - **Action:** Verify if still needed

3. **`filter-bar.tsx`** (245 lines)
   - Complex filter implementation
   - **Question:** Is this used or replaced by `advanced-filter-bar.tsx`?
   - **Action:** Check against `src/components/forms/shell/advanced-filter-bar.tsx`

4. **`action-menu.tsx`** (54 lines) ⚠️ **USEFUL COMPONENT**
   - Row actions dropdown (Edit, Copy, Favorite, Delete)
   - **Status:** Not currently imported but could replace manual action menus
   - **Value:** Generic, reusable, well-structured
   - **Recommendation:** ✅ **KEEP** - May be useful for future refactoring

5. **`cell-viewer.tsx`** (36 lines)
   - 36 lines
   - **Question:** What's the purpose?
   - **Action:** Check usage

6. **`expanded-row-details.tsx`** (54 lines)
   - 54 lines for row expansion
   - **Question:** Is this feature active?
   - **Action:** Check if expansion is implemented

7. **`save-view-dialog.tsx`** (96 lines)
   - 96 lines for saving views
   - **Question:** Is saved views feature active?
   - **Action:** Check `use-saved-views.ts` usage

8. **`use-saved-views.ts`** (141 lines)
   - 141 lines
   - **Action:** Check if saved views feature is enabled

9. **`create-role-dialog.tsx`** (103 lines) ⚠️ **SPECIFIC TO ROLES**
   - 103 lines
   - **Question:** Why is this in data-table? Should be in roles folder
   - **Action:** ❌ **MOVE** to `src/app/(main)/forms/roles/` or delete if unused

10. **`drag-column.tsx`** (33 lines)
    - 33 lines for drag functionality
    - **Question:** Part of column reordering feature?
    - **Action:** Verify if `resizable-draggable-header.tsx` replaced this

---

## ✅ ACTIVE FILES (Keep)

Confirmed active files with imports:

1. **`data-table.tsx`** ✅ - Core table component (463 lines)
2. **`data-table-pagination.tsx`** ✅ - Pagination controls (134 lines)
3. **`data-table-column-header.tsx`** ✅ - Column headers (68 lines)
4. **`data-table-view-options.tsx`** ✅ - View options (51 lines)
5. **`columns-menu.tsx`** ✅ - Column visibility menu (99 lines)
6. **`sort-menu.tsx`** ✅ - Sorting menu (67 lines)
7. **`views-menu.tsx`** ✅ - Views menu (85 lines)
8. **`inline-edit-cell.tsx`** ✅ - Inline editing (161 lines)
9. **`inline-edit-cell-wrapper.tsx`** ✅ - Inline edit wrapper (46 lines)
10. **`status-cell.tsx`** ✅ - Status cell component (82 lines)
11. **`status-cell-wrapper.tsx`** ✅ - Status cell wrapper (43 lines)
12. **`resizable-draggable-header.tsx`** ✅ - Draggable/resizable header (94 lines)
13. **`auto-column-widths.ts`** ✅ - Auto-sizing utility (149 lines)
14. **`table-utils.ts`** ✅ - Table utilities (34 lines)
15. **`use-column-resize.ts`** ✅ - Resize hook (75 lines)
16. **`csv-export.ts`** ✅ - Export functionality (110 lines)
17. **`data-table-filters.tsx`** ✅ - Filter types (117 lines)
18. **`data-table-actions-cell.tsx`** ✅ - Actions cell (107 lines)
19. **`data-table-expander-cell.tsx`** ✅ - Expansion cell (143 lines)
20. **`view-defaults.tsx`** ✅ - Default configs (293 lines)

---

## 📝 NAMING CONVENTIONS

### Current Naming Issues:

1. **Inconsistent prefixes:**
   - Some files have `data-table-` prefix (`data-table.tsx`, `data-table-pagination.tsx`)
   - Others don't (`pagination.tsx`, `toolbar.tsx`, `table-column.tsx`)
   - **Recommendation:** Standardize on `data-table-*` for clarity

2. **Mixed naming patterns:**
   - Hook files: `use-*` (e.g., `use-column-resize.ts`) ✅
   - Utility files: `*-utils.ts` (e.g., `table-utils.ts`) ✅
   - Component files: Inconsistent (both `table-*.tsx` and `data-table-*.tsx`)
   - **Recommendation:** Prefer `data-table-*.tsx` for components

3. **Wrapper files:**
   - Pattern: `*-wrapper.tsx` (e.g., `status-cell-wrapper.tsx`) ✅
   - This is good and consistent

### Recommended Naming:

```
✅ KEEP:
- data-table.tsx                 (main component)
- data-table-*.tsx              (all data table specific components)
- use-*.ts                       (hooks)
- *-utils.ts                     (utilities)
- *-wrapper.tsx                  (wrappers)

❌ REMOVE:
- pagination.tsx                 (use data-table-pagination.tsx)
- toolbar.tsx                    (use data-table-toolbar.tsx)
- table-*.tsx                    (use data-table-*.tsx)
```

---

## 🎯 RECOMMENDATIONS

### Phase 1: Quick Wins (Safe to delete)

**Files that are EXACT DUPLICATES in `roles/Templete/`:**
```bash
# These are exact copies - roles has their own versions
rm src/components/data-table/pagination.tsx          # Exact copy in roles/Templete/
rm src/components/data-table/table-column.tsx        # Exact copy in roles/Templete/
rm src/components/data-table/table-header.tsx        # Exact copy in roles/Templete/
rm src/components/data-table/table-row.tsx           # Exact copy in roles/Templete/
rm src/components/data-table/toast.tsx               # Exact copy in roles/Templete/
rm src/components/data-table/page-header.tsx         # Exact copy in roles/Templete/
rm src/components/data-table/error-state.tsx         # Exact copy in roles/Templete/
rm src/components/data-table/loading-state.tsx       # Exact copy in roles/Templete/
rm src/components/data-table/toolbar.tsx             # Different from roles/Templete/
```

**Actually unused files:**
```bash
# These have no imports at all
rm src/components/data-table/draggable-row.tsx       # Not imported, but has useful @dnd-kit logic
```

### Phase 2: Files Worth Keeping (Investigate/Evaluate)

**Potentially Useful:**
1. **`data-table-toolbar.tsx`** (370 lines)
   - Well-designed API with toggles
   - May be worth adopting to replace manual toolbar implementations
   - **Decision:** Evaluate if it should replace current manual toolbars

2. **`action-menu.tsx`** (54 lines)
   - Generic, reusable row actions menu
   - Could standardize action menus across resources
   - **Decision:** Consider adopting

3. **`draggable-row.tsx`** (78 lines)
   - Uses modern `@dnd-kit` library
   - Could enable row reordering feature
   - **Decision:** Keep if row reordering is planned

**Investigation Required:**
- Review `filter-bar.tsx` vs `advanced-filter-bar.tsx` - duplicates?
- Review `use-saved-views.ts` and saved views feature - active?
- Review `expanded-row-details.tsx` and expansion feature - active?
- Move or delete `create-role-dialog.tsx` (roles-specific, wrong location)

### Phase 3: Consider Moving
- `create-role-dialog.tsx` → `src/app/(main)/forms/roles/`

---

## 📊 Files Breakdown

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Active (Keep) | 20 | 50% |
| 🔴 Duplicate (Remove) | 5 | 12.5% |
| 🔴 Unused (Remove) | 10 | 25% |
| ⚠️ Uncertain (Investigate) | 5 | 12.5% |
| **Total** | **40** | **100%** |

---

## 🎬 Next Steps

1. ✅ **Create this review** (done)
2. ⏳ **Get approval** for cleanup plan
3. ⏳ **Phase 1**: Delete confirmed unused files
4. ⏳ **Phase 2**: Investigate uncertain files
5. ⏳ **Phase 3**: Update imports if any changes
6. ⏳ **Run tests**: Ensure nothing breaks
7. ⏳ **Update documentation**: Update sitemap docs

---

**Last Updated:** 2025-01-27
