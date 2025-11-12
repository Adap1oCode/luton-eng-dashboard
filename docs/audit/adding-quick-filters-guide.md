# Adding Quick Filters Guide

**Date**: 2025-01-31  
**Purpose**: Guide for adding new quick filter dropdowns to stock-adjustments and tally-cards screens

---

## How Quick Filters Work

Each item in the `quickFilters` array becomes a **separate dropdown** in the UI. The system automatically:
1. Renders each filter as a dropdown with label
2. Handles URL state synchronization
3. Applies filters on both server (SSR) and client side
4. Combines multiple filters together

---

## Current Implementation

### Stock Adjustments (3 dropdowns)
1. **Status** - Filters by quantity status
2. **Updated** - Filters by date (Last 7/30/90 days)
3. **Warehouse** - Filters by warehouse name (static list)

### Tally Cards (2 dropdowns)
1. **Status** - Filters by active/inactive
2. **Updated** - Filters by date (Last 7/30/90 days)

---

## Adding a New Filter Dropdown

### Step 1: Create Filter Function

Add a function that converts filter value to query parameters:

```typescript
/**
 * YourFilter filter → query parameter mapping.
 */
export function yourFilterToQuery(filterValue: string): Record<string, any> {
  if (filterValue === "ALL") return {};
  // Return query parameters for Supabase
  return { your_column: filterValue };
}
```

### Step 2: Add to Filter Meta

Add to the `*FilterMeta` array for server-side usage:

```typescript
export const stockAdjustmentsFilterMeta: QuickFilterMeta[] = [
  { id: "status", toQueryParam: statusToQuery },
  { id: "updated", toQueryParam: dateFilterToQuery },
  { id: "warehouse", toQueryParam: warehouseFilterToQuery },
  { id: "yourFilter", toQueryParam: yourFilterToQuery }, // ← Add here
];
```

### Step 3: Add to Quick Filters Array

Add to the `quickFilters` array for UI rendering:

```typescript
export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [/* ... */],
    defaultValue: "ALL",
    toQueryParam: statusToQuery,
  },
  {
    id: "yourFilter", // ← Unique ID
    label: "Your Filter Label", // ← Display label
    type: "enum",
    options: [
      { value: "ALL", label: "All items" },
      { value: "OPTION1", label: "Option 1" },
      { value: "OPTION2", label: "Option 2" },
    ],
    defaultValue: "ALL",
    toQueryParam: yourFilterToQuery,
  },
];
```

**That's it!** The dropdown will automatically appear in the UI.

---

## Example: Dynamic Warehouse Filter

### Option 1: Static List (Current Implementation)

```typescript
{
  id: "warehouse",
  label: "Warehouse",
  type: "enum",
  options: [
    { value: "ALL", label: "All warehouses" },
    { value: "AM - WH 1", label: "AM - WH 1" },
    { value: "AM - WH 2", label: "AM - WH 2" },
  ],
  defaultValue: "ALL",
  toQueryParam: warehouseFilterToQuery,
}
```

### Option 2: Dynamic Loading (Advanced)

For dynamic warehouse options loaded from API, you have two approaches:

#### Approach A: Load in SSR Page (Recommended)

**File**: `src/app/(main)/forms/stock-adjustments/page.tsx`

```typescript
export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  // ... existing code ...
  
  // Load warehouses for filter
  const { rows: warehouses } = await fetchResourcePage<any>({
    endpoint: "/api/warehouses",
    page: 1,
    pageSize: 1000,
    extraQuery: { is_active: true },
  });
  
  const warehouseOptions = [
    { value: "ALL", label: "All warehouses" },
    ...warehouses.map((w: any) => ({
      value: w.name || w.code,
      label: w.name || w.code,
    })),
  ];
  
  // Pass to client component
  return (
    <StockAdjustmentsTableClient
      initialRows={rows}
      initialTotal={total}
      page={page}
      pageSize={pageSize}
      warehouseOptions={warehouseOptions} // ← Pass options
    />
  );
}
```

**File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments-table-client.tsx`

```typescript
interface StockAdjustmentsTableClientProps {
  initialRows: StockAdjustmentRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
  warehouseOptions?: Array<{ value: string; label: string }>; // ← Add prop
}

export function StockAdjustmentsTableClient({
  initialRows,
  initialTotal,
  page,
  pageSize,
  warehouseOptions,
}: StockAdjustmentsTableClientProps) {
  // Merge dynamic options into config
  const viewConfigWithColumns = useMemo(() => {
    const config = {
      ...stockAdjustmentsViewConfig,
      columns: stockAdjustmentsViewConfig.buildColumns(),
      apiEndpoint: stockAdjustmentsViewConfig.apiEndpoint,
    };
    
    // Update warehouse filter options if provided
    if (warehouseOptions) {
      const quickFilters = (config.quickFilters ?? []).map((filter) => {
        if (filter.id === "warehouse") {
          return { ...filter, options: warehouseOptions };
        }
        return filter;
      });
      config.quickFilters = quickFilters;
    }
    
    return config;
  }, [warehouseOptions]);
  
  // ... rest of component
}
```

#### Approach B: Load in Client Component (Alternative)

**File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx`

```typescript
// Make quickFilters a function that accepts options
export function buildQuickFilters(warehouseOptions?: Array<{ value: string; label: string }>): QuickFilter[] {
  return [
    {
      id: "status",
      label: "Status",
      type: "enum",
      options: [/* ... */],
      defaultValue: "ALL",
      toQueryParam: statusToQuery,
    },
    {
      id: "warehouse",
      label: "Warehouse",
      type: "enum",
      options: warehouseOptions || [
        { value: "ALL", label: "All warehouses" },
      ],
      defaultValue: "ALL",
      toQueryParam: warehouseFilterToQuery,
    },
  ];
}

// Default export for backward compatibility
export const quickFilters = buildQuickFilters();
```

