# Configurable Dropdown Options System - Implementation Plan

## Current State

### What Exists
- Form config supports `optionsKey: "warehouses"` in field definitions
- `DynamicField` component renders select dropdowns when `options` are provided
- `ResolvedOptions` type: `Record<string, Option[]>` where `Option = { id: string; label: string }`
- Options are passed to `FormIsland` and `DynamicForm` but currently empty `{}`

### What's Missing
- No mechanism to load options from resources based on `optionsKey`
- No mapping from `optionsKey` to resource endpoint
- No transformation of resource data to `Option[]` format
- No configuration for which fields to use as `id` and `label`

## Goals

1. **Warehouse Dropdown** - Load from `/api/warehouses` and display as dropdown
2. **Item Number Dropdown** - Future: Load from inventory/items API
3. **Configurable System** - Easy to extend to other fields/resources
4. **Server-Side Loading** - Load options during SSR for better UX
5. **Scoping Support** - Respect warehouse/user scoping if needed

## Proposed Architecture

### 1. Options Provider Registry

Create a registry that maps `optionsKey` to configuration for loading options:

```typescript
// src/lib/forms/options-providers.ts

export type OptionProviderConfig = {
  resourceKey: string;           // e.g., "warehouses"
  idField: string;               // Field to use as option.id, e.g., "id"
  labelField: string;            // Field to use as option.label, e.g., "name" or "code"
  filter?: Record<string, any>; // Optional filters (e.g., { is_active: true })
  transform?: (row: any) => Option; // Optional custom transform function
};

export const OPTIONS_PROVIDERS: Record<string, OptionProviderConfig> = {
  warehouses: {
    resourceKey: "warehouses",
    idField: "id",
    labelField: "name", // or could be "code" or combine both
    filter: { is_active: true }, // Only active warehouses
    // Optional: transform to combine code + name
    // transform: (row) => ({ id: row.id, label: `${row.code} - ${row.name}` })
  },
  // Future: items, users, etc.
};
```

### 2. Options Loader Utility

Create a server-side utility to load options based on provider config:

```typescript
// src/lib/forms/load-options.ts

export async function loadOptions(
  optionsKeys: string[],
  filters?: Record<string, any>
): Promise<ResolvedOptions> {
  const results: ResolvedOptions = {};
  
  await Promise.all(
    optionsKeys.map(async (key) => {
      const provider = OPTIONS_PROVIDERS[key];
      if (!provider) {
        console.warn(`No options provider found for key: ${key}`);
        return;
      }
      
      // Fetch from resource API
      const { rows } = await fetchResourcePage({
        endpoint: `/api/${provider.resourceKey}`,
        page: 1,
        pageSize: 1000, // Large page size for dropdowns
        extraQuery: {
          ...provider.filter,
          ...filters?.[key], // Allow per-key filters
          activeOnly: true, // If supported by resource
        },
      });
      
      // Transform to Option format
      // CRITICAL: id must be the UUID, label is for display only
      const options = provider.transform
        ? rows.map(provider.transform)
        : rows.map((row: any) => {
            const id = String(row[provider.idField]); // UUID - saved to database
            const label = String(row[provider.labelField] ?? row[provider.idField]); // Display only
            return { id, label };
          });
      
      results[key] = options;
    })
  );
  
  return results;
}
```

### 3. Extract Options Keys from Config

Utility to extract all `optionsKey` values from form config:

```typescript
// src/lib/forms/extract-options-keys.ts

export function extractOptionsKeys(config: FormConfig): string[] {
  const keys = new Set<string>();
  
  const fields = getAllFields(config);
  fields.forEach((field) => {
    if (field.optionsKey) {
      keys.add(field.optionsKey);
    }
  });
  
  return Array.from(keys);
}
```

### 4. Update New Page

Modify new page to load options:

```typescript
// src/app/(main)/forms/tally-cards/new/page.tsx

import { loadOptions } from "@/lib/forms/load-options";
import { extractOptionsKeys } from "@/lib/forms/extract-options-keys";

export default async function NewTallyCardPage() {
  const cfg = ensureSections(tallyCardCreateConfig);
  const defaults = buildDefaults({ ...cfg, fields: getAllFields(cfg) } as any);
  
  // Extract and load options
  const optionsKeys = extractOptionsKeys(cfg);
  const options = await loadOptions(optionsKeys);
  
  // ... rest of the code
}
```

### 5. Update Edit Page

Modify edit page to load options:

```typescript
// src/app/(main)/forms/tally-cards/[id]/edit/page.tsx

// In getRecordForEdit or directly in page
const optionsKeys = extractOptionsKeys(tallyCardCreateConfig);
const options = await loadOptions(optionsKeys);

// Pass to ResourceFormSSRPage
<ResourceFormSSRPage
  options={options}
  // ...
/>
```

### 6. Update getRecordForEdit (Optional Enhancement)

Could enhance `getRecordForEdit` to automatically load options:

```typescript
// src/lib/forms/get-record-for-edit.ts

export async function getRecordForEdit(
  cfgInput: any,
  resourceKey: string,
  id: string
): Promise<EditPrepResult & { options?: ResolvedOptions }> {
  // ... existing code ...
  
  // Auto-load options if config has optionsKey fields
  const optionsKeys = extractOptionsKeys(cfg);
  const options = await loadOptions(optionsKeys);
  
  return {
    // ... existing return ...
    options,
  };
}
```

## Implementation Steps

### Phase 1: Core Infrastructure (Warehouse Only)

1. **Create Options Provider Registry** (`src/lib/forms/options-providers.ts`)
   - Define `OptionProviderConfig` type
   - Create `OPTIONS_PROVIDERS` registry
   - Add warehouse configuration

