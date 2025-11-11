"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import AddLocationSection from "./add-location-section";
import LocationsTable, { type LocationRow } from "./locations-table";
import { allowsZeroQuantity } from "@/lib/config/stock-adjustment-reason-codes";
import type { ResolvedOptions } from "@/lib/forms/types";

type Props = {
  entryId?: string; // For edit mode - to load existing locations
  options?: ResolvedOptions; // Options for dropdowns (e.g., warehouseLocations)
};

export default function StockAdjustmentFormWithLocations({ entryId, options }: Props) {
  const { watch, setValue, setError, clearErrors } = useFormContext();
  const multiLocation = watch("multi_location") ?? false;
  const reasonCode = watch("reason_code") ?? "UNSPECIFIED";
  const locations = watch("locations") ?? [];

  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const isDev = process.env.NODE_ENV !== "production";
  const isLoadingRef = React.useRef(false);
  const devLog = (...args: Parameters<typeof console.log>) => {
    if (isDev) {
      console.log(...args);
    }
  };
  const devError = (...args: Parameters<typeof console.error>) => {
    if (isDev) {
      console.error(...args);
    }
  };

  // Load existing locations when editing
  // Only load if locations are not already set (from server-side defaults)
  useEffect(() => {
    if (entryId && multiLocation) {
      const currentLocations = watch("locations");
      // Only fetch if locations are empty or not set
      if (!currentLocations || currentLocations.length === 0) {
        // Fetch existing child locations via resource API
        if (isLoadingRef.current) {
          return;
        }
        isLoadingRef.current = true;
        fetch(`/api/stock-adjustments/${entryId}/locations`)
          .then((res) => {
            if (!res.ok) {
              return res.json().catch(() => ({}));
            }
            return res.json();
          })
          .then((data) => {
            const locationsPayload = Array.isArray(data?.locations) ? data.locations : data?.rows;
            if (Array.isArray(locationsPayload) && locationsPayload.length > 0) {
              const formatted = locationsPayload.map((loc: any, idx: number) => ({
                id: loc.id || `temp-${idx}`,
                location: loc.location,
                qty: loc.qty,
                pos: loc.pos,
              }));
              setValue("locations", formatted);
            }
          })
          .catch((err) => {
            devError("Failed to load locations:", err);
          })
          .finally(() => {
            isLoadingRef.current = false;
          });
      }
    } else {
      isLoadingRef.current = false;
    }
  }, [entryId, multiLocation, setValue, watch]);

  // Convert locations array to LocationRow format
  const locationRows: LocationRow[] = useMemo(() => {
    return (locations || []).map((loc: any, idx: number) => ({
      id: loc.id || `temp-${idx}`,
      location: loc.location || "",
      qty: loc.qty || 0,
      pos: loc.pos,
    }));
  }, [locations]);

  // Compute total quantity
  const totalQty = useMemo(() => {
    return locationRows.reduce((sum, loc) => sum + (loc.qty || 0), 0);
  }, [locationRows]);

  // Compute aggregated location text (comma-separated)
  const aggregatedLocation = useMemo(() => {
    if (!multiLocation || locationRows.length === 0) return null;
    return locationRows.map((loc) => loc.location).filter(Boolean).join(", ") || null;
  }, [multiLocation, locationRows]);

  // Update parent qty and location when locations change (for multi-location mode)
  useEffect(() => {
    if (multiLocation) {
      setValue("qty", totalQty, { shouldValidate: false });
      // Set location to aggregated value (comma-separated locations) for display
      setValue("location", aggregatedLocation, { shouldValidate: false });
    }
  }, [multiLocation, totalQty, aggregatedLocation, setValue]);

  const handleAddLocation = (location: string, qty: number) => {
    const newLocation: LocationRow = {
      id: `temp-${Date.now()}-${Math.random()}`,
      location,
      qty,
      pos: locationRows.length + 1,
    };
    const updated = [...locationRows, newLocation];
    setValue("locations", updated, { shouldValidate: true, shouldDirty: true });
    devLog("[StockAdjustmentFormWithLocations] Added location, total now:", updated.length);
  };

  const handleRemoveLocation = (id: string) => {
    const updated = locationRows.filter((loc) => loc.id !== id);
    // Reassign positions
    const withPositions = updated.map((loc, idx) => ({
      ...loc,
      pos: idx + 1,
    }));
    setValue("locations", withPositions, { shouldValidate: true, shouldDirty: true });
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedLocations.size === locationRows.length) {
      setSelectedLocations(new Set());
    } else {
      setSelectedLocations(new Set(locationRows.map((loc) => loc.id)));
    }
  };

  // Validation: if multi_location is true, require at least one location
  const hasLocationError = multiLocation && locationRows.length === 0;
  const hasZeroQtyError =
    multiLocation &&
    totalQty === 0 &&
    !allowsZeroQuantity(reasonCode);

  // Set form errors for validation
  useEffect(() => {
    if (hasLocationError) {
      setError("locations", {
        type: "manual",
        message: "At least one location is required when multi-location mode is enabled.",
      });
    } else if (hasZeroQtyError) {
      setError("locations", {
        type: "manual",
        message: "Total quantity cannot be zero unless reason code is 'Count Correction'.",
      });
    } else {
      clearErrors("locations");
    }
  }, [hasLocationError, hasZeroQtyError, setError, clearErrors]);

  // Don't render if multi_location is false
  if (!multiLocation) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Add Location Section */}
      <AddLocationSection onAdd={handleAddLocation} locationOptions={options?.warehouseLocations} />

      {/* Locations Table */}
      <LocationsTable
        locations={locationRows}
        onRemove={handleRemoveLocation}
        onToggleSelect={handleToggleSelect}
        selectedLocations={selectedLocations}
        onToggleAll={handleToggleAll}
        totalQty={totalQty}
      />

      {/* Validation Messages */}
      {hasLocationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            At least one location is required when multi-location mode is enabled.
          </p>
        </div>
      )}

      {hasZeroQtyError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Total quantity cannot be zero unless reason code is "Count Correction".
          </p>
        </div>
      )}
    </div>
  );
}

