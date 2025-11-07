"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";

import SectionCard from "@/components/forms/shell/section-card";
import { buildSchema } from "@/lib/forms/schema";

import { DynamicField, type FieldDef, type Option } from "./dynamic-field";
import {
  clamp,
  autoPlaceRowFirst,
  autoPlaceColumnFirst,
  colStartClass,
  colSpanClass,
  gridColsClass,
} from "./dynamic-form.utils";

/** Per-section layout controls (optional) */
export type SectionLayout = {
  columns?: 1 | 2 | 3 | 4; // default 3
  fill?: "row" | "column"; // default "row"
};

export type SectionDef = {
  key: string; // "details" recommended first
  title: string; // e.g., "Details"
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  layout?: SectionLayout;
  fields: FieldDef[];
};

export type FormConfig = {
  key: string;
  title: string;
  subtitle?: string;
  permissionKey: string;
  resource: string;
  submitLabel?: string;

  /** New (preferred for layout) */
  sections?: SectionDef[];

  /** Legacy (schema/defaults): rendered as implicit "Details" when sections absent */
  fields?: FieldDef[];
};

export type ResolvedOptions = Record<string, Option[]>;

function flattenErrors(errors: FieldErrors<any> | undefined, path: string[] = []): string[] {
  if (!errors) return [];
  const list: string[] = [];
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;
    const currentPath = [...path, key];

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object") {
          list.push(...flattenErrors(item as FieldErrors<any>, [...currentPath, String(index)]));
        }
      });
      continue;
    }

    if (typeof value === "object" && "message" in value && value.message) {
      list.push(`${currentPath.join(".")}: ${value.message}`);
      continue;
    }

    if (typeof value === "object") {
      list.push(...flattenErrors(value as FieldErrors<any>, currentPath));
    }
  }
  return list;
}

/**
 * Renders fields for a section in a responsive grid layout.
 * Extracts options for each field based on its optionsKey.
 */
