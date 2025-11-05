"use client";

import * as React from "react";

import { Controller, useFormContext } from "react-hook-form";

export type Option = { id: string; label: string };

// Lightweight in-memory cache for fairly static warehouses
let WAREHOUSES_CACHE: Option[] | null = null;

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
  const { control } = useFormContext();
  if (field.hidden) return null;

  // Debug logging for select fields
  if ((field.kind === "select" || field.kind === "multiselect") && field.optionsKey) {
    console.log(`[DynamicField] Field "${field.name}" (optionsKey: "${field.optionsKey}")`, {
      optionsCount: options?.length ?? 0,
      options: options?.slice(0, 3),
      hasOptions: !!options,
      optionsIsArray: Array.isArray(options),
    });
  }
  
  // Visual debug indicator for select fields
  const showDebug = (field.kind === "select" || field.kind === "multiselect") && field.optionsKey;

  const labelCls = "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200";
  const inputBase =
    "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none " +
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700";
  const inputWhite = `bg-white ${inputBase}`;
  const inputGray = `bg-gray-50 ${inputBase}`;

  // Lazy warehouses select: fetch options on first focus/open
  function LazyWarehousesSelect({
    value,
    onChange,
    initialOptions,
    placeholder,
    multiple,
    readOnly,
  }: {
    value: any;
    onChange: (val: any) => void;
    initialOptions?: Option[];
    placeholder?: string;
    multiple?: boolean;
    readOnly?: boolean;
  }) {
    const [hasLoaded, setHasLoaded] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [localOptions, setLocalOptions] = React.useState<Option[]>(() => {
      if (Array.isArray(initialOptions) && initialOptions.length > 0) {
        WAREHOUSES_CACHE = initialOptions; // seed cache
        return initialOptions;
      }
      if (WAREHOUSES_CACHE && WAREHOUSES_CACHE.length > 0) {
        return WAREHOUSES_CACHE;
      }
      if (value) return [{ id: String(value), label: String(value) }];
      return [];
    });

    async function fetchWarehousesOnce() {
      if (hasLoaded || isLoading) return;
      try {
        setIsLoading(true);
        const res = await fetch('/api/warehouses?is_active=true');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data.rows ?? (Array.isArray(data.data) ? data.data : []));
        const wh: Option[] = Array.isArray(rows)
          ? rows.map((w: any) => ({ id: String(w.id), label: String(w.name || w.code || w.id) }))
          : [];
        WAREHOUSES_CACHE = wh;
        setLocalOptions(wh);
        setHasLoaded(true);
      } catch (e) {
        console.error('[LazyWarehousesSelect] fetch failed', e);
      } finally {
        setIsLoading(false);
      }
    }

    // Background prefetch on mount so the label upgrades quickly without a click
    React.useEffect(() => {
      if (!hasLoaded && (!WAREHOUSES_CACHE || WAREHOUSES_CACHE.length === 0)) {
        // fire and forget
        fetchWarehousesOnce();
      } else if (WAREHOUSES_CACHE && WAREHOUSES_CACHE.length > 0) {
        setLocalOptions(WAREHOUSES_CACHE);
        setHasLoaded(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="relative">
        <select
          multiple={!!multiple}
          value={multiple ? (value ?? []) : (value ?? '')}
          onFocus={fetchWarehousesOnce}
          onMouseDown={fetchWarehousesOnce}
          onChange={(e) => {
            if (multiple) {
              const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
              onChange(vals);
            } else {
              onChange(e.target.value);
            }
          }}
          className={`appearance-none ${readOnly ? inputGray : inputWhite}`}
          disabled={readOnly}
        >
          {!multiple && <option value="">{placeholder ?? 'Select…'}</option>}
          {localOptions.length === 0 ? (
            <option value="" disabled>
              {isLoading ? 'Loading…' : 'Open to load warehouses'}
            </option>
          ) : null}
          {localOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="lucide lucide-chevron-down pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-300"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  }

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf }) => (
        <div>
          {/* Visual debug indicator for select fields */}
          {showDebug && (
            <div className="mb-2 rounded border-2 border-orange-500 bg-orange-50 p-2 text-xs">
              <div className="font-bold text-orange-700">🔍 DynamicField: "{field.name}"</div>
              <div className="grid grid-cols-2 gap-1 mt-1">
                <div><strong>optionsKey:</strong> {field.optionsKey}</div>
                <div><strong>Has Options:</strong> {options ? "✅ YES" : "❌ NO"}</div>
                <div><strong>Is Array:</strong> {Array.isArray(options) ? "✅ YES" : "❌ NO"}</div>
                <div><strong>Count:</strong> {Array.isArray(options) ? options.length : "N/A"}</div>
                <div className="col-span-2">
                  <strong>Sample:</strong>
                  <pre className="bg-white p-1 rounded mt-1 overflow-auto max-h-16">
                    {JSON.stringify(options?.slice(0, 2) ?? "undefined", null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
          
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
              value={rhf.value ?? ""}
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
            <input type="checkbox" checked={!!rhf.value} onChange={(e) => rhf.onChange(e.target.checked)} />
          )}

          {field.kind === "date" && <input type="date" {...rhf} className={inputWhite} />}

          {(field.kind === "select" || field.kind === "multiselect") && field.optionsKey === 'warehouses' && (
            <LazyWarehousesSelect
              value={field.kind === 'multiselect' ? (rhf.value ?? []) : (rhf.value ?? '')}
              onChange={rhf.onChange}
              initialOptions={options}
              placeholder={field.placeholder}
              multiple={field.kind === 'multiselect'}
              readOnly={field.readOnly}
            />
          )}

          {(field.kind === "select" || field.kind === "multiselect") && field.optionsKey !== 'warehouses' && (
            <div className="relative">
              <select
                multiple={field.kind === "multiselect"}
                value={field.kind === "multiselect" ? (rhf.value ?? []) : (rhf.value ?? "")}
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
                {(options ?? []).length === 0 && field.optionsKey ? (
                  <option value="" disabled>
                    ⚠️ No options loaded (key: {field.optionsKey})
                  </option>
                ) : null}
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
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          )}

          {field.description ? <p className="text-muted-foreground mt-1 text-xs">{field.description}</p> : null}
        </div>
      )}
    />
  );
}
