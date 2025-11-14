"use client";

import React from "react";
import { useFormContext } from "react-hook-form";

import { DynamicForm } from "@/components/forms/dynamic-form";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useNotice } from "@/components/ui/notice";
import { extractErrorMessage } from "@/lib/forms/extract-error";
import StockAdjustmentFormWithLocations from "./stock-adjustment-form-with-locations";
import SubmitButtonWrapper from "./submit-button-wrapper";
import { setFormSubmitting } from "./form-state-store";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";

/**
 * Component that ensures locations are captured on form submission
 * This component has access to form context via useFormContext
 */
function LocationsCapture({
  onLocationsReady,
}: {
  onLocationsReady: (locations: any[]) => void;
}) {
  const { watch } = useFormContext();
  const locations = watch("locations") ?? [];
  
  // Use a ref to store the callback to avoid re-renders
  const callbackRef = React.useRef(onLocationsReady);
  React.useEffect(() => {
    callbackRef.current = onLocationsReady;
  }, [onLocationsReady]);
  
  React.useEffect(() => {
    // Notify parent whenever locations change
    callbackRef.current(locations);
  }, [locations]);
  
  return null;
}

type Props = {
  formId: string;
  config: FormConfig;
  defaults: Record<string, any>;
  options: ResolvedOptions;
  entryId?: string; // For edit mode
  action?: string;
  method?: "POST" | "PATCH";
  submitLabel?: string;
};

/**
 * Custom form wrapper for Stock Adjustments that integrates the locations table.
 * Uses DynamicForm directly and adds the locations component inside the form context.
 */
