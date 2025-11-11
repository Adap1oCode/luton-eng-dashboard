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

type ReasonCodeType = "UNSPECIFIED" | "DAMAGE" | "LOST" | "FOUND" | "TRANSFER" | "COUNT_CORRECTION" | "ADJUSTMENT" | "OTHER";
const ALLOWED_REASON_CODES = new Set<ReasonCodeType>(STOCK_ADJUSTMENT_REASON_CODES.map((code) => code.value as ReasonCodeType));

import { stockAdjustmentCreateConfig } from "../../new/form.config";

export default async function EditStockAdjustmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use cfg.key as the resource path segment (you set this to "stock-adjustments")
  const resourceKey = stockAdjustmentCreateConfig.key;
  const isDev = process.env.NODE_ENV !== "production";
  const { createClient } = await import("@/lib/supabase-server");
  const sb = await createClient();
  let anchorTallyCardNumber: string | undefined;

  // For SCD2, we need to find the latest entry_id for this tally_card_number
  // The view only shows the latest entry, so if the id in URL is not the latest,
  // we need to find the latest one
  let entryIdToUse = id;
  try {
    // First, get the tally_card_number for this entry
    const { data: entryData } = await sb
      .from("tcm_user_tally_card_entries")
      .select("tally_card_number")
      .eq("id", id)
      .maybeSingle();
    
    anchorTallyCardNumber = entryData?.tally_card_number ?? anchorTallyCardNumber;

    if (isDev) {
      console.log("[EditStockAdjustmentPage] Entry lookup:", {
        url_id: id,
        found_entry: !!entryData,
        tally_card_number: entryData?.tally_card_number,
      });
    }
    
    if (entryData?.tally_card_number) {
      // Find the latest entry_id for this tally_card_number
      // Use updated_at DESC, then id DESC as tiebreaker (newer IDs are typically created later)
      const { data: latestEntry } = await sb
        .from("tcm_user_tally_card_entries")
        .select("id, updated_at")
        .eq("tally_card_number", entryData.tally_card_number)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })  // Tiebreaker: if updated_at is same, use newest ID
        .limit(1)
        .maybeSingle();
      
      if (isDev) {
        console.log("[EditStockAdjustmentPage] Latest entry lookup:", {
          tally_card_number: entryData.tally_card_number,
          latest_id: latestEntry?.id,
          latest_updated_at: latestEntry?.updated_at,
          url_id: id,
          ids_match: latestEntry?.id === id,
        });
      }
      
      if (latestEntry?.id) {
        entryIdToUse = latestEntry.id;
        if (latestEntry.id !== id && isDev) {
          console.log("[EditStockAdjustmentPage] Using latest entry ID instead of URL ID:", {
            url_id: id,
            latest_id: latestEntry.id,
          });
        }
      }
    }
  } catch (err) {
    // If we can't find the latest, use the original id
    if (isDev) {
      console.warn("[EditStockAdjustmentPage] Failed to find latest entry_id, using provided id:", err);
    }
  }

  if (isDev) {
    console.log("[EditStockAdjustmentPage] Final entryIdToUse:", entryIdToUse);
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
    if (isDev) {
      console.warn("Failed to resolve resource for history config:", err);
    }
  }

  // Extract optionsKeys from form config and load options server-side
  const optionsKeys = extractOptionsKeys(stockAdjustmentCreateConfig);
  
  // Get warehouse_id from tally card to filter locations
  let warehouseId: string | undefined;
  try {
    const tallyCardNumberRaw = prep.defaults?.tally_card_number ?? anchorTallyCardNumber;
    const tallyCardNumberValue =
      typeof tallyCardNumberRaw === "number"
        ? String(tallyCardNumberRaw)
        : typeof tallyCardNumberRaw === "string"
          ? tallyCardNumberRaw
          : undefined;

    if (tallyCardNumberValue) {
      const { data: tallyCard } = await sb
        .from("tcm_tally_cards")
        .select("warehouse_id")
        .eq("tally_card_number", tallyCardNumberValue)
        .maybeSingle();

      if (tallyCard?.warehouse_id) {
        warehouseId = String(tallyCard.warehouse_id);
        if (isDev) {
          console.log("[EditStockAdjustmentPage] Found warehouse_id for filtering locations:", warehouseId);
        }
      }
    }
  } catch (err) {
    if (isDev) {
      console.warn("[EditStockAdjustmentPage] Failed to fetch warehouse_id for location filtering:", err);
    }
  }
  
  // Load options with warehouse filter for locations
  const dynamicFilters = warehouseId 
    ? { warehouseLocations: { warehouse_id: warehouseId } }
    : undefined;
  const loadedOptions = await loadOptions(optionsKeys, undefined, dynamicFilters);

  // Ensure defaults include locations array if multi_location is true
  const defaults = prep.defaults ?? {};
  
  // Debug: Log what we got from the API
  if (isDev) {
    console.log("[EditStockAdjustmentPage] Loaded defaults:", {
      id: entryIdToUse,
      qty: defaults.qty,
      location: defaults.location,
      multi_location: defaults.multi_location,
      hasLocations: !!defaults.locations,
      locationsCount: defaults.locations?.length || 0,
    });
  }
  
  if (defaults.multi_location) {
    try {
      const tallyCardValue = defaults.tally_card_number ?? anchorTallyCardNumber;
      const tallyCardNumber =
        typeof tallyCardValue === "number"
          ? String(tallyCardValue)
          : typeof tallyCardValue === "string" && tallyCardValue.length > 0
            ? tallyCardValue
            : undefined;

      let targetEntryIds: string[] = [entryIdToUse];

      if (!tallyCardNumber) {
        const { data: entryData } = await sb
          .from("tcm_user_tally_card_entries")
          .select("tally_card_number")
          .eq("id", entryIdToUse)
          .maybeSingle();

        if (entryData?.tally_card_number) {
          targetEntryIds = [entryIdToUse];
          const { data: relatedEntries } = await sb
            .from("tcm_user_tally_card_entries")
            .select("id")
            .eq("tally_card_number", entryData.tally_card_number)
            .order("updated_at", { ascending: false })
            .order("id", { ascending: false });

          if (relatedEntries && relatedEntries.length > 0) {
            targetEntryIds = Array.from(new Set([entryIdToUse, ...relatedEntries.map((entry) => entry.id)]));
          }
        }
      } else {
        const { data: relatedEntries } = await sb
          .from("tcm_user_tally_card_entries")
          .select("id")
          .eq("tally_card_number", tallyCardNumber)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false });

        if (relatedEntries && relatedEntries.length > 0) {
          targetEntryIds = Array.from(new Set([entryIdToUse, ...relatedEntries.map((entry) => entry.id)]));
        }
      }

      let locationsData: Array<{ id: string; entry_id: string; location: string; qty: number; pos: number | null }> =
        [];
      if (targetEntryIds.length > 0) {
        const { data: fetchedLocations } = await sb
          .from("tcm_user_tally_card_entry_locations")
          .select("id, entry_id, location, qty, pos")
          .in("entry_id", targetEntryIds)
          .order("entry_id", { ascending: false })
          .order("pos", { ascending: true });

        if (fetchedLocations && fetchedLocations.length > 0) {
          for (const candidateId of targetEntryIds) {
            const candidateLocations = fetchedLocations.filter((loc) => loc.entry_id === candidateId);
            if (candidateLocations.length > 0) {
              locationsData = candidateLocations;
              break;
            }
          }
        }
      }

      defaults.locations =
        locationsData?.map((loc: any, idx: number) => ({
          id: loc.id || `temp-${idx}`,
          location: loc.location,
          qty: loc.qty,
          pos: loc.pos ?? (idx + 1),
        })) ?? [];
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
    const normalizedReason = String(defaults.reason_code).toUpperCase() as ReasonCodeType;
    const validReason: ReasonCodeType = ALLOWED_REASON_CODES.has(normalizedReason) 
      ? normalizedReason
      : DEFAULT_REASON_CODE;
    defaults.reason_code = validReason;
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
