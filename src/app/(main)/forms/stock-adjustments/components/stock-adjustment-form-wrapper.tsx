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
  const normalizeLocations = React.useCallback(
    (source: any[] | undefined) => {
      if (!Array.isArray(source) || source.length === 0) {
        return [] as Array<{ location: string; qty: number; pos: number }>;
      }

      const normalized = source
        .map((loc, idx) => {
          const locationValue =
            typeof loc?.location === "string" ? loc.location.trim() : "";
          if (!locationValue) {
            return null;
          }

          const qtyValue =
            typeof loc?.qty === "number" ? loc.qty : Number(loc?.qty);
          const posValue =
            loc?.pos === null || loc?.pos === undefined
              ? idx + 1
              : typeof loc?.pos === "number"
                ? loc.pos
                : Number(loc?.pos);

          return {
            location: locationValue,
            qty: Number.isFinite(qtyValue) ? qtyValue : 0,
            pos: Number.isFinite(posValue) ? posValue : idx + 1,
          };
        })
        .filter(
          (loc): loc is { location: string; qty: number; pos: number } =>
            loc !== null,
        )
        .sort((a, b) => a.pos - b.pos || a.location.localeCompare(b.location));

      return normalized;
    },
    [],
  );

  const fingerprintLocations = React.useCallback(
    (locations: Array<{ location: string; qty: number; pos: number }>) =>
      JSON.stringify(locations.map((loc) => [loc.location, loc.qty, loc.pos])),
    [],
  );
  
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

        const baselineLocations = normalizeLocations(defaults?.locations);
        const baselineFingerprint = fingerprintLocations(baselineLocations);

        let rollbackEntryId = entryId;
        let currentEntryId = entryId;
        let currentOperation = "Saving stock adjustment";

        try {
          const processedValues = { ...values };
          delete processedValues.updated_at;
          delete processedValues.updated_at_pretty;

          let effectiveLocationsSource =
            currentLocations.length > 0
              ? [...currentLocations]
              : Array.isArray(values.locations)
                ? [...values.locations]
                : [];

          const isMultiLocation =
            processedValues.multi_location ??
            defaults?.multi_location ??
            (effectiveLocationsSource.length > 0);

          processedValues.multi_location = Boolean(isMultiLocation);

          if (
            processedValues.multi_location &&
            typeof processedValues.location === "string" &&
            processedValues.location.trim()
          ) {
            const locationParts = processedValues.location
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
            if (locationParts.length > 0 && effectiveLocationsSource.length === 0) {
              effectiveLocationsSource = locationParts.map((loc, idx) => ({
                location: loc,
                qty: 0,
                pos: idx + 1,
              }));
              devLog("[StockAdjustmentFormWrapper] Parsed aggregated location string into location array", {
                parsed: effectiveLocationsSource.length,
              });
            }
          }

          const normalizedIncomingLocations = normalizeLocations(effectiveLocationsSource);
          const incomingFingerprint = fingerprintLocations(normalizedIncomingLocations);

          const firstCallPayload = { ...processedValues };
          if (processedValues.multi_location) {
            delete firstCallPayload.location;
            delete firstCallPayload.qty;
          }

          const endpoint = action ?? `/api/forms/${config.key}`;
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
          currentEntryId = result?.row?.id || result?.id || entryId || currentEntryId;
          rollbackEntryId = currentEntryId;

          const entryIdChanged = Boolean(entryId && currentEntryId && entryId !== currentEntryId);

          devLog("[StockAdjustmentFormWrapper] Update response:", {
            previous_entry_id: entryId,
            current_entry_id: currentEntryId,
            entryId_changed: entryIdChanged,
            multi_location: processedValues.multi_location,
            baselineLocations: baselineLocations.length,
            incomingLocations: normalizedIncomingLocations.length,
          });

          if (!currentEntryId) {
            throw new Error("Failed to get entry ID after save");
          }

          const needsLocationSync =
            processedValues.multi_location &&
            (entryIdChanged || incomingFingerprint !== baselineFingerprint);

          let resolvedLocations = baselineLocations;
          if (processedValues.multi_location && needsLocationSync) {
            currentOperation = "Updating location breakdown";
            setLoadingMessage("Updating location breakdown…");

            const syncRes = await fetch(`/api/stock-adjustments/${currentEntryId}/locations`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                previousEntryId: entryId,
                locations: normalizedIncomingLocations,
              }),
            });

            if (!syncRes.ok) {
              const errorText = await syncRes.text();
              throw new Error(`Failed to save locations: ${errorText || syncRes.statusText}`);
            }

            const syncPayload = await syncRes.json().catch(() => ({ locations: [] }));
            resolvedLocations = normalizeLocations(syncPayload?.locations);
            devLog("[StockAdjustmentFormWrapper] Locations synchronized", {
              resolvedCount: resolvedLocations.length,
            });
          } else if (processedValues.multi_location) {
            resolvedLocations =
              normalizedIncomingLocations.length > 0 ? normalizedIncomingLocations : baselineLocations;
            devLog("[StockAdjustmentFormWrapper] Locations unchanged; reusing snapshot", {
              resolvedCount: resolvedLocations.length,
            });
          } else {
            resolvedLocations = [];
          }

          if (processedValues.multi_location) {
            const shouldFinalizeAggregates = entryIdChanged || needsLocationSync;
            const totalQty = resolvedLocations.reduce((sum, loc) => sum + (loc.qty || 0), 0);
            const locationsText =
              resolvedLocations.map((loc) => loc.location).filter(Boolean).join(", ") || null;

            if (shouldFinalizeAggregates) {
              currentOperation = "Finalizing quantity totals";
              setLoadingMessage("Finalizing stock adjustment…");

              const scd2Res = await fetch(
                `/api/stock-adjustments/${currentEntryId}/actions/patch-scd2`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    qty: totalQty,
                    location: locationsText,
                    multi_location: true,
                  }),
                },
              );

              if (!scd2Res.ok) {
                throw new Error("Failed to update parent with aggregated values");
              }

              const scd2Result = await scd2Res.json().catch(() => ({}));
              let newEntryId = scd2Result?.row?.id || currentEntryId;
              devLog("[StockAdjustmentFormWrapper] Second SCD2 call result:", {
                old_entryId: currentEntryId,
                new_entryId: newEntryId,
                ids_match: newEntryId === currentEntryId,
              });

              if (newEntryId !== currentEntryId) {
                currentOperation = "Linking locations to latest revision";
                setLoadingMessage("Synchronizing latest revision…");

                const locationsForLatest = scd2Result?.row?.child_locations
                  ? normalizeLocations(scd2Result.row.child_locations)
                  : resolvedLocations;

                const moveRes = await fetch(`/api/stock-adjustments/${newEntryId}/locations`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    previousEntryId: currentEntryId,
                    locations: locationsForLatest,
                  }),
                });

                if (!moveRes.ok) {
                  const moveText = await moveRes.text();
                  throw new Error(`Failed to move locations to latest entry: ${moveText || moveRes.statusText}`);
                }

                currentEntryId = newEntryId;
                rollbackEntryId = newEntryId;
              }
            } else {
              devLog("[StockAdjustmentFormWrapper] Aggregated values unchanged; skipping second SCD2 call");
            }
          } else {
            const hadHistoricalLocations =
              (defaults?.multi_location && baselineLocations.length > 0) || baselineLocations.length > 0;
            if (hadHistoricalLocations || Boolean(entryId && entryId !== currentEntryId)) {
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

          setLoadingMessage("Refreshing latest data…");
          devLog("[StockAdjustmentFormWrapper] Final redirect with entry ID:", currentEntryId);

          if (currentEntryId) {
            const base = config.key ? `/forms/${config.key}` : `/forms`;
            const redirectUrl = `${base}/${currentEntryId}/edit`;

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
              if (defaults?.qty !== undefined) rollbackParentPayload.qty = defaults.qty ?? null;
              if (defaults?.location !== undefined) rollbackParentPayload.location = defaults.location ?? null;
              if (defaults?.reason_code !== undefined) rollbackParentPayload.reason_code = defaults.reason_code ?? null;
              if (defaults?.note !== undefined) rollbackParentPayload.note = defaults.note ?? null;

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

