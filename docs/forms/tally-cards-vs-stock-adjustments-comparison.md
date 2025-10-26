# Tally Cards vs Stock Adjustments - Feature Comparison

**Date:** 2025-01-27  
**Purpose:** Identify functionality differences to understand what tally-cards does that stock-adjustments doesn't

---

## 📊 Summary

| Feature | Tally Cards | Stock Adjustments | Notes |
|---------|------------|------------------|-------|
| **Base Pattern** | Old pattern (non-standard) | ✅ Gold Standard | Stock-adjustments is the reference |
| **Data Projection** | ✅ Yes (`projection.ts`) | ❌ No (inline `toRow`) | Tally uses separate projection |
| **Inline Editing** | ✅ Yes (Status field) | ✅ Yes | ✅ Added in Phase 2 (Qty field) |
| **Hyperlink Columns** | ✅ Yes (Tally Card Number) | ✅ Yes | ✅ Added in Phase 1 |
| **Quick Filters** | ✅ Yes (Status filter) | ✅ Yes | ✅ Added in Phase 2 (Status filter with QuickFiltersClient) |
| **Export CSV Button** | ✅ Yes | ✅ Yes | ✅ Added in Phase 1 |
| **Dynamic Toolbar** | ✅ Yes (state-based) | ✅ Yes | ✅ Added in Phase 2 (createStockAdjustmentsToolbar factory) |
| **Custom Form Component** | ✅ Yes (`form-component.tsx`) | ❌ No | Uses generic FormIsland |
| **Status Badges** | ✅ Yes (Active/Inactive) | ✅ Yes | ✅ Added in Phase 1 (Qty-based badges) |
| **Old Templete Folder** | ⚠️ Yes (deprecated) | ❌ No | Tally still has old files |

---

## 🔍 Detailed Differences

### 1. **Data Projection Pattern** 

**Tally Cards:**
```typescript
// src/lib/data/resources/tally_cards/projection.ts
export function mapRows(rows: TallyCard[]): TallyCardRow[] {
  return rows.map(toRow);
}
```

**Stock Adjustments:**
```typescript
// Inline in page.tsx
const rows = (domainRows ?? []).map(toRow);
```

**Impact:** Tally uses a separate projection file, stock-adjustments keeps it inline. **Recommendation:** Keep inline for simplicity (per gold standard).

---

### 2. **Inline Editing**

**Tally Cards:**
```typescript
// view.config.tsx
export const INLINE_EDIT_CONFIGS: Record<string, InlineEditConfig> = {
  is_active: {
    fieldType: "boolean",
    options: [...]
  },
  status: {
    fieldType: "select",
    options: [...]
  }
};

// Column config includes inline edit
cell: ({ row }) => {
  const isActive = row.getValue<boolean>("is_active");
  return <Badge>...</Badge>;
},
meta: {
  inlineEdit: INLINE_EDIT_CONFIGS.is_active,
},
```

**Stock Adjustments:**
- No inline editing configured
- Cells are readonly

**Recommendation:** Add inline editing to stock-adjustments if users need to edit quantities/locations directly in the table.

---

### 3. **Hyperlink Columns (Row Actions)**

**Tally Cards:**
```typescript
{
  accessorKey: "tally_card_number",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Tally Card Number" />,
  cell: ({ row }) => {
    const id = row.original.id;
    const number = row.getValue<string>("tally_card_number");
    return (
      <a
        href={`/forms/tally-cards/edit/${id}`}
        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {String(number)}
      </a>
    );
  },
}
```

**Stock Adjustments:**
- No hyperlink columns
- Navigation happens via row actions menu

**Recommendation:** Consider adding hyperlink to "Tally Card Number" column for better UX.

---

### 4. **Quick Filters**

**Tally Cards:**
```typescript
export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "ALL", label: "All statuses" },
      { value: "ACTIVE", label: "Active only" },
      { value: "INACTIVE", label: "Inactive only" },
    ],
    defaultValue: "ALL",
  },
];
```

**Stock Adjustments:**
- No quick filters defined
- Relies on advanced filters only

**Recommendation:** Add quick filters for common cases (e.g., "Active Only", "Recent Changes").

---

### 5. **Export CSV Button**

**Tally Cards:**
```typescript
// toolbar.config.tsx
export const baseTallyCardsToolbar: ToolbarConfig = {
  left: [
    // ...
    { id: "exportCsv", label: "Export CSV", icon: "Download", variant: "outline", onClickId: "exportCsv" },
  ],
};
```

**Stock Adjustments:**
```typescript
showExportButton={false}  // Explicitly disabled in PageShell
```

**Recommendation:** Add export button to stock-adjustments toolbar.

---

### 6. **Dynamic Toolbar**

