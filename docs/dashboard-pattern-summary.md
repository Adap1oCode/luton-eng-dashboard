# Dashboard Pattern Summary

## Overview
This document summarizes the current dashboard implementation pattern for the inventory dashboard, including data flow, components, and architecture.

## Current Architecture

### 1. Dashboard Components Structure
```
src/components/dashboard/
├── client/
│   ├── data-viewer.tsx          # Main data viewer hook (useDataViewer)
│   ├── data-viewer-simple.tsx   # Data viewer UI component (ACTIVE)
│   ├── data-viewer-new.tsx      # Alternative data viewer
│   ├── tile-actions.ts          # Tile click handling
│   └── data-filters.ts          # Filter logic
├── page.tsx                     # GenericDashboardPage (SSR wrapper)
├── client.tsx                   # DashboardClient (main client component)
└── widgets/
    └── summary-cards.tsx        # Summary tiles rendering
```

### 2. Active Data Viewer Component
**Currently Using**: `data-viewer-simple.tsx`

**Why**: The `DashboardClient` imports and uses:
```typescript
import { useDataViewer } from "@/components/dashboard/client/data-viewer";
import { DataViewer } from "@/components/dashboard/client/data-viewer-simple";
```

### 3. Data Flow Pattern

#### Server-Side (SSR)
1. **`inventory/page.tsx`** → Fetches summary data
2. **`GenericDashboardPage`** → Wraps with SSR data
3. **`DashboardClient`** → Handles client-side logic

#### Client-Side Data Flow
1. **Tile Click** → `tile-actions.ts` → `handleClickWidget`
2. **Data Fetching** → `useDataViewer` hook → RPC call
3. **Data Display** → `data-viewer-simple.tsx` component

### 4. RPC Function Pattern

#### Current RPC Function
- **Name**: `get_inventory_rows`
- **Parameters**: 
  - `_filter` (jsonb): Filter conditions
  - `_distinct` (boolean): Whether to return distinct records
  - `_range_from` (integer): Start index
  - `_range_to` (integer): End index
- **Returns**: Array of inventory records

#### Filter Conversion
```typescript
// Dashboard config filter
filter: { column: "total_available", equals: 0 }

// Converted to RPC format
rpcParams._filter = {
  column: "total_available",
  op: "=",
  value: "0"
}
```

### 5. Tile Configuration Pattern

#### Working Tile Example (Out-of-Stock Items)
```typescript
{
  key: "outOfStockCount",
  title: "Out-of-Stock Items",
  clickable: true,
  filter: { column: "total_available", equals: 0 },
  rpcName: "get_inventory_rows",
  sql: "SELECT COUNT(*) AS out_of_stock_count FROM inventory WHERE total_available = 0"
}
```

#### Non-Working Tile Example (Unique Items)
```typescript
{
  key: "uniqueItems",
  title: "Unique Item Numbers",
  clickable: true,
  distinct: true,
  filter: { column: "item_number", isNotNull: true },
  rpcName: "get_inventory_rows",
  sql: "SELECT COUNT(DISTINCT item_number) AS unique_item_count FROM inventory"
}
```

### 6. Data Viewer Implementation

#### useDataViewer Hook (data-viewer.tsx)
- **Purpose**: Manages data fetching and state
- **Key Functions**:
  - `handleClickWidget`: Processes tile clicks
  - RPC parameter conversion
  - Data state management
- **Current Issue**: Uses data length as total count

#### DataViewer Component (data-viewer-simple.tsx)
- **Purpose**: Renders the data table UI
- **Features**:
  - Pagination controls
  - Row selection
  - Filter display
  - Debug information (temporary)
- **Props**: `filteredData`, `totalCount`, `filters`, `config`

### 7. Current Issues

#### Issue 1: Total Count Display
- **Problem**: Shows data length (e.g., 1000) instead of actual total (e.g., 883)
- **Root Cause**: RPC function only returns data, not total count
- **Current Workaround**: `dataWithCount[0]._totalCount = dataWithCount.length`

#### Issue 2: Tile Click Failures
- **Problem**: Some tiles (Unique Items) fail with RPC errors
- **Root Cause**: `IS NOT NULL` filter handling in RPC function
- **Status**: Partially resolved with updated RPC function

#### Issue 3: Pagination
- **Problem**: Fetches 1000 records instead of 50 with pagination
- **Root Cause**: Range set to 999 for performance
- **Impact**: Slow loading, incorrect total counts

### 8. Debug Information

#### Current Debug Output
```typescript
// In data-viewer-simple.tsx
const debugInfo = {
  drawerOpen,
  filteredDataLength: filteredData.length,
  totalCount,
  filters,
  configId: config.id,
  firstRow: filteredData[0]
};
```

#### Console Debug Messages
- `🔧 RPC FUNCTION CALL DEBUG` - RPC parameter building
- `✅ RPC call successful!` - Successful data fetch
- `🔍 [DataViewer-Simple]` - Component data reception

### 9. Comparison with Stock-Adjustments Pattern

#### Stock-Adjustments (Working Pattern)
```typescript
// Uses generic API endpoint
const { rows, total } = await fetchResourcePage({
  endpoint: "/api/v_tcm_user_tally_card_entries",
  page, pageSize
});

// Returns { rows: [...], total: 1234 }
```

#### Inventory Dashboard (Current Pattern)
```typescript
// Uses RPC function
const { data } = await supabase.rpc('get_inventory_rows', params);

// Returns [...]
// Missing total count
```

### 10. File Locations

#### Key Files
- **Dashboard Config**: `src/app/(main)/dashboard/inventory/config.tsx`
- **Data Fetching**: `src/app/(main)/dashboard/inventory/_components/data.ts`
- **Main Page**: `src/app/(main)/dashboard/inventory/page.tsx`
- **RPC Function**: `fix-get-inventory-rows-rpc.sql`

#### Component Files
- **Main Client**: `src/components/dashboard/client.tsx`
- **Data Viewer Hook**: `src/components/dashboard/client/data-viewer.tsx`
- **Data Viewer UI**: `src/components/dashboard/client/data-viewer-simple.tsx`
- **Tile Actions**: `src/components/dashboard/client/tile-actions.ts`

### 11. Next Steps Recommendations

1. **Fix Total Count**: Implement proper total count in RPC function
2. **Implement Pagination**: Use 50 records initially with proper pagination
3. **Test All Tiles**: Ensure all dashboard tiles work correctly
4. **Remove Debug Code**: Clean up temporary debug information
5. **Performance Optimization**: Optimize data fetching for large datasets

### 12. Current Status

- ✅ **Out-of-Stock Items**: Working (883 records)
- ❌ **Total Inventory Records**: Working but wrong total count
- ❌ **Unique Item Numbers**: Failing with RPC errors
- ✅ **RPC Function**: Deployed and functional
- ✅ **Data Viewer**: Displaying data correctly
- ❌ **Pagination**: Not implemented (shows all records)

---

*Last Updated: Current session*
*Status: In Progress - RPC approach working, total count and pagination issues remain*
