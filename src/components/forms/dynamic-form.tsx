"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { buildSchema } from "@/lib/forms/schema";

import { DynamicField, type FieldDef, type Option } from "./dynamic-field";

export type FormConfig = {
  key: string;
  title: string;
  subtitle?: string;
  permissionKey: string;
  resource: string;
  submitLabel?: string;
  fields: FieldDef[];
};

export type ResolvedOptions = Record<string, Option[]>;

// --- helper: map width -> responsive col spans (12-col grid)
function fieldSpanCls(width?: string) {
  switch (width) {
    case "full":
      return "col-span-12";
    case "half":
      // 1 col on mobile, 2 cols on md, 3 cols on lg (your requested 3→2→1 behavior)
      return "col-span-12 md:col-span-6 lg:col-span-4";
    // If you introduce 'third' later, uncomment:
    // case "third":
    //   return "col-span-12 lg:col-span-4";
    default:
      // safe default: behave like 'half'
      return "col-span-12 md:col-span-6 lg:col-span-4";
  }
}

export function DynamicForm({
  id, // NEW: so external buttons can target this form via form={id}
  config,
  defaults,
  options,
  onSubmit,
  hideInternalActions = false, // NEW: keep current buttons unless explicitly hidden
  onCancel, // NEW: optional override for cancel action
}: {
  id?: string;
  config: FormConfig;
  defaults: Record<string, any>;
  options: ResolvedOptions;
  onSubmit: (values: any) => Promise<void> | void;
  hideInternalActions?: boolean;
  onCancel?: () => void;
}) {
  const schema = React.useMemo(() => buildSchema(config), [config]);
  const methods = useForm({
    defaultValues: defaults,
    resolver: zodResolver(schema),
    mode: "onSubmit",
  });

  const [submitting, setSubmitting] = React.useState(false);

  return (
    <FormProvider {...methods}>
      <form
        id={id} // NEW: allow external submit buttons with form={id}
        className="grid grid-cols-12 gap-6"
        onSubmit={methods.handleSubmit(async (vals) => {
          if (submitting) return;
          setSubmitting(true);
          try {
            // normalize numbers (react-hook-form may keep them as strings)
            for (const f of config.fields) {
              if (f.kind === "number" && typeof (vals as any)[f.name] === "string") {
                (vals as any)[f.name] = (vals as any)[f.name] === "" ? undefined : Number((vals as any)[f.name]);
              }
            }
            await onSubmit(vals);
          } finally {
            setSubmitting(false);
          }
        })}
        aria-busy={submitting ? "true" : "false"}
      >
        {config.fields
          .filter((f) => !f.hidden)
          .map((f) => (
            <div key={f.name} className={fieldSpanCls((f as any).width)}>
              <DynamicField field={f} options={f.optionsKey ? options[f.optionsKey] : undefined} />
            </div>
          ))}

        {/* Actions row (kept by default for zero regression) */}
        {!hideInternalActions ? (
          <div className="col-span-12 mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm disabled:opacity-50"
              onClick={() => {
                if (typeof onCancel === "function") onCancel();
                else history.back();
              }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm disabled:opacity-50"
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
