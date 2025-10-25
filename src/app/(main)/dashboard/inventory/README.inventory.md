# Inventory Dashboard — Gold-Standard API-First Review

## Core Philosophy

**Goal**: APIs → Charts → Click → Data Table

- **Correctness**: Supabase is the source of truth (views/tables)
- **Exposure**: Clean API endpoints expose data
- **Visualization**: Charts display aggregated/grouped data
- **Drill-down**: Every chart is clickable → shows underlying rows in table
- **Simplicity**: Simple filters (warehouse, person, UOM) apply globally
- **Efficiency**: Fetch data once, no duplication, no complex client-side SQL

## Current Architecture Analysis

### Files Documented

**Primary Implementation** (ignore `simple-*` files):
- `inventory/page.tsx` - SSR entry point
- `inventory/config.tsx` - Dashboard configuration  
- `inventory/_components/data.ts` - Data fetching layer

### Current Data Flow

```
page.tsx (SSR)
  ↓ getInventorySummary() - fetches ALL inventory, calculates in JS
  ↓ injects values into config.summary
  ↓ GenericDashboardPage renders
    ↓ config.fetchMetrics() called by client
    ↓ config.fetchRecords() called by client
```

### Problems Identified

1. ❌ Fetches entire inventory table to calculate 9 summary metrics in JavaScript
2. ❌ No API layer - direct Supabase calls from server components
3. ❌ fetchMetrics merges warehouse + UOM data but no clear contract
4. ❌ Charts defined but unclear if they're clickable → table
5. ❌ Filters defined but unclear how they apply to charts/table
6. ❌ No visible table rendering despite tableColumns config
7. ❌ Data fetched multiple times (summary, metrics, rows)

## Config Variable Map (Current State)

### Top-Level Properties

| Property | Value | Type | Description |
|----------|-------|------|-------------|
| `id` | "inventory" | string | Dashboard identifier |
| `tableName` | "inventory" | string | Supabase table name |
| `title` | "Inventory Dashboard" | string | Display title |
| `rowIdKey` | "item_number" | string | Unique row identifier |
| `dateSearchEnabled` | false | boolean | Date range filtering disabled |
| `range` | undefined | string | Default date range (not set) |

### Functions (Current Implementation)

| Function | Signature | Returns | Issues |
|----------|-----------|---------|---------|
| `fetchRecords` | `(range, from, to, filter, distinct)` | `InventoryRow[]` | ❌ Should return `{ rows, total }` |
| `fetchMetrics` | `()` | Merged warehouse + UOM metrics | ❌ Unclear contract |

### Filters Configuration

| Key | Column Mapping | Description |
|-----|----------------|-------------|
| `warehouse` | "warehouse" | Filter by warehouse location |
| `status` | "status" | Filter by item status |
| `creator` | "created_by" | Filter by creator |
| `uom` | "uom" | Filter by unit of measure |

### Summary Tiles (9 tiles)

| Key | Title | Clickable | Filter/Calculation | Current Implementation |
|-----|-------|-----------|-------------------|----------------------|
| totalInventoryRecords | Total Inventory Records | ✅ | isNotNull | ✅ Pre-calculated |
| uniqueItems | Unique Item Numbers | ✅ | distinct count | ✅ Pre-calculated |
| totalAvailableStock | Total Available (Qty) | ❌ | SUM(total_available) | ✅ Pre-calculated |
| totalOnOrderQuantity | Total On Order (Qty) | ❌ | SUM(on_order) | ✅ Pre-calculated |
| totalCommittedQuantity | Total Committed (Qty) | ❌ | SUM(committed) | ✅ Pre-calculated |
| outOfStockCount | Out-of-Stock Items | ✅ | total_available = 0 | ✅ Pre-calculated |
| totalOnOrderValue | Total On Order Value (£) | ❌ | SUM(on_order * cost) | ✅ Pre-calculated |
| totalInventoryValue | Total Available Value (£) | ❌ | SUM(available * cost) | ✅ Pre-calculated |
| totalCommittedValue | Total Committed Value (£) | ❌ | SUM(committed * cost) | ✅ Pre-calculated |

### Widgets (8 chart widgets)

