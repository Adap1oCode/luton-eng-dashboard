"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/**
 * Toggle switch for multi-location mode.
 * Renders in the accordion header on the right side.
 */
export default function MultiLocationToggle() {
  const { watch, setValue } = useFormContext();
  const multiLocation = watch("multi_location") ?? false;

  const handleToggle = (checked: boolean) => {
    setValue("multi_location", checked, { shouldValidate: true, shouldDirty: true });
    
    // If turning off multi-location, clear locations array
    if (!checked) {
      setValue("locations", [], { shouldValidate: false, shouldDirty: true });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="multi-location-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Multi-location
      </Label>
      <Switch
        id="multi-location-toggle"
        checked={multiLocation}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}





