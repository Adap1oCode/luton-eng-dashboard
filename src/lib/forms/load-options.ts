// ---------------------------------------------------------------------------
// lib/forms/load-options.ts
// ---------------------------------------------------------------------------
// Server-side utility to load dropdown options from resources.
// Transforms resource data into Option[] format for form dropdowns.

import { performance } from "perf_hooks";

import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { OPTIONS_PROVIDERS } from "./options-providers";
import type { ResolvedOptions, Option } from "./types";

/**
 * Loads options for the given optionsKeys.
 * 
 * Fetches data from resources in parallel, transforms to Option[] format,
 * and returns a ResolvedOptions object mapping each key to its options.
 * 
 * **CRITICAL**: 
 * - `id` field = UUID from database (saved to form field)
 * - `label` field = Display name shown in dropdown
 * 
 * @param keys - Array of optionsKey strings (e.g., ["warehouses", "items"])
 * @param currentValues - Optional map of current field values (for edit pages) to ensure they're included
 * @param dynamicFilters - Optional map of dynamic filters per optionsKey (e.g., { warehouseLocations: { warehouse_id: "..." } })
 * @returns Promise resolving to ResolvedOptions object
 * 
 * @example
 * ```typescript
 * const options = await loadOptions(["warehouses"]);
 * // Returns: { warehouses: [{ id: "uuid-1", label: "Warehouse 1" }, ...] }
 * 
 * // For edit pages, ensure current values are included:
 * const options = await loadOptions(["items"], { item_number: 5056827328174 });
 * 
 * // With dynamic filters (e.g., filter locations by warehouse):
 * const options = await loadOptions(["warehouseLocations"], undefined, { warehouseLocations: { warehouse_id: "uuid-123" } });
 * ```
 */