| Key | Component | Title | Clickable | Data Source | Current Status |
|-----|-----------|-------|-----------|-------------|----------------|
| tiles | SummaryCards | (summary) | Varies | SSR injection | ✅ Implemented |
| missing_cost | ChartBarHorizontal | Items Missing Cost by Warehouse | ✅ | fetchMetrics() | ⚠️ fetchMetrics called |
| items_by_uom | ChartBarHorizontal | Items by Unit of Measure | ✅ | fetchMetrics() | ⚠️ fetchMetrics called |
| available_stock | ChartBarHorizontal | Available Stock by Warehouse | ❌ | fetchMetrics() | ⚠️ fetchMetrics called |
| available_stock_value | ChartBarHorizontal | Value of Available Stock | ❌ | fetchMetrics() | ⚠️ fetchMetrics called |
| total_on_order_quantity | ChartBarHorizontal | Total On Order | ❌ | fetchMetrics() | ⚠️ fetchMetrics called |
| total_on_order_value_value | ChartBarHorizontal | Value of On-Order Stock | ❌ | fetchMetrics() | ⚠️ fetchMetrics called |
| total_committed_quantity | ChartBarHorizontal | Total Committed | ❌ | fetchMetrics() | ⚠️ fetchMetrics called |
| total_committed_value | ChartBarHorizontal | Value of Committed Stock | ❌ | fetchMetrics() | ⚠️ fetchMetrics called |

### Table Columns (8 columns)

- item_number, description, total_available, item_cost, category, unit_of_measure, location, warehouse

## Data Flow Documentation

### Current Flow (Problems Highlighted)

```
1. User visits /dashboard/inventory
   ↓
2. page.tsx SSR executes
   ↓ calls getInventorySummary()
   ↓   → fetches ALL rows from inventory table ❌
   ↓   → calculates 9 metrics in JavaScript ❌
   ↓   → returns InventorySummary object
   ↓
3. page.tsx injects values into baseConfig.summary ❌ config mutation
   ↓
4. GenericDashboardPage renders (client component?)
   ↓
5. GenericDashboardPage calls config.fetchMetrics() ❌ duplicate fetch
   ↓ calls getWarehouseInventoryMetrics()
   ↓   → fetches ALL rows from inventory table AGAIN ❌
   ↓   → aggregates by warehouse in JavaScript
   ↓ calls getUomMetrics()
   ↓   → fetches ALL rows from inventory table AGAIN ❌
   ↓   → aggregates by UOM in JavaScript
   ↓
6. Charts render with merged metrics
   ↓
7. GenericDashboardPage calls config.fetchRecords()?
   ↓ calls getInventoryRows()
   ↓ fetches paginated rows (finally paginated!)
   ↓ returns InventoryRow[] ❌ missing total
   ↓
8. Table renders (if it exists?)
```

### Ideal Flow (What It Should Be)

```
1. User visits /dashboard/inventory?warehouse=BP1
   ↓
2. page.tsx SSR executes
   ↓ parseFilters({ warehouse: "BP1" })
   ↓
3. Parallel API calls (with filters):
   ↓ GET /api/inventory/summary?warehouse=BP1
   ↓ GET /api/inventory?page=1&pageSize=50&warehouse=BP1
   ↓ (Charts fetch their own data on client)
   ↓
4. Page renders with SSR data:
   ↓ SummaryCards (from summary API)
   ↓ ChartGrid (each chart fetches from its API)
   ↓ DataTable (from inventory API with { rows, total })
   ↓
5. User clicks on chart bar "BP1":
   ↓ Updates URL: ?warehouse=BP1&view=table
   ↓ Scrolls to table
   ↓ Table already filtered to BP1
   ↓
6. User changes filter dropdown to "BP2":
   ↓ Router.push(?warehouse=BP2)
   ↓ Page re-renders with new filter
   ↓ All APIs called with warehouse=BP2
   ↓ Everything updates consistently
```

## Gap Analysis vs Ideal Pattern

### Gap 1: No API Layer ❌ CRITICAL

- **Current**: Direct Supabase calls from server components/config
- **Ideal**: `/api/inventory`, `/api/inventory/summary`, `/api/inventory/by-warehouse`, etc.
- **Impact**: Can't cache, can't version, can't test independently
- **Fix**: Create API routes for each data endpoint

### Gap 2: Multiple Full-Table Fetches ❌ CRITICAL

- **Current**: Fetches entire inventory table 3+ times per page load
- **Ideal**: Supabase views with pre-aggregated data, single API call per widget
- **Impact**: Slow page loads, high DB load, won't scale
- **Fix**: Create materialized views for aggregations, use COUNT queries

### Gap 3: JavaScript Aggregation ❌ CRITICAL

