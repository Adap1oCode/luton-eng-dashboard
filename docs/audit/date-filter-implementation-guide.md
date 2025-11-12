# Date Filter Implementation Guide

**Date**: 2025-01-31  
**Purpose**: Add "Updated in last X days" filters to stock-adjustments and tally-cards screens

---

## Overview

Add date-based quick filters for "Updated in last 7 days", "Updated in last 30 days", etc. using the existing filter infrastructure.

---

## Current Filter System

### API Handler Support
- **File**: `src/lib/api/handle-list.ts:79-84`
- **Current**: Only converts numeric values for `_gt`, `_gte`, `_lt`, `_lte`, `_eq` filters
- **Issue**: Date filters need string values (ISO date strings), not numbers

### Supabase Provider Support
- **File**: `src/lib/supabase/factory.ts:232-234`
- **Support**: Already handles `_gte` for any column type, including dates
- **Method**: `query.gte(column, value)` works with ISO date strings

---

## Implementation Plan

### Step 1: Update API Handler to Support Date Filters

**File**: `src/lib/api/handle-list.ts:79-84`

**Current Code**:
```typescript
// Numeric comparison filters: qty_gt, qty_gte, qty_lt, qty_lte, qty_eq
else if (key.endsWith('_gt') || key.endsWith('_gte') || key.endsWith('_lt') || key.endsWith('_lte') || key.endsWith('_eq')) {
  const numValue = Number(value);
  if (Number.isFinite(numValue)) {
    filters[key] = numValue;
  }
}
```

**Updated Code**:
```typescript
// Numeric and date comparison filters: qty_gt, updated_at_gte, etc.
else if (key.endsWith('_gt') || key.endsWith('_gte') || key.endsWith('_lt') || key.endsWith('_lte') || key.endsWith('_eq')) {
  // Try numeric first (for qty, etc.)
  const numValue = Number(value);
  if (Number.isFinite(numValue)) {
    filters[key] = numValue;
  } else {
    // If not numeric, pass through as string (for dates, etc.)
    filters[key] = value;
  }
}
```

**Impact**: Allows date filters like `updated_at_gte=2025-01-24T00:00:00Z` to pass through

---

### Step 2: Add Date Filter Function

**File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx`

**Add after `statusToQuery` function** (around line 68):

```typescript
/**
 * Date filter → query parameter mapping.
 * Converts "LAST_X_DAYS" to updated_at_gte with ISO date string.
 */
export function dateFilterToQuery(dateFilter: string): Record<string, any> {
  if (dateFilter === "ALL") return {};
  
  const days = parseInt(dateFilter.replace("LAST_", "").replace("_DAYS", ""));
  if (isNaN(days)) return {};
  
  // Calculate date X days ago
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0); // Start of day
  
  // Return ISO string for Supabase
  return { updated_at_gte: date.toISOString() };
}
```

**File**: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx`

**Add same function** (around line 69):

```typescript
/**
 * Date filter → query parameter mapping.
 * Converts "LAST_X_DAYS" to updated_at_gte with ISO date string.
 */
export function dateFilterToQuery(dateFilter: string): Record<string, any> {
  if (dateFilter === "ALL") return {};
  
  const days = parseInt(dateFilter.replace("LAST_", "").replace("_DAYS", ""));
  if (isNaN(days)) return {};
  
  // Calculate date X days ago
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0); // Start of day
  
  // Return ISO string for Supabase
  return { updated_at_gte: date.toISOString() };
}
```

---

### Step 3: Add Date Filter to Quick Filters

**File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx`

**Update `quickFilters` array** (around line 203):

```typescript
export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "ALL", label: "All adjustments" },
      { value: "ACTIVE", label: "Active (qty > 0)" },
      { value: "ZERO", label: "Zero quantity" },
      { value: "QUANTITY_UNDEFINED", label: "Quantity undefined" },
    ],
    defaultValue: "ALL",
    toQueryParam: statusToQuery,
  },
  {
    id: "updated",
    label: "Updated",
    type: "enum",
    options: [
      { value: "ALL", label: "All time" },
      { value: "LAST_7_DAYS", label: "Last 7 days" },
      { value: "LAST_30_DAYS", label: "Last 30 days" },
      { value: "LAST_90_DAYS", label: "Last 90 days" },
    ],
    defaultValue: "ALL",
    toQueryParam: dateFilterToQuery,
  },
];
```

**File**: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx`

**Update `quickFilters` array** (around line 202):

```typescript
export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "ALL", label: "All tally cards" },
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
    ],
    defaultValue: "ALL",
    toQueryParam: statusToQuery,
  },
  {
    id: "updated",
    label: "Updated",
    type: "enum",
    options: [
      { value: "ALL", label: "All time" },
      { value: "LAST_7_DAYS", label: "Last 7 days" },
      { value: "LAST_30_DAYS", label: "Last 30 days" },
      { value: "LAST_90_DAYS", label: "Last 90 days" },
    ],
    defaultValue: "ALL",
    toQueryParam: dateFilterToQuery,
  },
];
```

