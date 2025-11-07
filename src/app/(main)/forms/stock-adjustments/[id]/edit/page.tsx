// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx
// TYPE: Server Component (thin wrapper)
// PURPOSE: Use shared form SSR wrapper to render the Edit screen with transport-only config.
// -----------------------------------------------------------------------------

import React from "react";

import { notFound } from "next/navigation";

import ResourceFormSSRPage from "@/components/forms/form-view/resource-form-ssr-page";
import { getRecordForEdit } from "@/lib/forms/get-record-for-edit";
import { resolveResource } from "@/lib/api/resolve-resource";
import { extractOptionsKeys } from "@/lib/forms/extract-options-keys";
import { loadOptions } from "@/lib/forms/load-options";
import EditPageClient from "../../components/edit-page-client";
import SubmitButtonWithState from "../../components/submit-button-with-state";
import { DEFAULT_REASON_CODE, STOCK_ADJUSTMENT_REASON_CODES } from "@/lib/config/stock-adjustment-reason-codes";

const ALLOWED_REASON_CODES = new Set(STOCK_ADJUSTMENT_REASON_CODES.map((code) => code.value));

import { stockAdjustmentCreateConfig } from "../../new/form.config";

export default async function EditStockAdjustmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use cfg.key as the resource path segment (you set this to "stock-adjustments")
  const resourceKey = stockAdjustmentCreateConfig.key;

  // For SCD2, we need to find the latest entry_id for this tally_card_number
  // The view only shows the latest entry, so if the id in URL is not the latest,
  // we need to find the latest one
  let entryIdToUse = id;
  try {
    const { createClient } = await import("@/lib/supabase-server");
    const sb = await createClient();
    
    // First, get the tally_card_number for this entry
    const { data: entryData } = await sb
      .from("tcm_user_tally_card_entries")
      .select("tally_card_number")
      .eq("id", id)
      .maybeSingle();
    
    if (entryData?.tally_card_number) {
      // Find the latest entry_id for this tally_card_number
      const { data: latestEntry } = await sb
        .from("tcm_user_tally_card_entries")
        .select("id")
        .eq("tally_card_number", entryData.tally_card_number)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (latestEntry?.id) {
        entryIdToUse = latestEntry.id;
      }
    }
  } catch (err) {
    // If we can't find the latest, use the original id
    console.warn("Failed to find latest entry_id, using provided id:", err);
  }

  let prep: any;
  try {
    prep = await getRecordForEdit(stockAdjustmentCreateConfig, resourceKey, entryIdToUse);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("404") || String(err).includes("Not found")) {
      return notFound();
    }
    throw new Error(`Failed to load stock adjustment ${entryIdToUse}: ${String(err?.message ?? err)}`);
  }

  const formId = "stock-adjustment-form";

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
  const optionsKeys = extractOptionsKeys(stockAdjustmentCreateConfig);
  const loadedOptions = await loadOptions(optionsKeys);

  // Ensure defaults include locations array if multi_location is true
  const defaults = prep.defaults ?? {};
  
  // Debug: Log what we got from the API
  console.log("[EditStockAdjustmentPage] Loaded defaults:", {
    id: entryIdToUse,
    qty: defaults.qty,
    location: defaults.location,
    multi_location: defaults.multi_location,
    hasLocations: !!defaults.locations,
    locationsCount: defaults.locations?.length || 0,
  });
  
  if (defaults.multi_location) {
    // Load locations server-side for multi_location entries
    // First try the latest entry_id, but if no locations found, try finding them by tally_card_number
    try {
      const { createClient } = await import("@/lib/supabase-server");
      const sb = await createClient();
      
      // Try to get locations for the latest entry_id
      let { data: locationsData } = await sb
        .from("tcm_user_tally_card_entry_locations")
        .select("id, location, qty, pos")
        .eq("entry_id", entryIdToUse)
        .order("pos", { ascending: true });
      
      // If no locations found for latest entry_id, find all entry_ids for this tally_card_number
      // and get locations from the most recent one that has locations
      if (!locationsData || locationsData.length === 0) {
        const { data: entryData } = await sb
          .from("tcm_user_tally_card_entries")
          .select("tally_card_number")
          .eq("id", entryIdToUse)
          .maybeSingle();
        
        if (entryData?.tally_card_number) {
          // Get all entry_ids for this tally_card_number, ordered by updated_at DESC
          const { data: allEntries } = await sb
            .from("tcm_user_tally_card_entries")
            .select("id")
            .eq("tally_card_number", entryData.tally_card_number)
            .order("updated_at", { ascending: false });
          
          // Try each entry_id until we find one with locations
          if (allEntries) {
            for (const entry of allEntries) {
              const { data: locs } = await sb
                .from("tcm_user_tally_card_entry_locations")
                .select("id, location, qty, pos")
                .eq("entry_id", entry.id)
                .order("pos", { ascending: true });
              
              if (locs && locs.length > 0) {
                locationsData = locs;
                console.log(`[EditStockAdjustmentPage] Found locations for entry_id ${entry.id} (not latest)`);
                break;
              }
            }
          }
        }
      }
      
      defaults.locations = locationsData?.map((loc: any, idx: number) => ({
        id: loc.id || `temp-${idx}`,
        location: loc.location,
        qty: loc.qty,
        pos: loc.pos ?? (idx + 1),
      })) || [];
      
      console.log("[EditStockAdjustmentPage] Loaded locations:", defaults.locations.length);
    } catch (err) {
      console.warn("Failed to load locations server-side:", err);
      defaults.locations = [];
    }
  } else if (!defaults.multi_location) {
    defaults.locations = [];
  }
  
  // Ensure qty and location are set from defaults (they should already be there from the API)
  // But make sure they're not null/undefined which would cause form to show empty
  if (defaults.multi_location) {
    // For multi_location, qty and location should be aggregated values from parent
    // They should already be set, but ensure they're not null
    if (defaults.qty === null || defaults.qty === undefined) {
      // Calculate from locations if available
      const totalQty = defaults.locations?.reduce((sum: number, loc: any) => sum + (loc.qty || 0), 0) || 0;
      defaults.qty = totalQty;
    }
    if (defaults.location === null || defaults.location === undefined || defaults.location === "") {
      // Calculate from locations if available
      const locationsText = defaults.locations?.map((loc: any) => loc.location).filter(Boolean).join(", ") || null;
      defaults.location = locationsText;
    }
  }
  if (defaults.reason_code) {
    const normalizedReason = String(defaults.reason_code).toUpperCase();
    defaults.reason_code = ALLOWED_REASON_CODES.has(normalizedReason) ? normalizedReason : DEFAULT_REASON_CODE;
  } else {
    defaults.reason_code = DEFAULT_REASON_CODE;
  }

  const primaryButtonPermissions = {
    any: ["resource:tcm_user_tally_card_entries:update"]
  };

  return (
    <ResourceFormSSRPage
      title="Edit Stock Adjustment"
      headerDescription={stockAdjustmentCreateConfig.subtitle}
      formId={formId}
      config={transportConfig}
      defaults={defaults}
      options={loadedOptions}
      cancelHref={`/forms/${resourceKey}`}
      primaryLabel={transportConfig.submitLabel}
      primaryButtonPermissions={primaryButtonPermissions}
      customSubmitButton={
        <SubmitButtonWithState
          formId={formId}
          label={transportConfig.submitLabel}
          permissions={primaryButtonPermissions}
        />
      }
    >
      <EditPageClient
        resourceKey={resourceKey}
        recordId={entryIdToUse}
        formId={formId}
        formConfig={transportConfig}
        formDefaults={defaults}
        formOptions={loadedOptions}
        entryId={entryIdToUse}
        action={`/api/${resourceKey}/${entryIdToUse}/actions/patch-scd2`}
        method={transportConfig.method as "POST" | "PATCH"}
        submitLabel={transportConfig.submitLabel}
        historyUI={historyUI}
      />
    </ResourceFormSSRPage>
  );
}
