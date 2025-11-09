"use client";

import React from "react";
import { useFormContext } from "react-hook-form";

import { DynamicForm } from "@/components/forms/dynamic-form";
import { useRouter } from "next/navigation";
import { useNotice } from "@/components/ui/notice";
import { extractErrorMessage } from "@/lib/forms/extract-error";
import StockAdjustmentFormWithLocations from "./stock-adjustment-form-with-locations";
import SubmitButtonWrapper from "./submit-button-wrapper";
import MultiLocationToggle from "./multi-location-toggle";
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

  // Inject MultiLocationToggle into the first section's headerRight
  const configWithToggle = React.useMemo(() => {
    if (!config.sections || config.sections.length === 0) {
      return config;
    }
    
    const sections = [...config.sections];
    // Add toggle to the first section (Details section)
    if (sections[0]) {
      sections[0] = {
        ...sections[0],
        headerRight: <MultiLocationToggle />,
      };
    }
    
    return {
      ...config,
      sections,
    };
  }, [config]);

  return (
    <DynamicForm
      id={formId}
      config={configWithToggle}
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
          
          // CRITICAL: Determine multi_location mode - it might not be in form values if it's a hidden field
          // Derive it from: 1) form values, 2) defaults, 3) presence of locations array
          const isMultiLocation = processedValues.multi_location ?? 
                                  defaults?.multi_location ?? 
                                  (locationsToUse.length > 0);
          
          // Ensure multi_location is set in processedValues for consistency
          processedValues.multi_location = isMultiLocation;
          
          let currentEntryId = entryId;
          
          // Step 1: Create or update parent entry first (to get entry_id for locations)
          // For multi_location mode, we need to handle location string parsing
          if (isMultiLocation && typeof processedValues.location === "string" && processedValues.location.trim()) {
            // If multi_location is true but location is a string, parse it into individual locations
            // This handles the case where the form loads with a location string from the database
            const locationParts = processedValues.location.split(",").map((s: string) => s.trim()).filter(Boolean);
            if (locationParts.length > 0 && (!locationsToUse || locationsToUse.length === 0)) {
              // Create locations array from the parsed string
              // We'll need to fetch quantities from child locations if they exist, or distribute evenly
              const parsedLocations = locationParts.map((loc: string, idx: number) => ({
                id: `temp-${idx}`,
                location: loc,
                qty: 0, // Will be set from child locations or calculated
                pos: idx + 1,
              }));
              locationsToUse.push(...parsedLocations);
              console.log("[StockAdjustmentFormWrapper] Parsed location string into locations array:", parsedLocations);
            }
          }
          
          // CRITICAL: For multi_location mode, strip location and qty from first SCD2 call
          // These will be calculated from child locations and sent in the second SCD2 call
          // This ensures:
          // 1. First call only updates metadata (reason_code, note, multi_location flag)
          // 2. We get a valid entry_id (even if no changes, SCD2 returns existing ID)
          // 3. Locations are saved with correct entry_id
          // 4. Second call updates parent with aggregated values (qty, location string)
          const firstCallPayload = { ...processedValues };
          
          console.log("[StockAdjustmentFormWrapper] Before stripping - firstCallPayload keys:", Object.keys(firstCallPayload));
          console.log("[StockAdjustmentFormWrapper] Before stripping - isMultiLocation:", isMultiLocation);
          console.log("[StockAdjustmentFormWrapper] Before stripping - multi_location from values:", processedValues.multi_location);
          console.log("[StockAdjustmentFormWrapper] Before stripping - multi_location from defaults:", defaults?.multi_location);
          console.log("[StockAdjustmentFormWrapper] Before stripping - locationsToUse.length:", locationsToUse.length);
          console.log("[StockAdjustmentFormWrapper] Before stripping - has location:", 'location' in firstCallPayload, firstCallPayload.location);
          console.log("[StockAdjustmentFormWrapper] Before stripping - has qty:", 'qty' in firstCallPayload, firstCallPayload.qty);
          
          if (isMultiLocation) {
            const hadLocation = 'location' in firstCallPayload;
            const hadQty = 'qty' in firstCallPayload;
            delete firstCallPayload.location;
            delete firstCallPayload.qty;
            console.log("[StockAdjustmentFormWrapper] Multi-location mode: Stripped location and qty from first SCD2 call", {
              hadLocation,
              hadQty,
              remainingKeys: Object.keys(firstCallPayload),
            });
          } else {
            console.log("[StockAdjustmentFormWrapper] Single-location mode: Keeping location and qty in first SCD2 call");
          }
          
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

          // Step 2: If multi_location is true, update locations via resource API
          if (isMultiLocation) {
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
              console.log("[StockAdjustmentFormWrapper] Inserting", cleanLocations.length, "locations with entry_id:", currentEntryId);
              let insertedCount = 0;
              for (const loc of cleanLocations) {
                console.log("[StockAdjustmentFormWrapper] Creating location:", loc.location, "for entry_id:", loc.entry_id);
                const createRes = await fetch(`/api/tcm_user_tally_card_entry_locations`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(loc),
                });
                
                if (!createRes.ok) {
                  const errorText = await createRes.text();
                  console.error("[StockAdjustmentFormWrapper] Failed to create location:", loc.location, "Error:", errorText);
                  throw new Error(`Failed to create location: ${loc.location} - ${errorText}`);
                }
                insertedCount++;
              }
              console.log("[StockAdjustmentFormWrapper] Successfully inserted", insertedCount, "locations");
            } else {
              console.warn("[StockAdjustmentFormWrapper] No locations to insert");
            }
            
            // Step 3: Aggregate locations and update parent with aggregated values
            // CRITICAL: We must fetch the locations we just saved to calculate aggregates
            // This ensures we're using the actual saved data, not form state
            console.log("[StockAdjustmentFormWrapper] Fetching saved locations for aggregation, entry_id:", currentEntryId);
            const locationsRes = await fetch(
              `/api/tcm_user_tally_card_entry_locations?entry_id=${currentEntryId}`
            );
            
            if (!locationsRes.ok) {
              const errorText = await locationsRes.text();
              console.error("[StockAdjustmentFormWrapper] Failed to fetch locations for aggregation:", errorText);
              throw new Error(`Failed to fetch locations for aggregation: ${errorText}`);
            }
            
            const locationsData = await locationsRes.json();
            const finalLocations = locationsData.rows || [];
            
            console.log("[StockAdjustmentFormWrapper] Aggregating", finalLocations.length, "locations");
            
            const totalQty = finalLocations.reduce((sum: number, loc: any) => sum + (loc.qty || 0), 0);
            const locationsText = finalLocations.map((loc: any) => loc.location).filter(Boolean).join(", ") || null;
            
            console.log("[StockAdjustmentFormWrapper] Aggregated values:", {
              totalQty,
              locationsText,
              locationsCount: finalLocations.length,
            });
            
            // Update parent with aggregated values via SCD2
            // This second call will create a new SCD2 row if qty or location string changed
            console.log("[StockAdjustmentFormWrapper] Making second SCD2 call with aggregated values");
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
            
            console.log("[StockAdjustmentFormWrapper] Second SCD2 call result:", {
              old_entryId: currentEntryId,
              new_entryId: newEntryId,
              ids_match: newEntryId === currentEntryId,
              scd2_result_id: scd2Result?.row?.id,
            });
            
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
                
                console.log("[StockAdjustmentFormWrapper] Found locations to move:", oldLocations.length);
                
                if (oldLocations.length > 0) {
                  // Delete old locations
                  const deleteIds = oldLocations.map((loc: any) => loc.id);
                  const deleteRes = await fetch(`/api/tcm_user_tally_card_entry_locations/bulk`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: deleteIds }),
                  });
                  
                  if (!deleteRes.ok) {
                    console.error("[StockAdjustmentFormWrapper] Failed to delete old locations");
                    throw new Error("Failed to delete old locations");
                  }
                  
                  console.log("[StockAdjustmentFormWrapper] Deleted", deleteIds.length, "old locations");
                  
                  // Insert locations with new entry_id
                  let insertedCount = 0;
                  for (const loc of oldLocations) {
                    const createRes = await fetch(`/api/tcm_user_tally_card_entry_locations`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        entry_id: newEntryId,
                        location: loc.location,
                        qty: loc.qty,
                        pos: loc.pos,
                      }),
                    });
                    
                    if (!createRes.ok) {
                      console.error("[StockAdjustmentFormWrapper] Failed to create location:", loc.location);
                      throw new Error(`Failed to create location: ${loc.location}`);
                    }
                    insertedCount++;
                  }
                  
                  console.log("[StockAdjustmentFormWrapper] Inserted", insertedCount, "locations with new entry_id:", newEntryId);
                } else {
                  console.warn("[StockAdjustmentFormWrapper] No locations found to move from entry_id:", currentEntryId);
                }
              } else {
                console.warn("[StockAdjustmentFormWrapper] Failed to fetch old locations, status:", oldLocationsRes.status);
              }
              
              currentEntryId = newEntryId;
            } else {
              console.log("[StockAdjustmentFormWrapper] No new row created, locations already at correct entry_id:", currentEntryId);
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

          // Redirect to edit page using the FINAL entry ID (after all SCD2 operations)
          // CRITICAL: With SCD2, currentEntryId may have changed multiple times
          // We must use the final value to ensure we load the correct (latest) record
          console.log("[StockAdjustmentFormWrapper] Final redirect with entry ID:", currentEntryId);
          
          if (currentEntryId) {
            const base = config.key ? `/forms/${config.key}` : `/forms`;
            const redirectUrl = `${base}/${currentEntryId}/edit`;
            console.log("[StockAdjustmentFormWrapper] Redirecting to:", redirectUrl);
            
            // Use replace to avoid adding to history, then refresh to force re-fetch
            router.replace(redirectUrl);
            // Force refresh to ensure fresh data is loaded (especially important for SCD2 where new row may have been created)
            // Small delay to ensure navigation completes before refresh
            setTimeout(() => {
              router.refresh();
            }, 100);
            
            notice.open({
              variant: "success",
              title: entryId ? "Update successful" : "Create successful",
              message: entryId 
                ? "Stock adjustment updated successfully." 
                : "Stock adjustment created successfully.",
            });
          } else {
            console.warn("[StockAdjustmentFormWrapper] No entry ID for redirect, refreshing current page");
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

