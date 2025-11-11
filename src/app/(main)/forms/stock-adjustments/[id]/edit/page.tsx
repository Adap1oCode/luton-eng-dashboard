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

type ReasonCodeType =
  | "UNSPECIFIED"
  | "DAMAGE"
  | "LOST"
  | "FOUND"
  | "TRANSFER"
  | "COUNT_CORRECTION"
  | "ADJUSTMENT"
  | "OTHER";
const ALLOWED_REASON_CODES = new Set<ReasonCodeType>(STOCK_ADJUSTMENT_REASON_CODES.map((code) => code.value as ReasonCodeType));

import { stockAdjustmentCreateConfig } from "../../new/form.config";

type RpcLocation = {
  id: string | null;
  entry_id: string | null;
  location: string | null;
  qty: number | null;
  pos: number | null;
};

export default async function EditStockAdjustmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const resourceKey = stockAdjustmentCreateConfig.key;
  const isDev = process.env.NODE_ENV !== "production";
  const { createClient } = await import("@/lib/supabase-server");
  const sb = await createClient();

  let entryIdToUse = id;
  let anchorTallyCardNumber: string | undefined;
  let warehouseIdFromLookup: string | undefined;
  let preloadedLocations: Array<{ id: string; location: string; qty: number; pos: number | null }> = [];

  try {
    const { data, error } = await sb.rpc("fn_stock_adjustment_load_edit", { p_id: id });
    if (error) {
      throw error;
    }

    const payload = Array.isArray(data) ? data?.[0] : data;
    if (payload) {
      entryIdToUse = typeof payload.entry_id === "string" && payload.entry_id.length > 0 ? payload.entry_id : entryIdToUse;
      anchorTallyCardNumber =
        typeof payload.tally_card_number === "string" && payload.tally_card_number.length > 0
          ? payload.tally_card_number
          : anchorTallyCardNumber;
      warehouseIdFromLookup =
        typeof payload.warehouse_id === "string" && payload.warehouse_id.length > 0 ? payload.warehouse_id : warehouseIdFromLookup;

      if (Array.isArray(payload.locations)) {
        preloadedLocations = (payload.locations as RpcLocation[])
          .map((loc, idx) => ({
            id: loc.id ?? `temp-${idx}`,
            location: loc.location ?? "",
            qty: typeof loc.qty === "number" ? loc.qty : Number(loc.qty) || 0,
            pos:
              typeof loc.pos === "number"
                ? loc.pos
                : loc.pos !== null && loc.pos !== undefined
                  ? Number(loc.pos) || idx + 1
                  : idx + 1,
          }))
          .filter((loc) => loc.location.trim().length > 0);
      }
    }

    if (isDev) {
      console.log("[EditStockAdjustmentPage] RPC load result:", {
        url_id: id,
        resolved_entry_id: entryIdToUse,
        tally_card_number: anchorTallyCardNumber,
        warehouse_id: warehouseIdFromLookup,
        locations_count: preloadedLocations.length,
      });
    }
  } catch (err) {
    if (isDev) {
      console.warn("[EditStockAdjustmentPage] fn_stock_adjustment_load_edit failed, falling back to provided id", err);
    }
    entryIdToUse = id;
    preloadedLocations = [];
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

  const optionsKeys = extractOptionsKeys(stockAdjustmentCreateConfig);

  let warehouseId = warehouseIdFromLookup;
  if (!warehouseId) {
    const warehouseFromDefaults = prep.defaults?.warehouse_id;
    if (typeof warehouseFromDefaults === "string" && warehouseFromDefaults.length > 0) {
      warehouseId = warehouseFromDefaults;
    }
  }

  const dynamicFilters = warehouseId ? { warehouseLocations: { warehouse_id: warehouseId } } : undefined;
  const loadedOptions = await loadOptions(optionsKeys, undefined, dynamicFilters);

  // Ensure defaults include locations array if multi_location is true
  const defaults = prep.defaults ?? {};
  if (!defaults.tally_card_number && anchorTallyCardNumber) {
    defaults.tally_card_number = anchorTallyCardNumber;
  }
  
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
    if (!Array.isArray(defaults.locations) || defaults.locations.length === 0) {
      defaults.locations = preloadedLocations;
    }
  } else {
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