export default function StockAdjustmentFormWrapper({
  formId,
  config,
  defaults,
  options,
  entryId,
  action,
  method = "POST",
  submitLabel,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notice = useNotice();
  const [submitting, setSubmitting] = React.useState(false);
  const [currentLocations, setCurrentLocations] = React.useState<any[]>([]);
  
  // Stable callback for LocationsCapture
  const handleLocationsReady = React.useCallback((locations: any[]) => {
    setCurrentLocations(locations);
  }, []);

  React.useEffect(() => {
    setFormSubmitting(formId, submitting);
  }, [formId, submitting]);

  return (
    <DynamicForm
      id={formId}
      config={config}
      defaults={defaults}
      options={options}
      hideInternalActions={true}
          onSubmit={async (values) => {
        if (submitting) return;
        setSubmitting(true);
        try {
          // Pre-process values: if multi_location is true, clear parent location/qty
          const processedValues = { ...values };
          
          // CRITICAL: Strip updated_at from payload - SCD2 function must always use now() for new rows
          // Including updated_at causes new rows to reuse old timestamps, breaking "find latest" queries
          delete processedValues.updated_at;
          delete processedValues.updated_at_pretty;
          
          // CRITICAL: Always use currentLocations state (captured by LocationsCapture component)
          // This is the source of truth for locations, as it's updated in real-time
          const locationsToUse = currentLocations.length > 0 ? currentLocations : (values.locations ?? []);
          
          // AUTO-DETECT multi_location based on locations array length
          // > 1 location = multi_location = true
          // = 1 location = multi_location = false
          // = 0 locations = multi_location = false (will be validated)
          const isMultiLocation = locationsToUse.length > 1;
          
          // Ensure multi_location is set in processedValues
          processedValues.multi_location = isMultiLocation;
          
          let currentEntryId = entryId;
          
          // Step 1: Create or update parent entry first (to get entry_id for locations)
          // ALWAYS strip location and qty from first SCD2 call - they're calculated from locations table
          // This ensures:
          // 1. First call only updates metadata (reason_code, note, multi_location flag)
          // 2. We get a valid entry_id (even if no changes, SCD2 returns existing ID)
          // 3. Locations are saved with correct entry_id
          // 4. Second call updates parent with aggregated values (qty, location string)
          const firstCallPayload = { ...processedValues };
          
          // Always strip location and qty - they come from locations table
          delete firstCallPayload.location;
          delete firstCallPayload.qty;
          
          console.log("[StockAdjustmentFormWrapper] Stripped location and qty from first SCD2 call (always calculated from locations)", {
            isMultiLocation,
            locationsCount: locationsToUse.length,
            remainingKeys: Object.keys(firstCallPayload),
          });
          
          const endpoint = action ?? `/api/forms/${config.key}`;
          
          console.log("[StockAdjustmentFormWrapper] First SCD2 call - endpoint:", endpoint);
          console.log("[StockAdjustmentFormWrapper] First SCD2 call - payload:", JSON.stringify(firstCallPayload, null, 2));
          
          let res: Response;
          try {
            res = await fetch(endpoint, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(firstCallPayload),
            });
          } catch (fetchError: any) {
            console.error("[StockAdjustmentFormWrapper] Fetch failed:", fetchError);
            throw new Error(`Network error: ${fetchError?.message || "Failed to connect to server"}`);
          }

          if (!res.ok) {
            const msg = await extractErrorMessage(res);
            console.error("[StockAdjustmentFormWrapper] API error:", res.status, msg);
            throw new Error(msg);
          }

          const result = await res.json().catch(() => ({}));
          
          // Get the entry ID (new for create, updated for edit via SCD2)
          // IMPORTANT: With SCD2, if a new row was created, result.row.id will be the NEW ID
          currentEntryId = result?.row?.id || result?.id || entryId;
          
          console.log("[StockAdjustmentFormWrapper] Update response:", {
            old_entryId: entryId,
            new_entryId: currentEntryId,
            result_row_id: result?.row?.id,
            result_id: result?.id,
            entryId_changed: entryId !== currentEntryId,
            multi_location: processedValues.multi_location,
            locations_count: locationsToUse.length,
          });
          
          if (!currentEntryId) {
            throw new Error("Failed to get entry ID after save");
          }

          // Step 2: Always save locations via batch PUT endpoint (even for single-location entries)
          // This standardizes the approach: all entries use the locations table
          // Validate that we have at least one location
          if (locationsToUse.length === 0) {
            throw new Error("At least one location is required.");
          }
          
          // Filter and map locations - remove temp IDs, ensure clean format and proper number types
          const cleanLocations = locationsToUse
            .filter((loc: any) => loc && loc.location && typeof loc.location === "string" && loc.location.trim())
            .map((loc: any, idx: number) => ({
              location: String(loc.location).trim(),
              qty: typeof loc.qty === "number" ? loc.qty : Number(loc.qty) || 0,
              pos: typeof loc.pos === "number" ? loc.pos : (idx + 1),
              reason_code: loc.reason_code || "UNSPECIFIED",
            }));
          
          if (cleanLocations.length === 0) {
            throw new Error("At least one valid location is required.");
          }
          
          console.log("[StockAdjustmentFormWrapper] Saving", cleanLocations.length, "locations via batch PUT endpoint");
          
          // Save all locations at once using the batch PUT endpoint
          // This endpoint handles deletion of old locations and insertion of new ones atomically
          const locationsPutRes = await fetch(`/api/stock-adjustments/${currentEntryId}/locations`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locations: cleanLocations,
            }),
          });
          
          if (!locationsPutRes.ok) {
            const errorText = await locationsPutRes.text();
            console.error("[StockAdjustmentFormWrapper] Failed to save locations:", errorText);
            throw new Error(`Failed to save locations: ${errorText}`);
          }
          
          const locationsPutData = await locationsPutRes.json();
          const savedLocations = locationsPutData.locations || [];
          
          console.log("[StockAdjustmentFormWrapper] Successfully saved", savedLocations.length, "locations");
          
          // Step 3: Aggregate locations and update parent with aggregated values
          // Use the saved locations data directly (no need to fetch again)
          const totalQty = savedLocations.reduce((sum: number, loc: any) => sum + (Number(loc.qty) || 0), 0);
          const locationsText = savedLocations.map((loc: any) => loc.location).filter(Boolean).join(", ") || null;
          
          console.log("[StockAdjustmentFormWrapper] Aggregated values:", {
            totalQty,
            locationsText,
            locationsCount: savedLocations.length,
          });
          
          // Update parent with aggregated values via SCD2
          // This second call will create a new SCD2 row if qty or location string changed
          // Always update parent with aggregated values (even for single-location entries)
          console.log("[StockAdjustmentFormWrapper] Making second SCD2 call with aggregated values");
          const scd2Res = await fetch(`/api/stock-adjustments/${currentEntryId}/actions/patch-scd2`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              qty: totalQty,
              location: locationsText,
              multi_location: isMultiLocation, // Use auto-detected value
            }),
          });
          
          if (!scd2Res.ok) {
            const errorText = await scd2Res.text();
            console.error("[StockAdjustmentFormWrapper] Failed to update parent with aggregated values:", errorText);
            throw new Error(`Failed to update parent with aggregated values: ${errorText}`);
          }
          
          const scd2Result = await scd2Res.json();
          // Update currentEntryId in case SCD2 created a new row
          const newEntryId = scd2Result?.row?.id || currentEntryId;
          
          console.log("[StockAdjustmentFormWrapper] Second SCD2 call result:", {
            old_entryId: currentEntryId,
            new_entryId: newEntryId,
            ids_match: newEntryId === currentEntryId,
            scd2_result_id: scd2Result?.row?.id,
          });
          
          // If SCD2 created a new row, we need to move locations to the new entry_id
          if (newEntryId !== currentEntryId) {
            console.log("[StockAdjustmentFormWrapper] SCD2 created new row, moving locations from", currentEntryId, "to", newEntryId);
            
            // Use the batch PUT endpoint again with previousEntryId to move locations atomically
            const moveLocationsRes = await fetch(`/api/stock-adjustments/${newEntryId}/locations`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                locations: cleanLocations,
                previousEntryId: currentEntryId,
              }),
            });
            
            if (!moveLocationsRes.ok) {
              const errorText = await moveLocationsRes.text();
              console.error("[StockAdjustmentFormWrapper] Failed to move locations to new entry_id:", errorText);
              throw new Error(`Failed to move locations to new entry: ${errorText}`);
            }
            
            console.log("[StockAdjustmentFormWrapper] Successfully moved locations to new entry_id:", newEntryId);
            currentEntryId = newEntryId;
          } else {
            console.log("[StockAdjustmentFormWrapper] No new row created, locations already at correct entry_id:", currentEntryId);
          }

          // Redirect to edit page using the FINAL entry ID (after all SCD2 operations)
          // CRITICAL: With SCD2, currentEntryId may have changed multiple times
          // We must use the final value to ensure we load the correct (latest) record
          console.log("[StockAdjustmentFormWrapper] Final redirect with entry ID:", currentEntryId);
          
          if (currentEntryId) {
            const base = config.key ? `/forms/${config.key}` : `/forms`;
            const redirectUrl = `${base}/${currentEntryId}/edit`;
            console.log("[StockAdjustmentFormWrapper] Redirecting to:", redirectUrl);
            
            // Invalidate all queries - React Query will only refetch observed (mounted) queries
            queryClient.invalidateQueries();
            // Use replace to navigate to the edit page
            router.replace(redirectUrl);
            
            notice.open({
              variant: "success",
              title: entryId ? "Update successful" : "Create successful",
              message: entryId 
                ? "Stock adjustment updated successfully." 
                : "Stock adjustment created successfully.",
            });
          } else {
            console.warn("[StockAdjustmentFormWrapper] No entry ID for redirect, invalidating queries");
            // Invalidate all queries - React Query will only refetch observed (mounted) queries
            queryClient.invalidateQueries();
            notice.open({
              variant: "success",
              title: entryId ? "Update successful" : "Create successful",
              message: entryId 
                ? "Stock adjustment updated successfully." 
                : "Stock adjustment created successfully.",
            });
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Error saving. Please review and try again.";

          notice.open({
            variant: "error",
            title: "Update failed",
            message,
          });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <LocationsCapture onLocationsReady={handleLocationsReady} />
      <StockAdjustmentFormWithLocations entryId={entryId} options={options} />
      <SubmitButtonWrapper formId={formId} />
    </DynamicForm>
  );
}

