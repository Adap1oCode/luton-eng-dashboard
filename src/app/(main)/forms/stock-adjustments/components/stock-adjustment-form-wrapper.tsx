"use client";

import React from "react";
import { useFormContext } from "react-hook-form";

import { DynamicForm } from "@/components/forms/dynamic-form";
import { useRouter } from "next/navigation";
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
          
          // CRITICAL: Always use currentLocations state (captured by LocationsCapture component)
          // This is the source of truth for locations, as it's updated in real-time
          const locationsToUse = currentLocations.length > 0 ? currentLocations : (values.locations ?? []);
          
          let currentEntryId = entryId;
          
          // Step 1: Create or update parent entry first (to get entry_id for locations)
          const endpoint = action ?? `/api/forms/${config.key}`;
          
          let res: Response;
          try {
            res = await fetch(endpoint, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(processedValues),
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
          currentEntryId = result?.row?.id || result?.id || entryId;
          
          if (!currentEntryId) {
            throw new Error("Failed to get entry ID after save");
          }

          // Step 2: If multi_location is true, update locations via resource API
          if (processedValues.multi_location) {
            // Filter and map locations - remove temp IDs, ensure clean format
            const cleanLocations = locationsToUse
              .filter((loc: any) => loc && loc.location && typeof loc.location === "string" && loc.location.trim())
              .map((loc: any, idx: number) => ({
                entry_id: currentEntryId,
                location: String(loc.location).trim(),
                qty: typeof loc.qty === "number" ? loc.qty : Number(loc.qty) || 0,
                pos: typeof loc.pos === "number" ? loc.pos : (idx + 1),
              }));
            
            console.log("[StockAdjustmentFormWrapper] Updating locations via resource API:", cleanLocations.length);
            
            // Get existing locations for this entry
            const existingRes = await fetch(
              `/api/tcm_user_tally_card_entry_locations?entry_id=${currentEntryId}`
            );
            
            if (!existingRes.ok) {
              throw new Error("Failed to fetch existing locations");
            }
            
            const existingData = await existingRes.json();
            const existingLocations = existingData.rows || [];
            
            // Delete all existing locations
            if (existingLocations.length > 0) {
              const deleteIds = existingLocations.map((loc: any) => loc.id);
              const deleteRes = await fetch(`/api/tcm_user_tally_card_entry_locations/bulk`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: deleteIds }),
              });
              
              if (!deleteRes.ok) {
                throw new Error("Failed to delete existing locations");
              }
            }
            
            // Insert new locations
            if (cleanLocations.length > 0) {
              for (const loc of cleanLocations) {
                const createRes = await fetch(`/api/tcm_user_tally_card_entry_locations`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(loc),
                });
                
                if (!createRes.ok) {
                  throw new Error(`Failed to create location: ${loc.location}`);
                }
              }
            }
            
            // Step 3: Aggregate locations and update parent
            const locationsRes = await fetch(
              `/api/tcm_user_tally_card_entry_locations?entry_id=${currentEntryId}`
            );
            
            if (!locationsRes.ok) {
              throw new Error("Failed to fetch locations for aggregation");
            }
            
            const locationsData = await locationsRes.json();
            const finalLocations = locationsData.rows || [];
            
            const totalQty = finalLocations.reduce((sum: number, loc: any) => sum + (loc.qty || 0), 0);
            const locationsText = finalLocations.map((loc: any) => loc.location).filter(Boolean).join(", ") || null;
            
            // Update parent with aggregated values via SCD2
            const scd2Res = await fetch(`/api/stock-adjustments/${currentEntryId}/actions/patch-scd2`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                qty: totalQty,
                location: locationsText,
                multi_location: true,
              }),
            });
            
            if (!scd2Res.ok) {
              throw new Error("Failed to update parent with aggregated values");
            }
            
            const scd2Result = await scd2Res.json();
            // Update currentEntryId in case SCD2 created a new row
            const newEntryId = scd2Result?.row?.id || currentEntryId;
            
            // If SCD2 created a new row, we need to move locations to the new entry_id
            if (newEntryId !== currentEntryId) {
              console.log("[StockAdjustmentFormWrapper] SCD2 created new row, moving locations from", currentEntryId, "to", newEntryId);
              
              // Fetch locations from old entry_id
              const oldLocationsRes = await fetch(
                `/api/tcm_user_tally_card_entry_locations?entry_id=${currentEntryId}`
              );
              
              if (oldLocationsRes.ok) {
                const oldLocationsData = await oldLocationsRes.json();
                const oldLocations = oldLocationsData.rows || [];
                
                if (oldLocations.length > 0) {
                  // Delete old locations
                  const deleteIds = oldLocations.map((loc: any) => loc.id);
                  await fetch(`/api/tcm_user_tally_card_entry_locations/bulk`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: deleteIds }),
                  });
                  
                  // Insert locations with new entry_id
                  for (const loc of oldLocations) {
                    await fetch(`/api/tcm_user_tally_card_entry_locations`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        entry_id: newEntryId,
                        location: loc.location,
                        qty: loc.qty,
                        pos: loc.pos,
                      }),
                    });
                  }
                }
              }
              
              currentEntryId = newEntryId;
            }
          } else {
            // Single location mode: clear any existing locations
            if (currentEntryId) {
              const existingRes = await fetch(
                `/api/tcm_user_tally_card_entry_locations?entry_id=${currentEntryId}`
              );
              
              if (existingRes.ok) {
                const existingData = await existingRes.json();
                const existingLocations = existingData.rows || [];
                
                if (existingLocations.length > 0) {
                  const deleteIds = existingLocations.map((loc: any) => loc.id);
                  await fetch(`/api/tcm_user_tally_card_entry_locations/bulk`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: deleteIds }),
                  });
                }
              }
            }
          }

          // Redirect to edit page
          if (currentEntryId) {
            const base = config.key ? `/forms/${config.key}` : `/forms`;
            router.push(`${base}/${currentEntryId}/edit`);
            notice.open({
              variant: "success",
              title: entryId ? "Update successful" : "Create successful",
              message: entryId 
                ? "Stock adjustment updated successfully." 
                : "Stock adjustment created successfully.",
            });
          } else {
            router.refresh();
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
      <StockAdjustmentFormWithLocations entryId={entryId} />
      <SubmitButtonWrapper formId={formId} />
    </DynamicForm>
  );
}