**Tally Cards:**
```typescript
// toolbar.config.tsx
export const createTallyCardsToolbar = (hasSorting: boolean, hasFilters: boolean): ToolbarConfig => {
  const rightButtons = [];
  
  if (hasSorting) {
    rightButtons.push({ id: "appliedSorting", label: "Sorting Applied", ... });
  }
  
  if (hasFilters) {
    rightButtons.push({ id: "appliedFilters", label: "Filter Applied", ... });
  }
  
  return {
    ...baseTallyCardsToolbar,
    right: rightButtons,
  };
};
```

**Stock Adjustments:**
- Static toolbar configuration
- No dynamic buttons

**Recommendation:** Consider adding dynamic toolbar to show active filters/sorts.

---

### 7. **Custom Form Component**

**Tally Cards:**
- Has `form-component.tsx` (290 lines)
- Custom form with React Hook Form
- Handles warehouse loading, validation, etc.

**Stock Adjustments:**
- Uses generic `FormIsland` component
- Configuration-driven via `form.config.ts`
- No custom form component

**Recommendation:** ✅ Stock-adjustments pattern is better (configuration-driven). This is what we want.

---

### 8. **Page-Level Query Parameters**

**Tally Cards:**
```typescript
// page.tsx
extraQuery: {
  sortBy: spValueToString(sp.sortBy),
  sortOrder: spValueToString(sp.sortOrder),
  filter: spValueToString(sp.filter),
  status: spValueToString(sp.status),
  search: spValueToString(sp.search),
}
```

**Stock Adjustments:**
```typescript
// page.tsx
extraQuery: { raw: "true" }  // Simpler
```

**Recommendation:** Tally has more granular query params. Stock-adjustments could benefit from status/search filters.

---

### 9. **Status Badges/Visual Indicators**

**Tally Cards:**
```typescript
cell: ({ row }) => {
  const isActive = row.getValue<boolean>("is_active");
  return (
    <Badge
      variant="secondary"
      className={`${isActive ? "bg-orange-500" : "bg-gray-500"} hover:bg-opacity-80 text-white`}
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
```

**Stock Adjustments:**
- Plain text display
- No visual status indicators

**Recommendation:** Add visual status indicators for better UX.

---

### 10. **Features Configuration**

**Tally Cards:**
```typescript
export const features: TableFeatures = {
  sortable: true,
  globalSearch: true,
  exportCsv: true,
  pagination: true,
  rowSelection: true,
  dnd: false,
  saveView: false,
  viewStorageKey: "tally-cards-view",
  columnResizing: true,
  columnReordering: true,
  advancedFilters: true,
  inlineEditing: true,  // ✅ Explicitly enabled
};
```

**Stock Adjustments:**
```typescript
features: {
  rowSelection: true,
  pagination: true,
  // Other features rely on global defaults
}
```

**Recommendation:** Make features more explicit in stock-adjustments config.

---

## 🎯 Recommendations for Stock Adjustments

### High Priority
1. ✅ **Add Export CSV Button** - Users likely need to export data (COMPLETED)
2. ✅ **Add Hyperlink to Tally Card Number** - Faster navigation to edit (COMPLETED)
3. ✅ **Add Visual Status Indicators** - Better UX for active/inactive items (COMPLETED)

### Medium Priority
4. ✅ **Add Quick Filters** - Common filters like "Active Only", "This Week" (COMPLETED)
5. ✅ **Add Inline Editing for Quantity** - Allow quick adjustments without opening edit form (COMPLETED)
6. ✅ **Add Dynamic Toolbar** - Show active filters/sorts (COMPLETED)

### Low Priority
7. ✅ **Consider Separate Projection File** - Only if logic gets complex
8. ⚠️ **Better Query Param Handling** - If URL state becomes important

---

## 🚫 What NOT to Adopt from Tally Cards

1. ❌ **Custom `form-component.tsx`** - Keep using generic FormIsland
2. ❌ **Old `Templete/` folder pattern** - This is deprecated
3. ❌ **Complex dynamic toolbar creation** - Static config is simpler
4. ❌ **Separate projection files** - Keep inline unless logic is complex

---

## 📝 Summary

**Tally Cards has these features that Stock Adjustments should consider:**
- ✅ Export CSV functionality
- ✅ Inline editing for key fields
- ✅ Quick filters for common cases
- ✅ Hyperlink columns for navigation
- ✅ Visual status indicators
- ✅ Dynamic toolbar showing active filters/sorts

**Stock Adjustments should avoid:**
- ❌ Custom form components (stick with FormIsland)
- ❌ Old Templete folder pattern
- ❌ Complex projection files (keep inline)
- ❌ Over-engineered dynamic toolbars

---

**Last Updated:** 2025-01-27