- **Current**: Fetches all rows, calculates SUM/COUNT in Node.js
- **Ideal**: Database does aggregation (it's designed for this)
- **Impact**: Memory intensive, slow, error-prone
- **Fix**: Use Supabase views or GROUP BY queries in API

### Gap 4: Non-Standard Response Shape ❌ HIGH

- **Current**: `getInventoryRows` returns `InventoryRow[]`
- **Ideal**: `{ rows: InventoryRow[], total: number }`
- **Impact**: Pagination broken, can't show "Page 1 of 10"
- **Fix**: Update all fetchers to return `{ rows, total }`

### Gap 5: Config Mutation ⚠️ MEDIUM

- **Current**: `page.tsx` mutates `baseConfig.summary` by injecting values
- **Ideal**: Config is pure, data passed as props
- **Impact**: Config not reusable, hard to test
- **Fix**: Keep config static, pass summary data to component

### Gap 6: Unclear Chart Click Behavior ⚠️ MEDIUM

- **Current**: `clickable: true` on many widgets, but behavior unclear
- **Ideal**: Click → scroll to table with filter applied
- **Impact**: Charts are static, no drill-down
- **Fix**: Implement `onChartClick` handler that updates filter state

### Gap 7: Missing Filter UI/Logic ⚠️ MEDIUM

- **Current**: `filters` config defined but not visible in code
- **Ideal**: Filter dropdowns at top, update URL on change
- **Impact**: Can't filter by warehouse interactively
- **Fix**: Add filter UI component that updates searchParams

### Gap 8: No Visible Table ❓ MEDIUM

- **Current**: `tableColumns` defined but no table render visible
- **Ideal**: Table below charts, shows filtered data
- **Impact**: Can't see underlying rows
- **Fix**: Verify GenericDashboardPage renders table, or add explicit table

### Gap 9: Duplicate Data Definitions ⚠️ LOW

- **Current**: Same aggregations defined multiple places
- **Ideal**: Single source of truth (Supabase view)
- **Impact**: Risk of inconsistency
- **Fix**: Create views, reference them consistently

## Recommended Improvements

### Phase 1: API Layer (Week 1)

#### Create API Routes

**1. `/api/inventory/route.ts`:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '50')
  const warehouse = searchParams.get('warehouse')
  const created_by = searchParams.get('created_by')
  const uom = searchParams.get('uom')
  
  const supabase = await supabaseServer()
  let query = supabase
    .from('inventory')
    .select('*', { count: 'exact' })
  
  if (warehouse) query = query.eq('warehouse', warehouse)
  if (created_by) query = query.eq('created_by', created_by)
  if (uom) query = query.eq('uom', uom)
  
  query = query.range((page - 1) * pageSize, page * pageSize - 1)
  
  const { data, count, error } = await query
  
  if (error) return NextResponse.json({ error }, { status: 500 })
  
  return NextResponse.json({ 
    rows: data ?? [], 
    total: count ?? 0 
  })
}
```

**2. `/api/inventory/summary/route.ts`:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filters = parseFilters(searchParams)
  
  // Use Supabase aggregate functions, not JS
  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .rpc('get_inventory_summary', { filters })
    // Or use a materialized view
  
  return NextResponse.json(data ?? {})
}
```

**3. `/api/inventory/by-warehouse/route.ts`:**
```typescript
export async function GET(request: Request) {
  const supabase = await supabaseServer()
  
  // Use GROUP BY in database
  const { data, error } = await supabase
    .from('v_inventory_by_warehouse') // materialized view
    .select('*')
  
  return NextResponse.json({ 
    rows: data ?? [], 
    total: data?.length ?? 0 
  })
}
```

#### Create Supabase Views (Do This First)

