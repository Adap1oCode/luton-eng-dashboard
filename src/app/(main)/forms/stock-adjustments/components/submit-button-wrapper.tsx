"use client";

import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { resetFormState, setFormDirty, setFormSubmitting, setFormComplete } from "./form-state-store";

type Props = {
  formId: string;
};

/**
 * Hidden helper component that keeps the global form state store in sync
 * with react-hook-form's formState for the current form.
 */
export default function SubmitButtonWrapper({ formId }: Props) {
  const { control, formState } = useFormContext();
  
  // Watch all fields including locations
  // Note: locations is a hidden field managed via setValue, so useWatch should still pick it up
  const [reasonCode, multiLocation, location, qty, locations] = useWatch({
    control,
    name: ["reason_code", "multi_location", "location", "qty", "locations"],
  });
  const isDev = process.env.NODE_ENV !== "production";
  const devLog = (...args: Parameters<typeof console.log>) => {
    if (isDev) {
      console.log(...args);
    }
  };

  const isComplete = useMemo(() => {
    // Debug logging
    devLog("[SubmitButtonWrapper] isComplete check:", {
      reasonCode,
      multiLocation,
      locations: locations,
      locationsLength: Array.isArray(locations) ? locations.length : "not array",
      location,
      qty,
    });

    const hasReason = typeof reasonCode === "string" && reasonCode.trim().length > 0;
    if (!hasReason) {
      devLog("[SubmitButtonWrapper] Missing reason code");
      return false;
    }

    if (multiLocation) {
      if (!Array.isArray(locations) || locations.length === 0) {
        devLog("[SubmitButtonWrapper] Multi-location mode but no locations array or empty");
        return false;
      }
      const allValid = locations.every((loc: any) => {
        if (!loc) {
          devLog("[SubmitButtonWrapper] Location entry is null/undefined:", loc);
          return false;
        }
        const hasLocation = typeof loc.location === "string" && loc.location.trim().length > 0;
        const qtyValue = typeof loc.qty === "number" ? loc.qty : Number(loc.qty);
        const hasQty = Number.isFinite(qtyValue);
        if (!hasLocation) {
          devLog("[SubmitButtonWrapper] Location entry missing location string:", loc);
        }
        if (!hasQty) {
          devLog("[SubmitButtonWrapper] Location entry missing valid qty:", loc);
        }
        return hasLocation && hasQty;
      });
      devLog("[SubmitButtonWrapper] Multi-location validation result:", allValid);
      return allValid;
    }

    const hasLocation = typeof location === "string" && location.trim().length > 0;
    const qtyValue = typeof qty === "number" ? qty : Number(qty);
    const hasQty = qty !== null && qty !== undefined && qty !== "" && Number.isFinite(qtyValue);

    const result = hasLocation && hasQty;
    devLog("[SubmitButtonWrapper] Single-location validation result:", result);
    return result;
  }, [reasonCode, multiLocation, location, qty, locations]);

  useEffect(() => {
    resetFormState(formId);
    return () => {
      resetFormState(formId);
    };
  }, [formId]);

  useEffect(() => {
    setFormDirty(formId, formState.isDirty ?? false);
  }, [formId, formState.isDirty]);

  useEffect(() => {
    setFormSubmitting(formId, formState.isSubmitting ?? false);
  }, [formId, formState.isSubmitting]);

  useEffect(() => {
    setFormComplete(formId, isComplete);
  }, [formId, isComplete]);

  return null;
}