---

### Step 4: Update Filter Meta for Server-Side Usage

**File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx`

**Update `stockAdjustmentsFilterMeta`** (around line 75):

```typescript
export const stockAdjustmentsFilterMeta: QuickFilterMeta[] = [
  {
    id: "status",
    toQueryParam: statusToQuery,
  },
  {
    id: "updated",
    toQueryParam: dateFilterToQuery,
  },
];
```

**File**: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx`

**Update `tallyCardsFilterMeta`** (around line 76):

```typescript
export const tallyCardsFilterMeta: QuickFilterMeta[] = [
  {
    id: "status",
    toQueryParam: statusToQuery,
  },
  {
    id: "updated",
    toQueryParam: dateFilterToQuery,
  },
];
```

---

### Step 5: Update Server-Side Page to Handle Date Filter

**File**: `src/app/(main)/forms/stock-adjustments/page.tsx`

**Update filter handling** (around line 25-30):

```typescript
// Apply status filter transform if present
const extraQuery: Record<string, any> = { raw: "true" };
const statusFilter = filters.status;
if (statusFilter && statusFilter !== "ALL") {
  Object.assign(extraQuery, statusToQuery(statusFilter));
}

// Apply date filter transform if present
const dateFilter = filters.updated;
if (dateFilter && dateFilter !== "ALL") {
  Object.assign(extraQuery, dateFilterToQuery(dateFilter));
}
```

**File**: `src/app/(main)/forms/tally-cards/page.tsx`

**Update filter handling** (around line 25-30):

```typescript
// Apply status filter transform if present
const extraQuery: Record<string, any> = { raw: "true" };
const statusFilter = filters.status;
if (statusFilter && statusFilter !== "ALL") {
  Object.assign(extraQuery, statusToQuery(statusFilter));
}

// Apply date filter transform if present
const dateFilter = filters.updated;
if (dateFilter && dateFilter !== "ALL") {
  Object.assign(extraQuery, dateFilterToQuery(dateFilter));
}
```

**Don't forget to import**:
```typescript
import { config, stockAdjustmentsFilterMeta, statusToQuery, dateFilterToQuery } from "./stock-adjustments.config";
```

---

## Filter Options Summary

### Stock Adjustments
- **Status Filter**: ALL, ACTIVE, ZERO, QUANTITY_UNDEFINED
- **Date Filter** (NEW): ALL, LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS

### Tally Cards
- **Status Filter**: ALL, ACTIVE, INACTIVE
- **Date Filter** (NEW): ALL, LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS

---

## Query Parameter Examples

### Last 7 Days
```
?updated=LAST_7_DAYS
```
**Converts to**:
```
?updated_at_gte=2025-01-24T00:00:00.000Z
```

### Last 30 Days
```
?updated=LAST_30_DAYS
```
**Converts to**:
```
?updated_at_gte=2025-01-01T00:00:00.000Z
```

### Combined Filters
```
?status=ACTIVE&updated=LAST_7_DAYS
```
**Converts to**:
```
?qty_gt=0&qty_not_null=true&updated_at_gte=2025-01-24T00:00:00.000Z
```

---

## Testing Checklist

- [ ] Test "Last 7 days" filter shows only records updated in last 7 days
- [ ] Test "Last 30 days" filter shows only records updated in last 30 days
- [ ] Test "Last 90 days" filter shows only records updated in last 90 days
- [ ] Test "All time" shows all records (no date filter)
- [ ] Test date filter combined with status filter works correctly
- [ ] Test date filter works on both stock-adjustments and tally-cards
- [ ] Verify date calculation is correct (timezone handling)
- [ ] Verify filter persists in URL and works on page refresh

---

## Notes

1. **Timezone**: Uses local timezone for date calculation, but stores as UTC ISO string (Supabase standard)
2. **Date Calculation**: Uses `setHours(0, 0, 0, 0)` to ensure we get start of day for consistent filtering
3. **Extensibility**: Easy to add more options (LAST_1_DAY, LAST_14_DAYS, LAST_180_DAYS, etc.)
4. **Performance**: Date filters use indexed `updated_at` column, should be fast
5. **Backward Compatibility**: "ALL" option ensures existing behavior is preserved

---

## Alternative: More Granular Options

If you want more options, you can expand the filter:

```typescript
options: [
  { value: "ALL", label: "All time" },
  { value: "LAST_1_DAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_14_DAYS", label: "Last 14 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_90_DAYS", label: "Last 90 days" },
  { value: "LAST_180_DAYS", label: "Last 6 months" },
  { value: "LAST_365_DAYS", label: "Last year" },
],
```

The `dateFilterToQuery` function will automatically handle any `LAST_X_DAYS` format.







