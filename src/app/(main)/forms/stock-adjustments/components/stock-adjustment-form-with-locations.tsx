"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import AddLocationSection from "./add-location-section";
import LocationsTable, { type LocationRow } from "./locations-table";
import { allowsZeroQuantity, DEFAULT_REASON_CODE } from "@/lib/config/stock-adjustment-reason-codes";
import type { ResolvedOptions } from "@/lib/forms/types";

type Props = {
  entryId?: string; // For edit mode - to load existing locations
  options?: ResolvedOptions; // Options for dropdowns (e.g., warehouseLocations)
};

export default function StockAdjustmentFormWithLocations({ entryId, options }: Props) {
  const { watch, setValue, setError, clearErrors } = useFormContext();
  const reasonCode = watch("reason_code") ?? "UNSPECIFIED";
  const locations = watch("locations") ?? [];

  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());

  // Auto-detect multi_location based on locations array length
  const multiLocation = locations.length > 1;

  // Auto-update multi_location flag when locations change
  useEffect(() => {
    const newMultiLocation = locations.length > 1;
    setValue("multi_location", newMultiLocation, { shouldValidate: false, shouldDirty: false });
  }, [locations.length, setValue]);

  // Load existing locations when editing
  // Always load locations, even for single-location entries
  useEffect(() => {
    if (entryId) {
      const currentLocations = watch("locations");
      // Only fetch if locations are empty or not set
      if (!currentLocations || currentLocations.length === 0) {
        // Fetch existing child locations via resource API
        fetch(`/api/tcm_user_tally_card_entry_locations?entry_id=${entryId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
              const formatted = data.rows.map((loc: any, idx: number) => ({
                id: loc.id || `temp-${idx}`,
                location: loc.location,
                qty: loc.qty,
                pos: loc.pos,
                reason_code: loc.reason_code || DEFAULT_REASON_CODE,
              }));
              setValue("locations", formatted);
            }
          })
          .catch((err) => {
            console.error("Failed to load locations:", err);
          });
      }
    }
  }, [entryId, setValue, watch]);

  // Convert locations array to LocationRow format
  const locationRows: LocationRow[] = useMemo(() => {
    return (locations || []).map((loc: any, idx: number) => ({
      id: loc.id || `temp-${idx}`,
      location: loc.location || "",
      qty: loc.qty || 0,
      pos: loc.pos,
      reason_code: loc.reason_code || "UNSPECIFIED",
    }));
  }, [locations]);

  // Compute total quantity
  const totalQty = useMemo(() => {
    return locationRows.reduce((sum, loc) => sum + (loc.qty || 0), 0);
  }, [locationRows]);

  // Compute aggregated location text (comma-separated)
  const aggregatedLocation = useMemo(() => {
    if (locationRows.length === 0) return null;
    return locationRows.map((loc) => loc.location).filter(Boolean).join(", ") || null;
  }, [locationRows]);

  // Update parent qty and location when locations change
  // Always update, even for single-location entries (for display consistency)
  useEffect(() => {
    setValue("qty", totalQty, { shouldValidate: false });
    // Set location to aggregated value (comma-separated locations) for display
    setValue("location", aggregatedLocation, { shouldValidate: false });
  }, [totalQty, aggregatedLocation, setValue]);

  const handleAddLocation = (location: string, qty: number, reason_code: string) => {
    const newLocation: LocationRow = {
      id: `temp-${Date.now()}-${Math.random()}`,
      location,
      qty,
      pos: locationRows.length + 1,
      reason_code: reason_code || "UNSPECIFIED",
    };
    const updated = [...locationRows, newLocation];
    setValue("locations", updated, { shouldValidate: true, shouldDirty: true });
    console.log("[StockAdjustmentFormWithLocations] Added location, total now:", updated.length);
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

  const handleUpdateLocationQuantity = (locationId: string, newQty: number) => {
    // Ensure newQty is a proper number (not string)
    const qtyNumber = typeof newQty === "number" ? newQty : Number(newQty) || 0;
    
    const updated = locationRows.map((loc) => {
      if (loc.id === locationId) {
        return {
          ...loc,
          qty: qtyNumber,
        };
      }
      return loc;
    });
    setValue("locations", updated, { shouldValidate: true, shouldDirty: true });
    console.log("[StockAdjustmentFormWithLocations] Updated location quantity:", locationId, "to", qtyNumber);
  };

  const handleUpdateReasonCode = (locationId: string, newReasonCode: string) => {
    const updated = locationRows.map((loc) => {
      if (loc.id === locationId) {
        return {
          ...loc,
          reason_code: newReasonCode || DEFAULT_REASON_CODE,
        };
      }
      return loc;
    });
    setValue("locations", updated, { shouldValidate: true, shouldDirty: true });
    console.log("[StockAdjustmentFormWithLocations] Updated location reason_code:", locationId, "to", newReasonCode);
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

  // Validation: always require at least one location
  const hasLocationError = locationRows.length === 0;
  // Zero quantity is now allowed for all reason codes (out of stock scenarios)
  const hasZeroQtyError = false; // Always false since allowsZeroQuantity() returns true

  // Set form errors for validation
  useEffect(() => {
    if (hasLocationError) {
      setError("locations", {
        type: "manual",
        message: "At least one location is required.",
      });
    } else if (hasZeroQtyError) {
      // Note: This error should never show now since allowsZeroQuantity() returns true for all reason codes
      // But keeping the check for safety in case the function changes in the future
      setError("locations", {
        type: "manual",
        message: "Total quantity cannot be zero.",
      });
    } else {
      clearErrors("locations");
    }
  }, [hasLocationError, hasZeroQtyError, setError, clearErrors]);

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
        onUpdateQuantity={handleUpdateLocationQuantity}
        onUpdateReasonCode={handleUpdateReasonCode}
      />

      {/* Validation Messages */}
      {hasLocationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            At least one location is required.
          </p>
        </div>
      )}

      {hasZeroQtyError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Total quantity cannot be zero.
          </p>
        </div>
      )}
    </div>
  );
}

