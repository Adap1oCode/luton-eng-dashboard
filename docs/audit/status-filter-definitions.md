# Status Filter Definitions

**Date**: 2025-01-31  
**Purpose**: Complete reference of all Status filter definitions for stock-adjustments and tally-cards screens

---

## Stock Adjustments Status Filters

### Location
- **File**: `src/app/(main)/forms/stock-adjustments/stock-adjustments.config.tsx`
- **Function**: `statusToQuery()` (lines 63-68)
- **Quick Filter Config**: `quickFilters` (lines 203-217)

### Filter Options

| Value | Label | Query Parameters | Description |
|-------|-------|------------------|-------------|
| `ALL` | "All adjustments" | `{}` (empty) | Shows all records, no filtering |
| `ACTIVE` | "Active (qty > 0)" | `{ qty_gt: 0, qty_not_null: true }` | Records with quantity greater than 0 and not null |
| `ZERO` | "Zero quantity" | `{ qty_eq: 0 }` | Records with quantity exactly equal to 0 |
| `QUANTITY_UNDEFINED` | "Quantity undefined" | `{ qty_is_null_or_empty: true }` | Records where quantity is null or empty |

### Implementation

```typescript
export function statusToQuery(status: string): Record<string, any> {
  if (status === "ACTIVE") return { qty_gt: 0, qty_not_null: true };
  if (status === "ZERO") return { qty_eq: 0 };
  if (status === "QUANTITY_UNDEFINED") return { qty_is_null_or_empty: true };
  return {};
}
```

### Quick Filter Configuration

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
];
```

### Usage
- **Server-side**: `src/app/(main)/forms/stock-adjustments/page.tsx:26-30`
- **Client-side**: Used via `quickFilters` in `ResourceTableClient`

---

## Tally Cards Status Filters

### Location
- **File**: `src/app/(main)/forms/tally-cards/tally-cards.config.tsx`
- **Function**: `statusToQuery()` (lines 65-69)
- **Quick Filter Config**: `quickFilters` (lines 202-215)

### Filter Options

| Value | Label | Query Parameters | Description |
|-------|-------|------------------|-------------|
| `ALL` | "All tally cards" | `{}` (empty) | Shows all records, no filtering |
| `ACTIVE` | "Active" | `{ is_active: true }` | Records where `is_active` is `true` |
| `INACTIVE` | "Inactive" | `{ is_active: false }` | Records where `is_active` is `false` |

### Implementation

```typescript
export function statusToQuery(status: string): Record<string, any> {
  if (status === "ACTIVE") return { is_active: true };
  if (status === "INACTIVE") return { is_active: false };
  return {};
}
```

### Quick Filter Configuration

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
];
```

### Usage
- **Server-side**: `src/app/(main)/forms/tally-cards/page.tsx:26-30`
- **Client-side**: Used via `quickFilters` in `ResourceTableClient`

---

## Query Parameter Handling

### API Handler
- **File**: `src/lib/api/handle-list.ts:79-84`
- **Support**: Numeric comparison filters (`qty_gt`, `qty_eq`, etc.) and boolean filters (`is_active`)

### Supported Query Parameter Patterns

1. **Numeric Comparisons**:
   - `qty_gt`: Quantity greater than
   - `qty_gte`: Quantity greater than or equal
   - `qty_lt`: Quantity less than
   - `qty_lte`: Quantity less than or equal
   - `qty_eq`: Quantity equal to
   - `qty_not_null`: Quantity is not null
   - `qty_is_null_or_empty`: Quantity is null or empty

2. **Boolean Filters**:
   - `is_active: true`: Active records
   - `is_active: false`: Inactive records

3. **Special Filters**:
   - `activeOnly`: Generic active flag filter (used by some resources)

---

## Notes

1. **Case Sensitivity**: Status values are case-sensitive (`ACTIVE` vs `active`)
2. **Default Value**: Both screens default to `"ALL"` (show all records)
3. **Server/Client Consistency**: `statusToQuery()` is shared between server (SSR) and client to ensure consistency
4. **Filter Meta**: Both screens export `stockAdjustmentsFilterMeta` / `tallyCardsFilterMeta` for server-side usage

---

## Test Coverage

### Stock Adjustments
- **File**: `src/app/(main)/forms/stock-adjustments/__tests__/filters.spec.ts`
- Tests cover: ACTIVE, ZERO, QUANTITY_UNDEFINED, ALL, and unknown values

### Tally Cards
- **File**: `src/app/(main)/forms/tally-cards/__tests__/filters.spec.ts`
- Tests verify quick filter configuration exists




