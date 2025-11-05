// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally-cards/[id]/edit/page.tsx
// TYPE: Server Component (thin wrapper)
// PURPOSE: Use shared form SSR wrapper to render the Edit screen with transport-only config.
// -----------------------------------------------------------------------------

import React from "react";

import { notFound } from "next/navigation";

import ResourceFormSSRPage from "@/components/forms/form-view/resource-form-ssr-page";
import EditWithTabs from "@/components/history/edit-with-tabs";
import FormIsland from "@/components/forms/shell/form-island";
import { getRecordForEdit } from "@/lib/forms/get-record-for-edit";
import { resolveResource } from "@/lib/api/resolve-resource";
import { extractOptionsKeys } from "@/lib/forms/extract-options-keys";
import { loadOptions } from "@/lib/forms/load-options";

import { tallyCardCreateConfig } from "../../new/form.config";

export default async function EditTallyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use cfg.key as the resource path segment (you set this to "tally-cards")
  const resourceKey = tallyCardCreateConfig.key;

  let prep: any;
  try {
    prep = await getRecordForEdit(tallyCardCreateConfig, resourceKey, id);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("404") || String(err).includes("Not found")) {
      return notFound();
    }
    throw new Error(`Failed to load tally card ${id}: ${String(err?.message ?? err)}`);
  }

  const formId = "tally-card-form";

  // Ensure only serializable config crosses to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = prep?.clientConfig ?? {};

  const transportConfig = {
    ...clientConfig,
    // SCD2: call the custom RPC-backed endpoint
    method: "POST",
    action: `/api/${resourceKey}/${id}/actions/patch-scd2`,
    submitLabel: "Update",
  };

  // Resolve resource config to get history UI config
  let historyUI;
  try {
    const resolved = await resolveResource(resourceKey);
    historyUI = resolved.config.history?.ui;
  } catch (err) {
    // If resource resolution fails, historyUI will be undefined (graceful degradation)
    console.warn("Failed to resolve resource for history config:", err);
  }

  // Extract optionsKeys from form config and load options server-side
  const optionsKeys = extractOptionsKeys(tallyCardCreateConfig);
  console.log(`[EditTallyCardPage] Extracted optionsKeys:`, optionsKeys);
  
  // CRITICAL: Check if optionsKeys is empty or missing "warehouses"
  if (!optionsKeys || optionsKeys.length === 0) {
    console.error(`[EditTallyCardPage] ERROR: No optionsKeys extracted!`);
  }
  if (!optionsKeys.includes("warehouses")) {
    console.error(`[EditTallyCardPage] ERROR: "warehouses" not in optionsKeys!`, optionsKeys);
  }
  
  const loadedOptions = await loadOptions(optionsKeys);
  console.log(`[EditTallyCardPage] Loaded options:`, {
    keys: Object.keys(loadedOptions),
    fullOptions: JSON.stringify(loadedOptions, null, 2),
    counts: Object.keys(loadedOptions).map(k => ({ key: k, count: loadedOptions[k]?.length ?? 0, sample: loadedOptions[k]?.slice(0, 2) })),
    // CRITICAL CHECK
    hasWarehouses: 'warehouses' in loadedOptions,
    warehousesIsArray: Array.isArray(loadedOptions.warehouses),
    warehousesLength: loadedOptions.warehouses?.length ?? 0
  });
  
  // EMERGENCY: If warehouses is missing, log error and try to load directly
  if (!loadedOptions.warehouses || loadedOptions.warehouses.length === 0) {
    console.error(`[EditTallyCardPage] CRITICAL ERROR: warehouses not loaded!`);
    console.error(`[EditTallyCardPage] loadedOptions keys:`, Object.keys(loadedOptions));
    console.error(`[EditTallyCardPage] loadedOptions full:`, JSON.stringify(loadedOptions, null, 2));
  }

  // Merge loaded options with prep.options (which contains { id })
  // IMPORTANT: loadedOptions must come LAST to override any conflicts
  // This ensures our loaded warehouse options take precedence
  const options = { 
    ...(prep.options ?? {}), 
    ...loadedOptions 
  };
  
  // Verify the merge worked
  console.log(`[EditTallyCardPage] Final merged options:`, {
    keys: Object.keys(options),
    hasWarehouses: 'warehouses' in options,
    warehousesCount: Array.isArray(options.warehouses) ? options.warehouses.length : 'not-array',
    prepOptions: prep.options,
    loadedOptionsKeys: Object.keys(loadedOptions),
    // Verify serializability
    canSerialize: (() => {
      try {
        JSON.stringify(options);
        return true;
      } catch (e) {
        return false;
      }
    })()
  });

  // CRITICAL: Ensure options are properly structured for React Server Component serialization
  // React Server Components can have issues with complex nested objects
  // Make sure warehouses is a plain array
  const serializedOptions: Record<string, any> = {
    ...(prep.options ?? {}),
  };
  
  // Explicitly add each loaded option to ensure it's serialized correctly
  for (const [key, value] of Object.entries(loadedOptions)) {
    serializedOptions[key] = Array.isArray(value) ? [...value] : value;
  }

  console.log(`[EditTallyCardPage] Serialized options final check:`, {
    keys: Object.keys(serializedOptions),
    warehousesPresent: 'warehouses' in serializedOptions,
    warehousesType: Array.isArray(serializedOptions.warehouses) ? 'array' : typeof serializedOptions.warehouses,
    warehousesLength: Array.isArray(serializedOptions.warehouses) ? serializedOptions.warehouses.length : 'N/A',
    serializedString: JSON.stringify(serializedOptions).substring(0, 200) + '...',
    // FULL SERIALIZED OPTIONS - check what's actually there
    fullSerializedOptions: JSON.stringify(serializedOptions, null, 2)
  });

  // CRITICAL CHECK: Verify warehouses before passing to EditWithTabs
  const warehouses = serializedOptions?.warehouses;
  
  console.log(`[EditTallyCardPage] About to render, warehouses:`, {
    hasWarehouses: 'warehouses' in serializedOptions,
    warehousesValue: warehouses,
    warehousesType: typeof warehouses,
    warehousesIsArray: Array.isArray(warehouses),
    warehousesLength: warehouses?.length,
    serializedOptionsKeys: Object.keys(serializedOptions),
    // Check what prep.options contains
    prepOptionsId: prep.options?.id,
    // Check loadedOptions directly
    loadedOptionsKeys: Object.keys(loadedOptions),
    loadedOptionsHasWarehouses: 'warehouses' in loadedOptions,
    loadedOptionsWarehousesLength: loadedOptions.warehouses?.length
  });

  // EMERGENCY: If warehouses is still undefined, try passing loadedOptions directly
  const finalOptions = serializedOptions;
  if (!finalOptions.warehouses && loadedOptions.warehouses) {
    console.error(`[EditTallyCardPage] ERROR: warehouses missing in serializedOptions but present in loadedOptions!`);
    console.error(`[EditTallyCardPage] Forcing warehouses into finalOptions`);
    finalOptions.warehouses = loadedOptions.warehouses;
  }

  return (
    <ResourceFormSSRPage
      title="Edit Tally Card"
      headerDescription={tallyCardCreateConfig.subtitle}
      formId={formId}
      config={transportConfig}
      defaults={prep.defaults ?? {}}
      options={serializedOptions}
      cancelHref={`/forms/${resourceKey}`}
      primaryLabel="Update"
      primaryButtonPermissions={{
        any: ["resource:tcm_tally_cards:update"]
      }}
    >
      <EditWithTabs
        resourceKey={resourceKey}
        recordId={id}
        formConfig={transportConfig}
        formDefaults={prep.defaults ?? {}}
        formOptions={finalOptions}
        formId={formId}
        historyUI={historyUI}
      />
    </ResourceFormSSRPage>
  );
}
