# Column Resize System Audit

## Current Flow

```
Config (px sizes) 
  ↓
initialColumnWidths (resource-table-client.tsx:292-319)
  - Converts px → %
  - Recalculates whenever baseColumns changes (unstable reference)
  ↓
useColumnResize hook (stores % widths)
  - Uses percentage-based calculations
  - Updates on every mouse move during resize
  ↓
DOM rendering (data-table.tsx)
  - Applies widths as percentages: width: X%
  - No responsive scaling
  ↓
useSavedViews (persistence)
  - Stores columnWidthsPct (percentages)
  - No baseline container width
```

## Anti-Patterns Found

### 1. Percentage-Based Storage
- **Location:** `use-column-resize.ts`, `use-saved-views.ts`
- **Issue:** Widths stored as percentages, which change with container size
- **Impact:** Unstable widths on window resize, no responsive scaling

### 2. Unstable initialColumnWidths Recalculation
- **Location:** `resource-table-client.tsx:292-319`
- **Issue:** Recalculates whenever `baseColumns` changes, which happens on every render due to unstable reference
- **Root Cause:** `baseColumns` is derived from `config.columns` or `config.buildColumns()`, both create new array references
- **Impact:** Performance degradation, unnecessary recalculations

### 3. No Baseline Container Width Tracking
- **Location:** Missing entirely
- **Issue:** Cannot implement responsive scaling without knowing the baseline container width
- **Impact:** No responsive behavior, widths break on different screen sizes

### 4. columnResizeMode: "onChange"
- **Location:** `resource-table-client.tsx:634`
- **Issue:** Updates on every mouse move during resize
- **Impact:** Excessive state updates, potential performance issues

### 5. Unstable viewConfig Reference
- **Location:** `stock-adjustments-table-client.tsx:29-36`
- **Issue:** Creates new `viewConfigWithColumns` object on every render
- **Impact:** Triggers downstream recalculations in ResourceTableClient

### 6. Data-Dependent Auto-Width Calculation (Partially Fixed)
- **Location:** `resource-table-client.tsx:823-838`
- **Status:** Already fixed to use `initialRows` instead of `filteredRows`
- **Note:** Still uses percentage-based calculations

## Performance Risks

### High Priority
1. **initialColumnWidths recalculates on every render**
   - Triggered by unstable `baseColumns` reference
   - Affects: All ResourceTableClient instances
   - Impact: Unnecessary CPU usage, potential UI jank

2. **No memoization of viewConfig**
   - Creates new object reference on each render
   - Triggers React re-renders downstream
   - Impact: Cascading performance degradation

3. **ResizeObserver missing**
   - Cannot implement efficient responsive scaling
   - Impact: Poor UX on different screen sizes

### Medium Priority
1. **Percentage-based width calculations**
   - Requires container width lookups on every render
   - Impact: Minor performance overhead

2. **No throttling/debouncing on resize**
   - Updates on every mouse move
   - Impact: Excessive state updates during resize

## File Responsibilities

### `use-column-resize.ts`
- **Current:** Handles mouse resize events, stores percentage widths
- **Issues:** Uses percentages, updates on every mouse move
- **Dependencies:** `tableRef` for container width calculation

### `resource-table-client.tsx`
- **Current:** 
  - Converts config px → % in `initialColumnWidths`
  - Integrates `useColumnResize` hook
  - Manages column state
- **Issues:** 
  - Unstable `baseColumns` reference causes recalculation
  - Percentage conversion logic
  - No ResizeObserver for responsive scaling

### `use-saved-views.ts`
- **Current:** Stores `columnWidthsPct` (percentages)
- **Issues:** Legacy % format, no baseline width
- **Dependencies:** localStorage for persistence

### `data-table.tsx`
- **Current:** Renders widths as percentages in inline styles
- **Issues:** No `tableLayout: 'fixed'`, percentage-based widths
- **Dependencies:** Receives `columnWidthsPct` prop

### `stock-adjustments-table-client.tsx`
- **Current:** Creates `viewConfigWithColumns` by calling `buildColumns()`
- **Issues:** New object reference on every render
- **Dependencies:** `stockAdjustmentsViewConfig.buildColumns()`

## Proposed Fix Summary

### Core Changes
1. **Convert to pixel-based storage**
   - Store `columnWidthsPx` and `baselineWidthPx` instead of percentages
   - Calculate responsive scaling using: `renderWidth = savedWidth * (containerWidth / baselineWidth)`

2. **Stable initialization**
   - Use column signature to detect actual schema changes
   - Memoize `initialColumnWidths` with stable dependencies
   - Priority: Saved px → Config px → Auto-calc

3. **ResizeObserver integration**
   - Track container width with throttling
   - Store baseline when user manually resizes
   - Apply responsive scaling on window resize

4. **Performance optimizations**
   - Memoize `viewConfig` and `columns` arrays
   - Use `columnResizeMode: "onEnd"` instead of `"onChange"`
   - Debounce ResizeObserver updates

### Migration Strategy
- Keep backward compatibility with legacy `columnWidthsPct` during transition
- Version saved view format (v2) to invalidate old caches
- Provide "Reset widths" action to clear legacy data

## Success Criteria

### Functional
- ✅ Widths persist across reloads
- ✅ Widths stable during inline edits
- ✅ Responsive scaling on window resize
- ✅ Manual resize persists correctly

### Performance
- ✅ `initialColumnWidths` only recalculates on schema changes
- ✅ Stable references for `viewConfig` and `columns`
- ✅ Throttled ResizeObserver updates
- ✅ No reflows on data changes

### Code Quality
- ✅ No percentage widths in new code
- ✅ Generic, config-driven implementation
- ✅ Uses TanStack native `columnSizing` model