```sql
-- Inventory summary (refreshed on demand or scheduled)
CREATE MATERIALIZED VIEW v_inventory_summary AS
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT item_number) as unique_items,
  SUM(total_available) as total_available,
  SUM(on_order) as total_on_order,
  SUM(committed) as total_committed,
  COUNT(*) FILTER (WHERE total_available = 0) as out_of_stock,
  SUM(on_order * item_cost::numeric) as total_on_order_value,
  SUM(total_available * item_cost::numeric) as total_inventory_value,
  SUM(committed * item_cost::numeric) as total_committed_value
FROM inventory;

-- By warehouse (refreshed on demand)
CREATE MATERIALIZED VIEW v_inventory_by_warehouse AS
SELECT 
  warehouse,
  COUNT(*) as count,
  SUM(total_available) as total_available,
  SUM(total_available * item_cost::numeric) as total_value,
  COUNT(*) FILTER (WHERE item_cost IS NULL OR item_cost = '0') as missing_cost
FROM inventory
GROUP BY warehouse;

-- By UOM
CREATE MATERIALIZED VIEW v_inventory_by_uom AS
SELECT 
  uom,
  COUNT(*) as count
FROM inventory
GROUP BY uom;

-- Refresh function (call after inventory updates)
CREATE OR REPLACE FUNCTION refresh_inventory_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_inventory_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_inventory_by_warehouse;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_inventory_by_uom;
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: Refactor Page (Week 2)

#### 1. Update Data Fetchers

```typescript
// _components/data.ts
export async function getInventorySummary(filters: Filters = {}) {
  const params = new URLSearchParams(filters as any)
  const res = await fetch(`/api/inventory/summary?${params}`)
  return res.json() // { total_records, unique_items, ... }
}