Then in the client component, load warehouses and rebuild filters:

```typescript
const { data: warehouses } = useQuery({
  queryKey: ["warehouses"],
  queryFn: async () => {
    const res = await fetch("/api/warehouses?is_active=true&pageSize=1000");
    return res.json();
  },
});

const quickFilters = useMemo(() => {
  const warehouseOptions = warehouses?.rows
    ? [
        { value: "ALL", label: "All warehouses" },
        ...warehouses.rows.map((w: any) => ({
          value: w.name,
          label: w.name,
        })),
      ]
    : undefined;
  return buildQuickFilters(warehouseOptions);
}, [warehouses]);
```

---

## Filter Query Parameter Patterns

### Exact Match
```typescript
export function warehouseFilterToQuery(warehouseFilter: string): Record<string, any> {
  if (warehouseFilter === "ALL") return {};
  return { warehouse: warehouseFilter }; // Exact match
}
```

### Numeric Comparison
```typescript
export function quantityFilterToQuery(qtyFilter: string): Record<string, any> {
  if (qtyFilter === "ALL") return {};
  if (qtyFilter === "HIGH") return { qty_gte: 100 };
  if (qtyFilter === "MEDIUM") return { qty_gte: 50, qty_lt: 100 };
  if (qtyFilter === "LOW") return { qty_lt: 50 };
  return {};
}
```

### Date Range
```typescript
export function dateFilterToQuery(dateFilter: string): Record<string, any> {
  if (dateFilter === "ALL") return {};
  
  const days = parseInt(dateFilter.replace("LAST_", "").replace("_DAYS", ""));
  if (isNaN(days)) return {};
  
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  
  return { updated_at_gte: date.toISOString() };
}
```

### Multiple Conditions
```typescript
export function complexFilterToQuery(filterValue: string): Record<string, any> {
  if (filterValue === "ALL") return {};
  if (filterValue === "ACTIVE_RECENT") {
    return {
      qty_gt: 0,
      qty_not_null: true,
      updated_at_gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  return {};
}
```

---

## Supported Query Parameter Suffixes

The API handler supports these suffixes (automatically converted to Supabase queries):

- `_gt` - Greater than
- `_gte` - Greater than or equal
- `_lt` - Less than
- `_lte` - Less than or equal
- `_eq` - Equal to
- `_not_null` - Not null
- `_is_null` - Is null
- `_is_null_or_empty` - Is null or empty string

**Examples**:
- `qty_gt: 0` → `WHERE qty > 0`
- `updated_at_gte: "2025-01-24T00:00:00.000Z"` → `WHERE updated_at >= '2025-01-24T00:00:00.000Z'`
- `warehouse: "AM - WH 1"` → `WHERE warehouse = 'AM - WH 1'`

---

## Testing Your Filter

1. **Check UI**: Verify dropdown appears in toolbar
2. **Test Selection**: Select different options, verify URL updates
3. **Test Filtering**: Verify table data filters correctly
4. **Test Combination**: Test with other filters active
5. **Test Server-Side**: Refresh page with filter in URL, verify SSR applies filter

---

## Common Patterns

### Filter by Column Value
```typescript
export function columnFilterToQuery(value: string): Record<string, any> {
  if (value === "ALL") return {};
  return { column_name: value };
}
```

### Filter by Boolean
```typescript
export function booleanFilterToQuery(value: string): Record<string, any> {
  if (value === "ALL") return {};
  return { is_active: value === "TRUE" };
}
```

### Filter by Range
```typescript
export function rangeFilterToQuery(value: string): Record<string, any> {
  if (value === "ALL") return {};
  const [min, max] = value.split("-").map(Number);
  return { qty_gte: min, qty_lte: max };
}
```

---

## Notes

1. **Filter ID Must Be Unique**: Each filter needs a unique `id` in the `quickFilters` array
2. **"ALL" is Standard**: Use `"ALL"` as the value for "show all" option
3. **Default Value**: Always set `defaultValue: "ALL"` for better UX
4. **Server/Client Sync**: Both `filterMeta` and `quickFilters` must include the filter for server/client consistency
5. **URL State**: Filters are automatically synced to URL query parameters
6. **Combining Filters**: Multiple filters work together (AND logic)

---

## Example: Complete Filter Addition

Here's a complete example adding a "User" filter:

```typescript
// 1. Add filter function
export function userFilterToQuery(userFilter: string): Record<string, any> {
  if (userFilter === "ALL") return {};
  return { user_id: userFilter }; // Filter by user_id UUID
}

// 2. Add to filterMeta
export const stockAdjustmentsFilterMeta: QuickFilterMeta[] = [
  { id: "status", toQueryParam: statusToQuery },
  { id: "updated", toQueryParam: dateFilterToQuery },
  { id: "warehouse", toQueryParam: warehouseFilterToQuery },
  { id: "user", toQueryParam: userFilterToQuery }, // ← New
];

// 3. Add to quickFilters
export const quickFilters: QuickFilter[] = [
  // ... existing filters ...
  {
    id: "user",
    label: "User",
    type: "enum",
    options: [
      { value: "ALL", label: "All users" },
      { value: "user-uuid-1", label: "John Doe" },
      { value: "user-uuid-2", label: "Jane Smith" },
    ],
    defaultValue: "ALL",
    toQueryParam: userFilterToQuery,
  },
];
```

The filter will automatically appear as a dropdown in the UI!







