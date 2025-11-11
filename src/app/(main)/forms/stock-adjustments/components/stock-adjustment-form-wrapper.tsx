"use client";

import React from "react";
import { useFormContext } from "react-hook-form";

import { DynamicForm } from "@/components/forms/dynamic-form";
import { useRouter } from "next/navigation";
import { useNotice } from "@/components/ui/notice";
import { BackgroundLoader } from "@/components/ui/background-loader";
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
  const [loadingMessage, setLoadingMessage] = React.useState<string | null>(null);
  const isDev = process.env.NODE_ENV !== "production";
  const devLog = (...args: Parameters<typeof console.log>) => {
    if (isDev) {
      console.log(...args);
    }
  };
  const devWarn = (...args: Parameters<typeof console.warn>) => {
    if (isDev) {
      console.warn(...args);
    }
  };
  const devError = (...args: Parameters<typeof console.error>) => {
    if (isDev) {
      console.error(...args);
    }
  };
  
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
    <>
      <DynamicForm
      id={formId}
      config={configWithToggle}
      defaults={defaults}
      options={options}
      hideInternalActions={true}
          onSubmit={async (values) => {
        if (submitting) return;
        setSubmitting(true);
        setLoadingMessage("Saving stock adjustment…");

        const baselineLocations = Array.isArray(defaults?.locations)
          ? defaults.locations.map((loc: any, idx: number) => ({
              location: String(loc?.location ?? "").trim(),
              qty: typeof loc?.qty === "number" ? loc.qty : Number(loc?.qty) || 0,
              pos: typeof loc?.pos === "number" ? loc.pos : idx + 1,
            }))
          : [];
        let rollbackEntryId = entryId;
        let currentOperation = "Saving stock adjustment";

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
            devLog("[StockAdjustmentFormWrapper] Parsed location string into locations array:", parsedLocations);
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
          
          devLog("[StockAdjustmentFormWrapper] Before stripping - firstCallPayload keys:", Object.keys(firstCallPayload));
          devLog("[StockAdjustmentFormWrapper] Before stripping - isMultiLocation:", isMultiLocation);
          devLog("[StockAdjustmentFormWrapper] Before stripping - multi_location from values:", processedValues.multi_location);
          devLog("[StockAdjustmentFormWrapper] Before stripping - multi_location from defaults:", defaults?.multi_location);
          devLog("[StockAdjustmentFormWrapper] Before stripping - locationsToUse.length:", locationsToUse.length);
          devLog("[StockAdjustmentFormWrapper] Before stripping - has location:", "location" in firstCallPayload, firstCallPayload.location);
          devLog("[StockAdjustmentFormWrapper] Before stripping - has qty:", "qty" in firstCallPayload, firstCallPayload.qty);
          
          if (isMultiLocation) {
            const hadLocation = 'location' in firstCallPayload;
            const hadQty = 'qty' in firstCallPayload;
            delete firstCallPayload.location;
            delete firstCallPayload.qty;
            devLog("[StockAdjustmentFormWrapper] Multi-location mode: Stripped location and qty from first SCD2 call", {
              hadLocation,
              hadQty,
              remainingKeys: Object.keys(firstCallPayload),
            });
          } else {
            devLog("[StockAdjustmentFormWrapper] Single-location mode: Keeping location and qty in first SCD2 call");
          }
          
          const endpoint = action ?? `/api/forms/${config.key}`;
          
          devLog("[StockAdjustmentFormWrapper] First SCD2 call - endpoint:", endpoint);
          devLog("[StockAdjustmentFormWrapper] First SCD2 call - payload:", JSON.stringify(firstCallPayload, null, 2));
          
          currentOperation = "Saving stock adjustment details";
          let res: Response;
          try {
            res = await fetch(endpoint, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(firstCallPayload),
            });
          } catch (fetchError: any) {
            devError("[StockAdjustmentFormWrapper] Fetch failed:", fetchError);
            throw new Error(`Network error: ${fetchError?.message || "Failed to connect to server"}`);
          }

          if (!res.ok) {
            const msg = await extractErrorMessage(res);
            devError("[StockAdjustmentFormWrapper] API error:", res.status, msg);
            throw new Error(msg);
          }

          const result = await res.json().catch(() => ({}));
          
          // Get the entry ID (new for create, updated for edit via SCD2)
          // IMPORTANT: With SCD2, if a new row was created, result.row.id will be the NEW ID
          currentEntryId = result?.row?.id || result?.id || entryId;
          rollbackEntryId = currentEntryId;
          
          devLog("[StockAdjustmentFormWrapper] Update response:", {
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
            const cleanLocations = locationsToUse
              .filter((loc: any) => loc && typeof loc.location === "string" && loc.location.trim())
              .map((loc: any, idx: number) => ({
                location: String(loc.location).trim(),
                qty: typeof loc.qty === "number" ? loc.qty : Number(loc.qty) || 0,
                pos: typeof loc.pos === "number" ? loc.pos : idx + 1,
              }));

            devLog("[StockAdjustmentFormWrapper] Synchronizing locations via batch endpoint:", cleanLocations.length);
            setLoadingMessage("Updating location breakdown…");
            currentOperation = "Updating location breakdown";
            const syncRes = await fetch(`/api/stock-adjustments/${currentEntryId}/locations`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                previousEntryId: entryId,
                locations: cleanLocations,
              }),
            });

            if (!syncRes.ok) {
              const errorText = await syncRes.text();
              throw new Error(`Failed to save locations: ${errorText || syncRes.statusText}`);
            }

            const syncPayload = await syncRes.json().catch(() => ({ locations: [] }));
            const savedLocations = Array.isArray(syncPayload.locations) ? syncPayload.locations : [];

            const totalQty = savedLocations.reduce((sum: number, loc: any) => sum + (loc.qty || 0), 0);
            const locationsText = savedLocations.map((loc: any) => loc.location).filter(Boolean).join(", ") || null;

            devLog("[StockAdjustmentFormWrapper] Aggregated values:", {
              totalQty,
              locationsText,
              locationsCount: savedLocations.length,
            });

            // Update parent with aggregated values via SCD2
            // This second call will create a new SCD2 row if qty or location string changed
            setLoadingMessage("Finalizing stock adjustment…");
            devLog("[StockAdjustmentFormWrapper] Making second SCD2 call with aggregated values");
            currentOperation = "Finalizing quantity totals";
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
            
            devLog("[StockAdjustmentFormWrapper] Second SCD2 call result:", {
              old_entryId: currentEntryId,
              new_entryId: newEntryId,
              ids_match: newEntryId === currentEntryId,
              scd2_result_id: scd2Result?.row?.id,
            });
            
            // If SCD2 created a new row, we need to move locations to the new entry_id
            if (newEntryId !== currentEntryId) {
              setLoadingMessage("Synchronizing latest revision…");
              devLog("[StockAdjustmentFormWrapper] SCD2 created new row, synchronizing locations to new entry", newEntryId);
              currentOperation = "Linking locations to latest revision";
              const moveRes = await fetch(`/api/stock-adjustments/${newEntryId}/locations`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  previousEntryId: currentEntryId,
                  locations: savedLocations.map((loc: any, idx: number) => ({
                    location: loc.location,
                    qty: loc.qty,
                    pos: loc.pos ?? idx + 1,
                  })),
                }),
              });

              if (!moveRes.ok) {
                const moveText = await moveRes.text();
                throw new Error(`Failed to move locations to latest entry: ${moveText || moveRes.statusText}`);
              }

              currentEntryId = newEntryId;
              rollbackEntryId = newEntryId;
            } else {
              devLog("[StockAdjustmentFormWrapper] No new row created, locations already at correct entry_id:", currentEntryId);
            }
          } else {
            // Single location mode: clear any existing locations
            if (currentEntryId) {
              currentOperation = "Clearing previous location breakdown";
              setLoadingMessage("Clearing location history…");
              await fetch(`/api/stock-adjustments/${currentEntryId}/locations`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  previousEntryId: entryId,
                  locations: [],
                }),
              });
            }
          }

          // Redirect to edit page using the FINAL entry ID (after all SCD2 operations)
          // CRITICAL: With SCD2, currentEntryId may have changed multiple times
          // We must use the final value to ensure we load the correct (latest) record
          setLoadingMessage("Refreshing latest data…");
          devLog("[StockAdjustmentFormWrapper] Final redirect with entry ID:", currentEntryId);
          
          if (currentEntryId) {
            const base = config.key ? `/forms/${config.key}` : `/forms`;
            const redirectUrl = `${base}/${currentEntryId}/edit`;
            devLog("[StockAdjustmentFormWrapper] Redirecting to:", redirectUrl);
            
            if (currentEntryId === entryId) {
              router.refresh();
            } else {
              router.replace(redirectUrl);
            }
            
            notice.open({
              variant: "success",
              title: entryId ? "Update successful" : "Create successful",
              message: entryId 
                ? "Stock adjustment updated successfully." 
                : "Stock adjustment created successfully.",
            });
            setLoadingMessage(null);
          } else {
            devWarn("[StockAdjustmentFormWrapper] No entry ID for redirect, refreshing current page");
            router.refresh();
            notice.open({
              variant: "success",
              title: entryId ? "Update successful" : "Create successful",
              message: entryId 
                ? "Stock adjustment updated successfully." 
                : "Stock adjustment created successfully.",
            });
            setLoadingMessage(null);
          }
        } catch (err) {
          if (rollbackEntryId && typeof rollbackEntryId === "string") {
            try {
              const rollbackLocationsPayload =
                defaults?.multi_location && baselineLocations.length > 0 ? baselineLocations : [];
              await fetch(`/api/stock-adjustments/${rollbackEntryId}/locations`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  previousEntryId: entryId,
                  locations: rollbackLocationsPayload,
                }),
              });

              const rollbackParentPayload: Record<string, any> = {
                multi_location: Boolean(defaults?.multi_location),
              };

              if (defaults?.qty !== undefined) {
                rollbackParentPayload.qty = defaults.qty ?? null;
              }
              if (defaults?.location !== undefined) {
                rollbackParentPayload.location = defaults.location ?? null;
              }
              if (defaults?.reason_code !== undefined) {
                rollbackParentPayload.reason_code = defaults.reason_code ?? null;
              }
              if (defaults?.note !== undefined) {
                rollbackParentPayload.note = defaults.note ?? null;
              }

              await fetch(`/api/stock-adjustments/${rollbackEntryId}/actions/patch-scd2`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rollbackParentPayload),
              });
            } catch (rollbackError) {
              devError("[StockAdjustmentFormWrapper] Rollback failed:", rollbackError);
            }
          }

          const baseMessage =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Error saving. Please review and try again.";
          const message = `${currentOperation} failed: ${baseMessage}`;

          notice.open({
            variant: "error",
            title: "Update failed",
            message,
          });
          setLoadingMessage(null);
        } finally {
          setSubmitting(false);
          setLoadingMessage(null);
        }
      }}
    >
        <LocationsCapture onLocationsReady={handleLocationsReady} />
        <StockAdjustmentFormWithLocations entryId={entryId} options={options} />
        <SubmitButtonWrapper formId={formId} />
      </DynamicForm>
      {loadingMessage ? (
        <BackgroundLoader message={loadingMessage} position="top-center" size="md" />
      ) : null}
    </>
  );
}

