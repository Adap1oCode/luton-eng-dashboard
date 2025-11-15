# Transformation Audit

This document catalogs all data shape transformations, duplicate operations, and transformation types throughout the SSR → API → Client flow.

## Transformation Table

| Location | Role | Transformation | Type | Keep/Inline/Remove | Rationale |
|----------|------|----------------|------|---------------------|-----------|
| `resource-fetch.ts:96-98` | SSR fetch | `payload.rows ?? payload.data` → `rows` | Normalization | **Remove** | API always returns `{rows, total}`, never `{data, count}` |
| `resource-fetch.ts:97-98` | SSR fetch | `payload.total ?? payload.count` → `total` | Normalization | **Remove** | API always returns `total`, never `count` |
| `client-fetch.ts:41-43` | Client fetch | `payload.rows ?? payload.data` → `rows` | Normalization | **Keep** | Handles legacy responses (defensive) |
| `client-fetch.ts:42-43` | Client fetch | `payload.total ?? payload.count` → `total` | Normalization | **Keep** | Handles legacy responses (defensive) |
| `normalize-list-payload.ts:9-11` | Utility | `payload.rows ?? payload.data` → `rows` | Normalization | **Keep** | Shared utility for legacy support |
| `handle-list.ts:157-158` | API handler | `rows.map(toRow)` if `toRow` exists | Mapper | **Keep** | Required for domain → view transformation |
| `resource-table-client.tsx:213-220` | Column building | `config.columns ?? config.buildColumns(true)` | Mapper | **Keep** | Required for SSR-materialized vs dynamic columns |
| `resource-table-client.tsx:417-419` | Row filtering | `currentRows.filter(!isOptimisticallyDeleted)` | Filter | **Keep** | Required for optimistic UI updates |
| `resource-table-client.tsx:423` | Pagination | `page - 1` → `pageIndex` | Pagination | **Keep** | Required: TanStack Table uses 0-based |
| `resource-table-client.tsx:1140` | Pagination | `pageIndex + 1` → URL `page` | Pagination | **Keep** | Required: URL uses 1-based |
| `resource-table-client.tsx:1166` | Pagination | `page - 1` → `pageIndex` | Pagination | **Inline** | Duplicate of line 423, consolidate |
| `resource-table-client.tsx:782-797` | Column headers | `baseColumns.map(decorateHeader)` | Mapper | **Keep** | Required for header decoration |
| `resource-table-client.tsx:800-904` | Column enhancement | `columnsWithHeaders.map(addFilterFn + inlineEdit)` | Mapper | **Keep** | Required for filtering and editing |
| `page.tsx:30` | Filter parsing | `parseListParams()` on server | Parser | **Keep** | Required for SSR |
| `resource-list-client.tsx:90-94` | Filter parsing | `parseListParams()` on client | Parser | **Remove** | Duplicate - pass from SSR |
| `page.tsx:33-39` | Filter logic | `toQueryParam()` on server | Mapper | **Keep** | Required for SSR |
| `resource-list-client.tsx:136-153` | Filter logic | `toQueryParam()` on client | Mapper | **Remove** | Duplicate - pass `extraQuery` from SSR |
| `resource-table-client.tsx:349-359` | Query key | Builds `queryKey` from filters | Serialization | **Keep** | Required for React Query cache |
| `resource-table-client.tsx:364` | Query function | `buildExtraQueryFromFilters()` | Mapper | **Keep** | Required for client-side filter changes |

## Duplicate Transformations

### 1. Pagination Parsing (Server + Client)
- **Server**: `page.tsx:30` → `parseListParams()` extracts `page`, `pageSize`
- **Client**: `resource-list-client.tsx:90-94` → `parseListParams()` extracts same values
- **Cost**: Duplicate parsing on every render
- **Fix**: Pass parsed values from SSR as props

### 2. Filter Parsing (Server + Client)
- **Server**: `page.tsx:30` → `parseListParams()` extracts `filters`
- **Client**: `resource-list-client.tsx:90-94` → `parseListParams()` extracts same filters
- **Cost**: Duplicate parsing on every render
- **Fix**: Pass parsed `filters` object from SSR

### 3. Filter Logic (Server + Client)
- **Server**: `page.tsx:33-39` → `toQueryParam()` builds `extraQuery`
- **Client**: `resource-list-client.tsx:136-153` → `toQueryParam()` rebuilds same `extraQuery`
- **Cost**: Duplicate computation, potential inconsistency
- **Fix**: Pass `extraQuery` from SSR, only rebuild on client-side filter changes

### 4. Pagination Conversion (Multiple Locations)
- **Location 1**: `resource-table-client.tsx:423` → `page - 1` (initial state)
- **Location 2**: `resource-table-client.tsx:1140` → `pageIndex + 1` (URL sync)
- **Location 3**: `resource-table-client.tsx:1166` → `page - 1` (SSR sync)
- **Cost**: Multiple effects, potential feedback loops
- **Fix**: Consolidate into single effect with proper guards

### 5. Column Building (Config Access)
- **Issue**: `config.buildColumns()` called on every config access
- **Location**: `resource-table-client.tsx:213-220` → `config.buildColumns(true)`
- **Cost**: Column array rebuilt unnecessarily
- **Fix**: Already memoized at module level, but function reference changes

## Transformation Types

### Normalization
- **Purpose**: Handle legacy API formats (`{data, count}` vs `{rows, total}`)
- **Locations**: `normalize-list-payload.ts`, `client-fetch.ts`, `resource-fetch.ts`
- **Status**: Some redundant (API always returns `{rows, total}`)

### Mapper
- **Purpose**: Transform data shape (domain → view, add metadata)
- **Locations**: `toRow()`, column building, header decoration
- **Status**: Required transformations

### Pagination
- **Purpose**: Convert between 1-based (URL/Server) and 0-based (Table)
- **Locations**: Multiple effects in `resource-table-client.tsx`
- **Status**: Required but can be consolidated

### Parser
- **Purpose**: Extract values from URL/search params
- **Locations**: `parseListParams()` on server and client
- **Status**: Duplicate parsing can be eliminated

### Filter
- **Purpose**: Remove items from display (optimistic deletes)
- **Locations**: `resource-table-client.tsx:417-419`
- **Status**: Required for optimistic UI

### Serialization
- **Purpose**: Create cache keys, query strings
- **Locations**: React Query `queryKey`, URL search params
- **Status**: Required for caching and navigation

## Recommendations

### High Priority (Remove Duplicates)
1. **Remove duplicate filter parsing** - Pass from SSR (3 lines)
2. **Remove duplicate filter logic** - Pass `extraQuery` from SSR (5 lines)
3. **Consolidate pagination conversions** - Single effect (10 lines)

### Medium Priority (Optimize)
4. **Remove redundant normalization** - API always returns `{rows, total}` (2 lines)
5. **Stabilize column memoization** - Ensure stable references (8 lines)

### Low Priority (Keep as-is)
6. **Keep `toRow()` transformation** - Required for domain → view
7. **Keep optimistic delete filtering** - Required for UI
8. **Keep header decoration** - Required for UI