export async function getInventoryPage(options: PaginationOptions) {
  const params = new URLSearchParams({
    page: options.page.toString(),
    pageSize: options.pageSize.toString(),
    ...options.filters
  })
  const res = await fetch(`/api/inventory?${params}`)
  return res.json() // { rows, total }
}
```

#### 2. Simplify Page Component

```typescript
// page.tsx
export default async function InventoryPage({ searchParams }) {
  const filters = await parseFilters(searchParams)
  const { page, pageSize } = parsePagination(searchParams)
  
  const [summary, inventoryData] = await Promise.all([
    getInventorySummary(filters),
    getInventoryPage({ page, pageSize, filters })
  ])
  
  return (
    <PageShell title="Inventory" count={inventoryData.total}>
      <FilterBar config={inventoryConfig.filters} current={filters} />
      <SummaryCards config={inventoryConfig.summary} data={summary} />
      <ChartGrid 
        config={inventoryConfig.charts} 
        filters={filters}
        onChartClick={handleChartClick}
      />
      <DataTable 
        config={inventoryConfig.table}
        data={inventoryData.rows}
        total={inventoryData.total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  )
}
```

#### 3. Pure Config (No Functions, No Mutations)

```typescript
// config.tsx
export const inventoryConfig = {
  id: "inventory",
  title: "Inventory Dashboard",
  
  filters: [
    { key: "warehouse", label: "Warehouse", type: "select" },
    { key: "created_by", label: "Creator", type: "select" },
    { key: "uom", label: "Unit", type: "select" }
  ],
  
  summary: [
    { key: "total_records", title: "Total Records", format: "number", clickable: true },
    { key: "unique_items", title: "Unique Items", format: "number", clickable: true },
    // ... (no sql, no filter - that's in the API)
  ],
  
  charts: [
    {
      key: "by_warehouse",
      title: "By Warehouse",
      api: "/api/inventory/by-warehouse",
      type: "bar",
      xKey: "warehouse",
      yKey: "count",
      clickable: true
    },
    // ...
  ],
  
  table: {
    columns: [
      { key: "item_number", label: "Item #" },
      { key: "warehouse", label: "Warehouse" },
      // ...
    ]
  }
}
```

### Phase 3: Clickable Charts (Week 3)

Implement drill-down logic:

```typescript
function handleChartClick(chartKey: string, segmentValue: any) {
  // Example: User clicks "BP1" bar on "by_warehouse" chart
  // → Navigate to same page with warehouse filter applied
  
  const chart = inventoryConfig.charts.find(c => c.key === chartKey)
  if (!chart?.clickable) return
  
  const params = new URLSearchParams(window.location.search)
  params.set(chart.xKey, segmentValue) // warehouse=BP1
  params.set('view', 'table') // scroll to table
  
  router.push(`/dashboard/inventory?${params}`)
}
```

## Migration Roadmap

### Stage 1: API Foundation (Week 1)

- [ ] Create materialized views in Supabase
- [ ] Create `/api/inventory/route.ts` (main endpoint)
- [ ] Create `/api/inventory/summary/route.ts`
- [ ] Create `/api/inventory/by-warehouse/route.ts`
- [ ] Create `/api/inventory/by-uom/route.ts`
- [ ] Create `/api/inventory/missing-cost/route.ts`
- [ ] Test each API route returns `{ rows, total }` or correct shape

### Stage 2: Data Layer Refactor (Week 2)

- [ ] Update `_components/data.ts` to call APIs (not direct Supabase)
- [ ] Update all fetchers to return `{ rows, total }`
- [ ] Remove JavaScript aggregation logic
- [ ] Remove duplicate fetch calls
- [ ] Test data flows work end-to-end

### Stage 3: Page Simplification (Week 2-3)

- [ ] Remove config mutation in `page.tsx`
- [ ] Pass data as props instead of injecting into config
- [ ] Add filter UI component
- [ ] Connect filters to URL searchParams
- [ ] Verify all widgets render correctly

### Stage 4: Clickable Charts (Week 3)

- [ ] Implement `onChartClick` handler
- [ ] Wire handler to all clickable charts
- [ ] Update URL on click
- [ ] Scroll to table on click
- [ ] Test drill-down flow

### Stage 5: Testing (Week 4)

- [ ] API contract tests (each route)
- [ ] Integration tests (page → API → render)
- [ ] E2E test: load page, click chart, verify filter
- [ ] Performance test with large dataset

### Stage 6: Documentation (Week 4)

- [ ] Document each API endpoint (params, response)
- [ ] Document filter behavior
- [ ] Document chart click behavior
- [ ] Add examples for cloning pattern

## Test Matrix

### API Tests (`__tests__/api/inventory.test.ts`)

- [ ] GET /api/inventory returns { rows, total }
- [ ] GET /api/inventory?page=2 returns correct page
- [ ] GET /api/inventory?warehouse=BP1 filters correctly
- [ ] GET /api/inventory/summary returns 9 numeric fields
- [ ] GET /api/inventory/by-warehouse returns grouped data

### Integration Tests (`__tests__/dashboard/inventory.test.tsx`)

- [ ] Page loads without errors
- [ ] Summary cards display correct counts
- [ ] Charts render with data
- [ ] Table renders with pagination
- [ ] Filters update URL and refetch data

### E2E Tests (Playwright)

```typescript
test('inventory dashboard drill-down', async ({ page }) => {
  await page.goto('/dashboard/inventory')
  
  // Verify summary cards
  await expect(page.locator('text=Total Records')).toBeVisible()
  
  // Click on warehouse chart bar
  await page.locator('[data-chart="by_warehouse"]').locator('text=BP1').click()
  
  // Verify filter applied
  await expect(page).toHaveURL(/warehouse=BP1/)
  
  // Verify table shows only BP1 rows
  const rows = page.locator('table tbody tr')
  for (const row of await rows.all()) {
    await expect(row).toContainText('BP1')
  }
})
```

## Cloning Checklist

To create a new dashboard (e.g., Purchase Orders):

### 1. Create Supabase Views (5 min)

- Summary view with aggregates
- Grouping views (by vendor, by status, etc.)

### 2. Create API Routes (30 min)

- `/api/purchase-orders/route.ts`
- `/api/purchase-orders/summary/route.ts`
- `/api/purchase-orders/by-vendor/route.ts`

### 3. Create Config (20 min)

- Copy `inventory/config.tsx` → `purchase-orders/config.tsx`
- Update filters, summary, charts, table configs
- No functions needed!

### 4. Create Page (10 min)

- Copy `inventory/page.tsx` → `purchase-orders/page.tsx`
- Update API calls to new endpoints
- Done!

**Total time: ~1 hour** (after inventory pattern is perfected)

## Success Criteria

- [ ] README clearly explains API-first architecture
- [ ] All data flows through APIs (no direct Supabase in components)
- [ ] Each API endpoint documented with request/response examples
- [ ] Charts are clickable and drill to filtered table
- [ ] Filters are simple (warehouse, person) and apply globally
- [ ] No duplicate data fetching
- [ ] No JavaScript aggregation (DB does it)
- [ ] Config is pure and declarative
- [ ] Pattern is clonable in <1 hour

## Reference Architecture

Based on Stock Adjustments `/forms/stock-adjustments/page.tsx`:

- **SSR Data Fetch**: Server component fetches data via `fetchResourcePage` returning `{ rows, total }`
- **Thin Page Wrapper**: Page is a minimal server component that passes serialized data to client islands
- **Config-First**: Separate configs for toolbar, view columns, and actions
- **Type Safety**: Domain types defined with transformation functions (`toRow`)
- **Client Islands**: Client components receive `initialRows`, `initialTotal`, `page`, `pageSize`
- **API Contract**: Standard `/api/[resource]` endpoint with `{ rows, total }` shape
- **No Browser DB**: All Supabase calls happen server-side; cookies forwarded automatically

This inventory dashboard should follow the same patterns but adapted for dashboard visualization instead of form data entry.


