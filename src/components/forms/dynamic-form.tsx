"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import SectionCard from "@/components/forms/shell/section-card";
import { buildSchema } from "@/lib/forms/schema";

import { DynamicField, type FieldDef, type Option } from "./dynamic-field";

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
// react-hook-form import moved up to satisfy import/order

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Auto-place fields when no explicit column given.
 * Supports row-first fill with true horizontal span across a single grid.
 */
function autoPlaceRowFirst(fields: FieldDef[], columns: number) {
  let col = 1; // current column start for next field (1..columns)
  return fields.map((raw) => {
    const span = clamp(raw.span ?? 1, 1, columns);
    // If span doesn't fit current row, wrap to next row
    if (col + span - 1 > columns) col = 1;
    const placed: FieldDef = { ...raw, column: raw.column ?? col, span };
    col += span;
    if (col > columns) col = 1;
    return placed;
  });
}

/**
 * Column-first (fills column 1 top→down, then column 2, etc.).
 * For spans, we still assign a start col; visually span helps only when the
 * field is wide and near the end of a row. 'row' mode is recommended.
 */
function autoPlaceColumnFirst(fields: FieldDef[], columns: number) {
  const perCol = Math.ceil(fields.length / columns);
  return fields.map((raw, i) => {
    const span = clamp(raw.span ?? 1, 1, columns);
    const col = raw.column ?? clamp(Math.floor(i / perCol) + 1, 1, columns);
    return { ...raw, column: col, span };
  });
}

/** Tailwind-safe class maps for lg:col-start and lg:col-span (1..4) */
function colStartClass(n: number) {
  switch (n) {
    case 1:
      return "lg:col-start-1";
    case 2:
      return "lg:col-start-2";
    case 3:
      return "lg:col-start-3";
    case 4:
      return "lg:col-start-4";
    default:
      return "lg:col-start-1";
  }
}
function colSpanClass(n: number) {
  switch (n) {
    case 1:
      return "lg:col-span-1";
    case 2:
      return "lg:col-span-2";
    case 3:
      return "lg:col-span-3";
    case 4:
      return "lg:col-span-4";
    default:
      return "lg:col-span-1";
  }
}

/** Build responsive grid class for up to 4 columns */
function gridColsClass(columns: number) {
  if (columns <= 1) return "grid grid-cols-1 gap-8";
  if (columns === 2) return "grid grid-cols-1 gap-8 lg:grid-cols-2";
  if (columns === 3) return "grid grid-cols-1 gap-8 lg:grid-cols-3";
  return "grid grid-cols-1 gap-8 lg:grid-cols-3 xl:grid-cols-4";
}

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
        return (
          <div key={f.name} className={["space-y-0", startCls, spanCls].join(" ")}>
            <DynamicField field={f} options={f.optionsKey ? options[f.optionsKey] : undefined} />
          </div>
        );
      })}
    </div>
  );
}

export function DynamicForm({
  id,
  config,
  defaults,
  options,
  onSubmit,
  hideInternalActions = false,
  onCancel,
}: {
  id?: string;
  config: FormConfig;
  defaults: Record<string, any>;
  options: ResolvedOptions;
  onSubmit: (values: any) => Promise<void> | void;
  hideInternalActions?: boolean;
  onCancel?: () => void;
}) {
  const schema = React.useMemo(() => buildSchema(config as any), [config]);

  const methods = useForm({
    defaultValues: defaults,
    resolver: zodResolver(schema),
    mode: "onSubmit",
  });

  // Normalize nulls → "" for text/textarea and keep numbers as-is
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
      }
    }
    return out;
  }

  // ✅ Ensure RHF picks up incoming defaults on first mount and client-side nav
  React.useEffect(() => {
    methods.reset(normalizeDefaults(defaults));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaults)]);

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
      <form
        id={id}
        onSubmit={methods.handleSubmit(async (vals) => {
          if (submitting) return;
          setSubmitting(true);
          try {
            normalize(vals);
            await onSubmit(vals);
          } finally {
            setSubmitting(false);
          }
        })}
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
