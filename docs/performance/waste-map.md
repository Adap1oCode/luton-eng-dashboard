# Waste Map: Top 10 Performance Issues

This document identifies the top 10 waste items (network, render, CPU) with cost estimates and minimal fixes.

## Top 10 Waste Items

### 1. Duplicate Network Request on Initial Load (Network Waste: HIGH)
- **Location**: `resource-table-client.tsx:361-385`
- **Issue**: React Query refetches data even though SSR already fetched and provided `initialData` with `staleTime: 5min`
- **Cost**: 
  - Extra network request: ~200-500ms latency
  - Server CPU: Duplicate query execution
  - Database load: Duplicate query
- **Fix**: Add guard in `queryFn` to return `initialData` if params match SSR (5 lines)
- **Impact**: Eliminates duplicate fetch on initial page load
- **Risk**: LOW - Only affects initial load, preserves all other behavior

### 2. Duplicate Filter Parsing (CPU Waste: MEDIUM)
- **Location**: 
  - Server: `page.tsx:30` → `parseListParams()`
  - Client: `resource-list-client.tsx:90-94` → `parseListParams()`
- **Issue**: Same URL params parsed twice (server + client)
- **Cost**: 
  - CPU: ~1-2ms per parse (negligible but wasteful)
  - Code duplication: Maintenance burden
- **Fix**: Pass parsed `filters` object from SSR as prop (3 lines)
- **Impact**: Eliminates duplicate parsing, reduces code duplication
- **Risk**: LOW - Simple prop passing

### 3. Duplicate Filter Logic (CPU Waste: MEDIUM)
- **Location**:
  - Server: `page.tsx:33-39` → `toQueryParam()` builds `extraQuery`
  - Client: `resource-list-client.tsx:136-153` → `toQueryParam()` rebuilds `extraQuery`
- **Issue**: Same filter transformation computed twice
- **Cost**:
  - CPU: ~1-2ms per transformation
  - Potential inconsistency: Server and client might diverge
- **Fix**: Pass `extraQuery` from SSR, only rebuild on client-side filter changes (5 lines)
- **Impact**: Eliminates duplicate computation, ensures consistency
- **Risk**: LOW - Only affects initial load, client rebuilds on user changes

### 4. Multiple Pagination Conversion Effects (Render Waste: MEDIUM)
- **Location**: `resource-table-client.tsx:1137-1169`
- **Issue**: Two separate effects handle pagination sync (URL sync + SSR sync), can create feedback loops
- **Cost**:
  - Render: Extra effect runs on every pagination change
  - Potential loops: URL change → SSR props change → pagination update → URL change
- **Fix**: Consolidate into single effect with proper guards (10 lines)
- **Impact**: Reduces render churn, prevents feedback loops
- **Risk**: LOW - Consolidation with guards preserves behavior

### 5. Column Memoization Recalculations (Render Waste: LOW-MEDIUM)
- **Location**: `resource-table-client.tsx:213-220, 782-797, 800-904`
- **Issue**: Column arrays recalculate when config object reference changes (even if values unchanged)
- **Cost**:
  - Render: ~5-15ms per recalculation
  - Cascading: `baseColumns` → `columnsWithHeaders` → `enhancedColumns`
- **Fix**: Already partially fixed (stable config properties extracted), verify dependencies (8 lines)
- **Impact**: Prevents unnecessary column recalculations
- **Risk**: LOW - Only affects memoization, preserves functionality

### 6. React Query Refetch on Mount (Network Waste: MEDIUM)
- **Location**: `resource-table-client.tsx:361-385`
- **Issue**: React Query refetches on mount even with `initialData` and `staleTime: 5min`
- **Cost**:
  - Network: Duplicate request
  - User experience: Potential double loader
- **Fix**: Add `enabled: false` for initial load, enable on URL change (part of fix #1)
- **Impact**: Eliminates unnecessary refetch
- **Risk**: LOW - React Query handles this pattern safely

### 7. Redundant Payload Normalization (CPU Waste: LOW)
- **Location**: `resource-fetch.ts:96-98`
- **Issue**: Normalizes `{rows, total}` vs `{data, count}`, but API always returns `{rows, total}`
- **Cost**:
  - CPU: ~0.1ms per normalization (negligible)
  - Code clarity: Unnecessary defensive code
- **Fix**: Remove redundant normalization (2 lines)
- **Impact**: Minor CPU savings, cleaner code
- **Risk**: LOW - API contract is stable

### 8. Remaining router.refresh() Calls (Render Waste: MEDIUM)
- **Location**: 
  - `src/components/forms/shell/toolbar/actions.ts:68, 99`
  - `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx:452, 464`
- **Issue**: Full page refresh instead of React Query invalidation
- **Cost**:
  - User experience: Full page reload, loses table state
  - Network: Full page request instead of data-only
- **Fix**: Replace with `queryClient.invalidateQueries()` (20 lines)
- **Impact**: Preserves table state, faster updates
- **Risk**: LOW - React Query invalidation is safer

### 9. URL Sync Effect Dependencies (Render Waste: LOW)
- **Location**: `resource-table-client.tsx:1137-1161`
- **Issue**: Effect depends on entire `search` object, triggers on any URL change
- **Cost**:
  - Render: Effect runs even when pagination unchanged
- **Fix**: Narrow dependencies to `pagination.pageIndex` and `pagination.pageSize` only (part of fix #4)
- **Impact**: Reduces unnecessary effect runs
- **Risk**: LOW - More precise dependencies

### 10. Column Header Decoration Recalculation (Render Waste: LOW)
- **Location**: `resource-table-client.tsx:782-797`
- **Issue**: `columnsWithHeaders` recalculates when `columnOrder` changes, but header decoration is independent
- **Cost**:
  - Render: ~2-5ms per recalculation
- **Fix**: Already partially fixed (split memoization), verify it's working correctly
- **Impact**: Prevents unnecessary column remapping
- **Risk**: LOW - Verification only

## Fix Priority Summary

### HIGH Priority (Network Impact)
1. **Skip initial React Query refetch** (5 lines) - Eliminates duplicate network request
2. **Eliminate double loader pattern** (40 lines) - Improves UX

### MEDIUM Priority (Render/CPU Impact)
3. **Consolidate pagination effects** (10 lines) - Reduces render churn
4. **Remove duplicate filter parsing** (3 lines) - Eliminates duplicate CPU work
5. **Remove duplicate filter logic** (5 lines) - Eliminates duplicate CPU work
6. **Replace router.refresh() calls** (20 lines) - Preserves state, faster updates

### LOW Priority (Code Quality)
7. **Stabilize column memoization** (8 lines) - Prevents unnecessary recalculations
8. **Remove redundant normalization** (2 lines) - Cleaner code

## Estimated Impact

### Network Savings
- **Initial load**: Eliminate 1 duplicate request (~200-500ms)
- **Mutations**: Faster updates with React Query invalidation (~100-200ms faster)

### Render Savings
- **Pagination changes**: ~5-10ms per change (consolidated effects)
- **Column changes**: ~5-15ms per change (stabilized memoization)

### CPU Savings
- **Filter parsing**: ~1-2ms per render (eliminate duplicate)
- **Filter logic**: ~1-2ms per render (eliminate duplicate)

### Total Estimated Improvement
- **Initial load**: ~200-500ms faster (eliminate duplicate fetch)
- **Subsequent interactions**: ~10-20ms faster (reduced render churn)
- **Code maintainability**: Improved (less duplication)