2. **Create Options Loader** (`src/lib/forms/load-options.ts`)
   - Implement `loadOptions()` function
   - Use `fetchResourcePage` to load data with reasonable pageSize (100-500)
   - **CRITICAL**: Transform to `Option[]` format ensuring:
     - `id` = UUID from database (e.g., `row.id`)
     - `label` = Display name (e.g., `row.name` or `row.code`)
   - Support caching for performance
   - Load all options in parallel with `Promise.all`

3. **Create Options Key Extractor** (`src/lib/forms/extract-options-keys.ts`)
   - Extract `optionsKey` from all fields in config

4. **Update Tally Cards New Page**
   - Load options server-side
   - Pass to `FormIsland`

5. **Update Tally Cards Edit Page**
   - Load options server-side
   - Pass to `ResourceFormSSRPage`

### Phase 2: Enhanced Configuration

6. **Support Label Combinations**
   - Allow `labelField` to be a function or template string
   - Example: `"${code} - ${name}"` or `(row) => row.code + " - " + row.name`

7. **Support Custom Transforms**
   - Allow `transform` function in provider config
   - For complex label formatting

8. **Support Filtering**
   - Per-provider filters (e.g., `is_active: true`)
   - Dynamic filters passed to `loadOptions()`

### Phase 3: Item Number Dropdown

9. **Add Item Number Provider**
   - Configure inventory/items resource
   - Map item_number field to dropdown
   - Update form config to use `optionsKey: "items"`

## Files to Create/Modify

### New Files
- `src/lib/forms/options-providers.ts` - Provider registry
- `src/lib/forms/load-options.ts` - Options loader utility
- `src/lib/forms/extract-options-keys.ts` - Config parser

### Files to Modify
- `src/app/(main)/forms/tally-cards/new/page.tsx` - Load options
- `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx` - Load options
- `src/lib/forms/get-record-for-edit.ts` - (Optional) Auto-load options

## Configuration Examples

### Warehouse Dropdown
```typescript
// In form.config.ts - already has:
{
  name: "warehouse_id",
  kind: "select",
  optionsKey: "warehouses",
}

// In options-providers.ts:
warehouses: {
  resourceKey: "warehouses",
  idField: "id",
  labelField: "name", // or could be "code" or combine
  filter: { is_active: true },
}
```

### Item Number Dropdown (Future)
```typescript
// In form.config.ts:
{
  name: "item_number",
  kind: "select",
  optionsKey: "items",
}

// In options-providers.ts:
items: {
  resourceKey: "inventory_items", // or whatever the resource is
  idField: "item_number",
  labelField: "item_description", // or combine fields
  filter: { is_active: true },
}
```

## Critical Requirements

### ID vs Label Handling
- **CRITICAL**: The form field `warehouse_id` expects a UUID, NOT the warehouse name
- The dropdown displays the label (e.g., "RTZ - WH 1") but saves the UUID
- `DynamicField` already handles this correctly:
  - `<option value={o.id}>` - Option value is the UUID
  - `{o.label}` - Only the label is displayed
  - Form value is automatically the UUID
- Options provider must return: `{ id: "<uuid>", label: "<display name>" }`

### Performance Considerations

**Server-Side Loading Impact:**
- **Pros:**
  - No client-side loading state
  - Better SEO (if applicable)
  - Data available immediately
- **Cons:**
  - Adds to initial page load time
  - Blocks rendering until options load
  - Multiple API calls if multiple dropdowns

**Mitigation Strategies:**
1. **Caching** - Cache options (warehouses change infrequently)
2. **Reasonable Limits** - Page size 100-500 for dropdowns (not 1000+)
3. **Parallel Loading** - Load all options in parallel with `Promise.all`
4. **Client-Side Fallback** - Option to load on client if server load fails
5. **Lazy Loading** - Only load when field is visible (future enhancement)

**Expected Performance:**
- Warehouses: ~10-50 items → ~50-200ms API call → Acceptable
- Items: Potentially 1000+ items → Consider pagination/search

## Benefits

1. **Centralized Configuration** - All option providers in one place
2. **Reusable** - Easy to add new dropdowns
3. **Type-Safe** - TypeScript types for configuration
4. **Server-Side** - Better performance, no client-side loading
5. **Scoped** - Respects warehouse/user scoping automatically
6. **Flexible** - Supports custom transforms and filters
7. **ID Preservation** - Correctly saves UUIDs, displays labels

## Performance Optimization Recommendations

### Phase 1 (Initial Implementation)
- Use reasonable pageSize (100-500) for dropdowns
- Load all options in parallel with `Promise.all`
- Only load options for fields that are actually in the form

### Phase 2 (Performance Enhancements)
1. **Caching** - Cache options in memory or Redis
   - Cache key: `options:${resourceKey}:${JSON.stringify(filters)}`
   - TTL: 5-15 minutes for warehouses (low change frequency)
   - Invalidate on warehouse create/update

2. **Client-Side Fallback** - If server load fails, load on client
   - Graceful degradation
   - Show loading state in dropdown

3. **Searchable Select** - For large lists (items), use searchable select component
   - Load all options client-side
   - Filter/search on client
   - Or use API search endpoint

4. **Lazy Loading** - Load options only when field becomes visible
   - For collapsible sections
   - Use Intersection Observer

5. **Pagination for Large Lists** - For items dropdown
   - Use searchable select with API search
   - Or load first 100, lazy load more

## Potential Enhancements

1. **Caching** - Cache options for performance (see above)
2. **Search/Filter** - For large lists, add searchable select
3. **Dependent Options** - Support `dependsOn` for cascading dropdowns
4. **Client-Side Loading** - Fallback for client-side option loading
5. **Lazy Loading** - Load options only when field is visible
6. **Label Formatting** - Support combining multiple fields (e.g., "RTZ - WH 1")