function SectionBody({ section, options }: { section: SectionDef; options: ResolvedOptions }) {
  const columns = clamp(section.layout?.columns ?? 3, 1, 4);
  const fill = section.layout?.fill ?? "row";

  // Auto-place if no explicit column; always clamp span
  const prepared = (
    fill === "column" ? autoPlaceColumnFirst(section.fields, columns) : autoPlaceRowFirst(section.fields, columns)
  ).map((f) => ({
    ...f,
    column: clamp(f.column ?? 1, 1, columns),
    span: clamp(f.span ?? 1, 1, columns),
  }));

  return (
    <div className={gridColsClass(columns)}>
      {prepared.map((f) => {
        const startCls = colStartClass(f.column);
        const spanCls = colSpanClass(f.span);
        const fieldOptions = f.optionsKey ? options?.[f.optionsKey] : undefined;
        
        return (
          <div key={f.name} className={["space-y-0", startCls, spanCls].join(" ")}>
            <DynamicField field={f} options={fieldOptions} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Dynamic form component that renders fields based on form configuration.
 * 
 * Options flow: Server → EditWithTabs → FormIsland → DynamicForm → SectionBody → DynamicField
 * Each field with an optionsKey receives its options from options[optionsKey].
 */
export function DynamicForm({
  id,
  config,
  defaults,
  options,
  onSubmit,
  hideInternalActions = false,
  onCancel,
  children,
}: {
  id?: string;
  config: FormConfig;
  defaults: Record<string, any>;
  options: ResolvedOptions; // e.g., { warehouses: Option[], vendors: Option[] }
  onSubmit: (values: any) => Promise<void> | void;
  hideInternalActions?: boolean;
  onCancel?: () => void;
  children?: React.ReactNode; // Optional children to render inside the form
}) {
  const schema = React.useMemo(() => buildSchema(config as any), [config]);

  // Normalize nulls → "" for text/textarea and keep numbers as-is
  // Convert number values to strings for select fields (dropdowns use string option values)
  function normalizeDefaults(vals: Record<string, any>) {
    const out: Record<string, any> = { ...vals };
    const allFields: FieldDef[] = config.sections?.flatMap((s) => s.fields) ?? config.fields ?? [];
    for (const f of allFields) {
      const v = out[f.name];
      if (v === null || v === undefined) {
        if (f.kind === "multiselect") out[f.name] = [];
        else if (f.kind === "checkbox") out[f.name] = false;
        else if (f.kind === "number")
          out[f.name] = undefined; // show empty number input
        else out[f.name] = ""; // text/textarea/select/date
      } else if (f.kind === "select") {
        // Convert number to string for select dropdowns (option values are strings)
        // Also handle string representations of numbers to ensure matching
        if (typeof v === "number") {
          out[f.name] = String(v);
        } else if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) {
          // Already a string, but ensure it matches option IDs (they're strings)
          out[f.name] = v.trim();
        }
      }
    }
    return out;
  }

  // Normalize defaults BEFORE passing to useForm to ensure select fields with number values
  // are converted to strings on initial mount (not just on updates)
  const normalizedDefaults = React.useMemo(() => {
    const normalized = normalizeDefaults(defaults);
    // Debug logging for item_number field
    if (defaults.item_number !== undefined) {
      console.log("[DynamicForm] item_number normalization:", {
        original: defaults.item_number,
        originalType: typeof defaults.item_number,
        normalized: normalized.item_number,
        normalizedType: typeof normalized.item_number,
      });
    }
    return normalized;
  }, [defaults, config]);

  // DEBUG: Visual marker for item_number normalization
  const itemNumberDebug = React.useMemo(() => {
    if (defaults.item_number === undefined) return null;
    return {
      original: defaults.item_number,
      originalType: typeof defaults.item_number,
      normalized: normalizedDefaults.item_number,
      normalizedType: typeof normalizedDefaults.item_number,
      changed: String(defaults.item_number) !== String(normalizedDefaults.item_number),
    };
  }, [defaults.item_number, normalizedDefaults.item_number]);

  const methods = useForm({
    defaultValues: normalizedDefaults,
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  React.useEffect(() => {
    methods.trigger().catch(() => undefined);
  }, [methods]);

  // ✅ Ensure RHF picks up incoming defaults on first mount and client-side nav
  const defaultsRef = React.useRef(defaults);
  React.useEffect(() => {
    // Only reset if defaults reference actually changed (avoids expensive JSON.stringify on every render)
    if (defaultsRef.current !== defaults) {
      defaultsRef.current = defaults;
      methods.reset(normalizedDefaults);
    }
  }, [defaults, methods, normalizedDefaults]);

  const [submitting, setSubmitting] = React.useState(false);

  // Normalize numeric strings → numbers for number fields
  function normalize(vals: any) {
    const allFields: FieldDef[] = config.sections?.flatMap((s) => s.fields) ?? config.fields ?? [];
    for (const f of allFields) {
      if (f.kind === "number" && typeof vals[f.name] === "string") {
        vals[f.name] = vals[f.name] === "" ? undefined : Number(vals[f.name]);
      }
    }
  }

  // Build an implicit "Details" section if none provided (backward compatibility)
  const sections: SectionDef[] =
    config.sections && config.sections.length > 0
      ? config.sections
      : [
          {
            key: "details",
            title: "Details",
            defaultOpen: true,
            layout: { columns: 3, fill: "row" },
            fields: config.fields ?? [],
          },
        ];

  return (
    <FormProvider {...methods}>
      {/* DEBUG: Visual marker for item_number normalization */}
      {itemNumberDebug && (
        <div className="mb-4 rounded border-2 border-blue-500 bg-blue-50 p-3 text-sm dark:bg-blue-900/20">
          <div className="font-bold text-blue-700 dark:text-blue-400">🔍 DEBUG: item_number Normalization</div>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div>
              <div className="font-semibold">Original Default:</div>
              <code className="bg-white px-1">{String(itemNumberDebug.original)}</code> (type: {itemNumberDebug.originalType})
            </div>
            <div>
              <div className="font-semibold">Normalized Default:</div>
              <code className="bg-white px-1">{String(itemNumberDebug.normalized)}</code> (type: {itemNumberDebug.normalizedType})
            </div>
          </div>
          {itemNumberDebug.changed && (
            <div className="mt-2 text-green-600">✅ Conversion applied: {itemNumberDebug.originalType} → {itemNumberDebug.normalizedType}</div>
          )}
          {!itemNumberDebug.changed && (
            <div className="mt-2 text-yellow-600">⚠️ No conversion needed (already {itemNumberDebug.normalizedType})</div>
          )}
        </div>
      )}
      <form
        id={id}
        onSubmit={methods.handleSubmit(
          async (vals) => {
            if (submitting) return;
            setSubmitting(true);
            try {
              normalize(vals);
              await onSubmit(vals);
            } finally {
              setSubmitting(false);
            }
          },
          (errors) => {
            const flattened = flattenErrors(errors);
            if (flattened.length > 0) {
              console.error("Form validation errors:", flattened);
            } else {
              console.warn("Form submission blocked by validation, but no field-level errors were reported. Check schema refinements or custom validators.");
            }
          }
        )}
        aria-busy={submitting ? "true" : "false"}
      >
        {sections.map((section) => (
          <SectionCard
            key={section.key}
            title={section.title}
            defaultOpen={section.defaultOpen ?? true}
            headerRight={section.headerRight}
          >
            <SectionBody section={section} options={options} />
          </SectionCard>
        ))}

        {/* Optional children (e.g., custom form sections) */}
        {children}

        {/* Optional internal action row (kept for zero regression).
            If your page supplies external actions in FormShell, you can hide this. */}
        {!hideInternalActions ? (
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm disabled:opacity-50"
              onClick={() => (typeof onCancel === "function" ? onCancel() : history.back())}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Saving…" : (config.submitLabel ?? "Save")}
            </button>
          </div>
        ) : null}
      </form>
    </FormProvider>
  );
}
