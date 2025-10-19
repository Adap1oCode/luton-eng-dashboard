"use client";

import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";

export type Option = { id: string; label: string };

export type FieldKind =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "multiselect"
  | "date"
  | "checkbox";

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
  span?: number;   // 1..columns (horizontal span across columns)
};

export function DynamicField({ field, options }: { field: FieldDef; options?: Option[] }) {
  const { control } = useFormContext();
  if (field.hidden) return null;

  const labelCls = "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200";
  const inputBase =
    "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none " +
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700";
  const inputWhite = `bg-white ${inputBase}`;
  const inputGray = `bg-gray-50 ${inputBase}`;

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf }) => (
        <div>
          <label className={labelCls}>
            {field.label}
            {field.required ? <span className="ml-1 text-red-600">*</span> : null}
          </label>

          {field.kind === "text" && (
            <input
              {...rhf}
              value={rhf.value ?? ""}
              className={field.readOnly ? inputGray : inputWhite}
              placeholder={field.placeholder}
              readOnly={field.readOnly}
            />
          )}

          {field.kind === "number" && (
            <input
              type="number"
              {...rhf}
              value={rhf.value ?? ""}   // allow empty to show blank when undefined
              className={field.readOnly ? inputGray : inputWhite}
              placeholder={field.placeholder}
              readOnly={field.readOnly}
            />
          )}

          {field.kind === "textarea" && (
            <textarea
              {...rhf}
              value={rhf.value ?? ""}
              className={`w-full resize-none ${inputWhite}`}
              placeholder={field.placeholder}
              rows={3}
              readOnly={field.readOnly}
            />
          )}

          {field.kind === "checkbox" && (
            <input
              type="checkbox"
              checked={!!rhf.value}
              onChange={(e) => rhf.onChange(e.target.checked)}
            />
          )}

          {field.kind === "date" && (
            <input type="date" {...rhf} className={inputWhite} />
          )}

          {(field.kind === "select" || field.kind === "multiselect") && (
            <div className="relative">
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
                className={`appearance-none ${inputWhite}`}
              >
                {field.kind === "select" && <option value="">Select…</option>}
                {(options ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {/* Chevron icon exactly positioned */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="lucide lucide-chevron-down pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-300"
                width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          )}

          {field.description ? (
            <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
      )}
    />
  );
}
