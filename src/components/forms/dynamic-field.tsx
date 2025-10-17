// src/components/forms/dynamic-field.tsx
"use client";
import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";

export type Option = { id: string; label: string };
export type FieldKind = "text" | "number" | "textarea" | "select" | "multiselect" | "date" | "checkbox";
export type FieldDef = {
  name: string; label: string; kind: FieldKind;
  required?: boolean; placeholder?: string; description?: string;
  defaultValue?: any; hidden?: boolean; readOnly?: boolean;
  width?: "full" | "half" | "third"; optionsKey?: string;
};

export function DynamicField({ field, options }: { field: FieldDef; options?: Option[] }) {
  const { control } = useFormContext();
  if (field.hidden) return null;
  const widthCls = field.width === "half" ? "md:col-span-6" : field.width === "third" ? "md:col-span-4" : "col-span-12";

  return (
    <div className={widthCls}>
      <Controller
        name={field.name}
        control={control}
        render={({ field: rhf }) => (
          <div className="space-y-1">
            <label className="text-sm font-medium">{field.label}</label>
            {field.kind === "text" && (
              <input {...rhf} className="w-full rounded-md border px-3 py-2" placeholder={field.placeholder} readOnly={field.readOnly} />
            )}
            {field.kind === "number" && (
              <input type="number" {...rhf} className="w-full rounded-md border px-3 py-2" placeholder={field.placeholder} readOnly={field.readOnly} />
            )}
            {field.kind === "textarea" && (
              <textarea {...rhf} className="w-full rounded-md border px-3 py-2" placeholder={field.placeholder} readOnly={field.readOnly} />
            )}
            {field.kind === "checkbox" && (
              <input type="checkbox" checked={!!rhf.value} onChange={(e) => rhf.onChange(e.target.checked)} />
            )}
            {field.kind === "date" && (
              <input type="date" {...rhf} className="w-full rounded-md border px-3 py-2" />
            )}
            {(field.kind === "select" || field.kind === "multiselect") && (
              <select
                multiple={field.kind === "multiselect"}
                value={field.kind === "multiselect" ? rhf.value ?? [] : rhf.value ?? ""}
                onChange={(e) => {
                  if (field.kind === "multiselect") {
                    const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                    rhf.onChange(vals);
                  } else {
                    rhf.onChange(e.target.value);
                  }
                }}
                className="w-full rounded-md border px-3 py-2"
              >
                {field.kind === "select" && <option value="">Select…</option>}
                {(options ?? []).map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            )}
            {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
          </div>
        )}
      />
    </div>
  );
}
