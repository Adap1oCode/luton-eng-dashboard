"use client";

import * as React from "react";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormItem } from "@/components/ui/form";
import { SearchableSelect, type SearchableSelectOption } from "./searchable-select";

export type Option = { id: string; label: string; value?: string };

export type FieldKind = "text" | "number" | "textarea" | "select" | "multiselect" | "date" | "checkbox";

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  hidden?: boolean;
  readOnly?: boolean;
  width?: "full" | "half" | "third"; // legacy, harmless
  optionsKey?: string;

  /** Layout overrides (optional) */
  column?: number; // 1..columns (explicit start)
  span?: number; // 1..columns (horizontal span across columns)
};

export function DynamicField({ field, options }: { field: FieldDef; options?: Option[] }) {
  const { control, watch } = useFormContext();
  const multiLocation = watch("multi_location") ?? false;
  
  if (field.hidden) return null;

  // Conditionally disable/hide location and qty when multi_location is true
  const isDisabledByMultiLocation =
    multiLocation && (field.name === "location" || field.name === "qty");

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf, fieldState }) => {
        return (
          <FormItem>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            {field.kind === "text" && (
              <Input
                {...rhf}
                value={rhf.value ?? ""}
                placeholder={field.placeholder}
                readOnly={field.readOnly || isDisabledByMultiLocation}
                disabled={isDisabledByMultiLocation}
                className={field.readOnly || isDisabledByMultiLocation ? "bg-muted" : ""}
              />
            )}

            {field.kind === "number" && (
              <Input
                type="number"
                {...rhf}
                value={rhf.value ?? ""}
                placeholder={field.placeholder}
                readOnly={field.readOnly || isDisabledByMultiLocation}
                disabled={isDisabledByMultiLocation}
                className={field.readOnly || isDisabledByMultiLocation ? "bg-muted" : ""}
              />
            )}

            {field.kind === "textarea" && (
              <Textarea
                {...rhf}
                value={rhf.value ?? ""}
                placeholder={field.placeholder}
                rows={3}
                readOnly={field.readOnly}
                className={field.readOnly ? "bg-muted" : ""}
              />
            )}

            {field.kind === "checkbox" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={!!rhf.value}
                  onCheckedChange={(checked) => rhf.onChange(checked)}
                  disabled={field.readOnly || isDisabledByMultiLocation}
                />
                {field.description && (
                  <Label htmlFor={field.name} className="text-sm font-normal cursor-pointer">
                    {field.description}
                  </Label>
                )}
              </div>
            )}

            {field.kind === "date" && (
              <Input
                type="date"
                {...rhf}
                value={rhf.value ?? ""}
                disabled={field.readOnly || isDisabledByMultiLocation}
                className={field.readOnly || isDisabledByMultiLocation ? "bg-muted" : ""}
              />
            )}

            {(field.kind === "select" || field.kind === "multiselect") && (
              <>
                {/* Use SearchableSelect for all select fields (except multiselect) */}
                {field.kind === "select" ? (
                  <SearchableSelect
                    options={(options ?? []).map((o) => {
                      // For location fields: SearchableSelect uses id for matching, but form stores value (location name)
                      // Map options so id matches what we'll pass as value (use value as id for location fields)
                      if (field.name === "location" && o.value) {
                        return {
                          ...o,
                          id: o.value, // Use location name as id for SearchableSelect matching
                        } as SearchableSelectOption;
                      }
                      return o as SearchableSelectOption;
                    })}
                    value={rhf.value ?? null}
                    onChange={(selectedId) => {
                      // For location fields, selectedId is already the location name (value)
                      // For other fields, selectedId is the id (UUID or item_number)
                      rhf.onChange(selectedId);
                    }}
                    placeholder={field.placeholder ?? "Select..."}
                    searchPlaceholder={
                      field.name === "item_number"
                        ? "Search item number or description..."
                        : field.name === "warehouse_id"
                        ? "Search warehouse code or name..."
                        : field.name === "location"
                        ? "Search location..."
                        : "Search..."
                    }
                    twoColumn={field.name === "item_number" || field.name === "warehouse_id"}
                    searchFields={field.name === "item_number" || field.name === "warehouse_id" ? "both" : "label"}
                    disabled={field.readOnly || isDisabledByMultiLocation}
                    className={field.readOnly || isDisabledByMultiLocation ? "bg-muted" : ""}
                  />
                ) : (
                  <div className="space-y-2">
                    {(options ?? []).length === 0 && field.optionsKey ? (
                      <p className="text-sm text-muted-foreground">
                        ⚠️ No options loaded (key: {field.optionsKey})
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {(options ?? []).map((o) => (
                          <div key={o.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={Array.isArray(rhf.value) && rhf.value.includes(o.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = Array.isArray(rhf.value) ? rhf.value : [];
                                if (checked) {
                                  rhf.onChange([...currentValues, o.id]);
                                } else {
                                  rhf.onChange(currentValues.filter((v: string) => v !== o.id));
                                }
                              }}
                              disabled={field.readOnly}
                            />
                            <Label htmlFor={`${field.name}-${o.id}`} className="text-sm font-normal cursor-pointer">
                              {o.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {field.description && field.kind !== "checkbox" && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            {fieldState.error && (
              <p className="text-sm text-destructive">{fieldState.error.message}</p>
            )}
          </FormItem>
        );
      }}
    />
  );
}
