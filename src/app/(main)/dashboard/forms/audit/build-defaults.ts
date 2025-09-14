// src/app/(main)/dashboard/forms/audit/build-defaults.ts

import { FieldConfig } from "./config";

/**
 * Build the defaultValues object used by react-hook-form.
 * Returns undefined for date/number fields, '' for text, [] for multiselect,
 * and any configured defaultValue.
 */
export function buildDefaultValues(config: FieldConfig[]) {
  return Object.fromEntries(
    config.map((field) => {
      if (field.defaultValue !== undefined) {
        return [field.name, field.defaultValue];
      }
      if (field.type === "multiselect") {
        return [field.name, []];
      }
      if (field.type === "date") {
        return [field.name, undefined];
      }
      if (field.type === "number") {
        return [field.name, undefined];
      }
      return [field.name, ""];
    })
  );
}
