// ---------------------------------------------------------------------------
// lib/forms/load-options.ts
// ---------------------------------------------------------------------------
// Server-side utility to load dropdown options from resources.
// Transforms resource data into Option[] format for form dropdowns.

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
 * @returns Promise resolving to ResolvedOptions object
 * 
 * @example
 * ```typescript
 * const options = await loadOptions(["warehouses"]);
 * // Returns: { warehouses: [{ id: "uuid-1", label: "Warehouse 1" }, ...] }
 * ```
 */
export async function loadOptions(keys: string[]): Promise<ResolvedOptions> {
  console.log(`[loadOptions] Called with keys:`, keys);
  const results: ResolvedOptions = {};

  // Load all options in parallel for better performance
  await Promise.all(
    keys.map(async (key) => {
      const provider = OPTIONS_PROVIDERS[key];
      
      if (!provider) {
        console.warn(`[loadOptions] No provider config found for key: ${key}`);
        results[key] = [];
        return;
      }

      try {
        // Build extraQuery with filters only
        // Note: Sort is handled by the provider's defaultSort config, not via query params
        const extraQuery: Record<string, any> = {
          ...provider.filter, // Re-enable filter now that we're fixing the API issue
        };
        
        console.log(`[loadOptions] DEBUG: Provider filter:`, provider.filter, `Using extraQuery:`, extraQuery);

        console.log(`[loadOptions] Loading options for key "${key}":`, {
          resourceKey: provider.resourceKey,
          endpoint: `/api/${provider.resourceKey}`,
          extraQuery,
        });

        // Fetch from resource API endpoint
        const result = await fetchResourcePage<any>({
          endpoint: `/api/${provider.resourceKey}`,
          page: 1,
          pageSize: 500, // Reasonable limit for dropdowns (not too large)
          extraQuery,
        });

        const { rows, total } = result;
        console.log(`[loadOptions] Fetched ${rows?.length ?? 0} rows (total: ${total}) for "${key}":`, {
          endpoint: `/api/${provider.resourceKey}`,
          extraQuery,
          rows: rows?.slice(0, 3),
          fullResult: result,
        });

        // Transform to Option[] format
        // CRITICAL: id must be UUID, label is for display only
        const options: Option[] = provider.transform
          ? rows.map(provider.transform)
          : rows.map((row: any) => {
              const id = String(row[provider.idField]); // UUID - saved to database
              
              // Handle labelField as string or function
              let label: string;
              if (typeof provider.labelField === "function") {
                label = provider.labelField(row);
              } else {
                label = String(row[provider.labelField] ?? row[provider.idField] ?? "");
              }

              return { id, label };
            });

        console.log(`[loadOptions] Transformed ${options.length} options for "${key}":`, options.slice(0, 3));
        results[key] = options;
      } catch (error) {
        console.error(`[loadOptions] Failed to load options for key "${key}":`, error);
        // Continue loading other options even if one fails
        results[key] = [];
      }
    })
  );

  console.log(`[loadOptions] Final results:`, Object.keys(results).map(k => ({ key: k, count: results[k].length })));
  return results;
}