export async function loadOptions(
  keys: string[],
  currentValues?: Record<string, any>,
  dynamicFilters?: Record<string, Record<string, any>>
): Promise<ResolvedOptions> {
  const perfStart = performance.now();
  console.log(`[loadOptions] Called with keys:`, keys);
  const results: ResolvedOptions = {};

  // Load all options in parallel for better performance
  await Promise.all(
    keys.map(async (key) => {
      const keyStart = performance.now();
      const provider = OPTIONS_PROVIDERS[key];
      
      if (!provider) {
        console.warn(`[loadOptions] No provider config found for key: ${key}`);
        results[key] = [];
        return;
      }

      try {
        // Handle static options (e.g., reason codes from config)
        if (provider.staticOptions) {
          const staticOpts = await provider.staticOptions();
          console.log(`[loadOptions] Loaded ${staticOpts.length} static options for "${key}"`);
          results[key] = staticOpts;
          return;
        }

        // Build extraQuery with filters only
        // Note: Sort is handled by the provider's defaultSort config, not via query params
        const extraQuery: Record<string, any> = {
          ...provider.filter, // Static filter from provider config
        };
        
        // Add dynamic filters if provided for this key
        if (dynamicFilters && dynamicFilters[key]) {
          Object.assign(extraQuery, dynamicFilters[key]);
        }
        
        console.log(`[loadOptions] DEBUG: Provider filter:`, provider.filter, `Dynamic filters:`, dynamicFilters?.[key], `Using extraQuery:`, extraQuery);

        console.log(`[loadOptions] Loading options for key "${key}":`, {
          resourceKey: provider.resourceKey,
          endpoint: `/api/${provider.resourceKey}`,
          extraQuery,
        });

        // Fetch from resource API endpoint
        const fetchStart = performance.now();
        const result = await fetchResourcePage<any>({
          endpoint: `/api/${provider.resourceKey}`,
          page: 1,
          pageSize: 500, // Reasonable limit for dropdowns (not too large)
          extraQuery,
        });
        const fetchEnd = performance.now();
        console.log(`[loadOptions] Fetched ${provider.resourceKey} (${key}): ${(fetchEnd - fetchStart).toFixed(2)}ms`);

        const { rows, total } = result;
        console.log(`[loadOptions] Fetched ${rows?.length ?? 0} rows (total: ${total}) for "${key}":`, {
          endpoint: `/api/${provider.resourceKey}`,
          extraQuery,
          rows: rows?.slice(0, 3),
          fullResult: result,
        });

        // Transform to Option[] format
        // CRITICAL: id is converted to string (UUID or bigint), label is for display only
        // For SearchableSelect: include itemNumber/description for items, code/name for warehouses
        const options: Option[] = provider.transform
          ? rows.map(provider.transform)
          : rows.map((row: any) => {
              const id = String(row[provider.idField]); // Convert to string (UUID or bigint) - saved to database
              
              // Handle labelField as string or function
              let label: string;
              if (typeof provider.labelField === "function") {
                label = provider.labelField(row);
              } else {
                label = String(row[provider.labelField] ?? row[provider.idField] ?? "");
              }

              // Add extra fields for two-column display
              const option: any = { id, label };
              
              // For items: include itemNumber and description
              if (key === "items" && row.item_number !== undefined) {
                option.itemNumber = String(row.item_number);
                option.description = row.description ?? "";
              }
              
              // For warehouses: include code and name
              if (key === "warehouses" && (row.code !== undefined || row.name !== undefined)) {
                option.code = row.code ?? "";
                option.name = row.name ?? "";
              }

              return option;
            });

        console.log(`[loadOptions] Transformed ${options.length} options for "${key}":`, options.slice(0, 3));

        // For edit pages: Ensure current value is included if it's not in the loaded options
        // This handles cases where the current item_number might not be in the first 500 results
        if (currentValues && provider.idField) {
          const currentValue = currentValues[provider.idField];
          if (currentValue != null && currentValue !== "") {
            const currentValueStr = String(currentValue);
            const alreadyIncluded = options.some((opt) => opt.id === currentValueStr);
            
            if (!alreadyIncluded) {
              console.log(`[loadOptions] Current value "${currentValueStr}" not found in loaded options for "${key}", fetching it...`);
              
              try {
                // Fetch the specific item by its ID (using the primary key field)
                const { getServerBaseUrl, getForwardedCookieHeader } = await import("@/lib/ssr/http");
                const base = await getServerBaseUrl();
                const cookieHeader = await getForwardedCookieHeader();
                
                // For items, the resource uses item_number as PK, so we fetch by that value
                const singleItemUrl = `${base}/api/${provider.resourceKey}/${encodeURIComponent(currentValueStr)}`;
                const singleItemRes = await fetch(singleItemUrl, {
                  headers: cookieHeader,
                  cache: "no-store", // Don't cache single item lookups
                });
                
                if (singleItemRes.ok) {
                  const singleItemPayload = await singleItemRes.json();
                  const singleItem = singleItemPayload?.row ?? singleItemPayload;
                  
                  if (singleItem) {
                    const singleItemId = String(singleItem[provider.idField]);
                    let singleItemLabel: string;
                    if (typeof provider.labelField === "function") {
                      singleItemLabel = provider.labelField(singleItem);
                    } else {
                      singleItemLabel = String(singleItem[provider.labelField] ?? singleItem[provider.idField] ?? "");
                    }
                    
                    // Add extra fields for two-column display
                    const singleItemOption: any = { id: singleItemId, label: singleItemLabel };
                    
                    // For items: include itemNumber and description
                    if (key === "items" && singleItem.item_number !== undefined) {
                      singleItemOption.itemNumber = String(singleItem.item_number);
                      singleItemOption.description = singleItem.description ?? "";
                    }
                    
                    // For warehouses: include code and name
                    if (key === "warehouses" && (singleItem.code !== undefined || singleItem.name !== undefined)) {
                      singleItemOption.code = singleItem.code ?? "";
                      singleItemOption.name = singleItem.name ?? "";
                    }
                    
                    // Add to the beginning of options array so it's visible
                    options.unshift(singleItemOption);
                    console.log(`[loadOptions] Added current value to options for "${key}":`, singleItemOption);
                  }
                } else {
                  console.warn(`[loadOptions] Failed to fetch current value "${currentValueStr}" for "${key}":`, singleItemRes.status);
                }
              } catch (err) {
                console.error(`[loadOptions] Error fetching current value "${currentValueStr}" for "${key}":`, err);
                // Continue without the current value - user can still select from available options
              }
            } else {
              console.log(`[loadOptions] Current value "${currentValueStr}" already included in options for "${key}"`);
            }
          }
        }

        results[key] = options;
        const keyEnd = performance.now();
        console.log(`[loadOptions] Completed ${key}: ${(keyEnd - keyStart).toFixed(2)}ms`);
      } catch (error) {
        console.error(`[loadOptions] Failed to load options for key "${key}":`, error);
        // Continue loading other options even if one fails
        results[key] = [];
      }
    })
  );

  const perfEnd = performance.now();
  console.log(`[loadOptions] Total time: ${(perfEnd - perfStart).toFixed(2)}ms`);
  console.log(`[loadOptions] Final results:`, Object.keys(results).map(k => ({ key: k, count: results[k].length })));
  return results;
}

