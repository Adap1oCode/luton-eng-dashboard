// ---------------------------------------------------------------------------
// lib/forms/schema.ts (SHARED) – build Zod schema + defaults from config
// ---------------------------------------------------------------------------
import { z } from "zod";

import type { FieldDef, FormConfig } from "./types";

export function buildZodFromField(field: FieldDef) {
  let node: z.ZodTypeAny;
  switch (field.kind) {
    case "text":
    case "textarea":
      node = z.string();
      break;
    case "number":
      node = z.preprocess((v) => (v === "" ? undefined : Number(v)), z.number().finite());
      break;
    case "date":
      node = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date());
      break;
    case "checkbox":
      node = z.boolean();
      break;
    case "select":
      node = z.string().uuid({ message: `${field.label} is required` });
      break;
    case "multiselect":
      node = z.array(z.string().uuid()).default([]);
      break;
    default:
      node = z.any();
  }
  return field.required ? node.refine((v) => v !== undefined && v !== null && v !== "") : node.optional();
}

export function buildSchema(config: FormConfig) {
  const shape: Record<string, z.ZodTypeAny> = {};
  // Support both sections (preferred) and legacy flat fields (backward compatible)
  const configWithSections = config as FormConfig & { sections?: Array<{ fields: FieldDef[] }> };
  const allFields = configWithSections.sections?.flatMap((s) => s.fields) ?? config.fields ?? [];
  for (const f of allFields) {
    shape[f.name] = buildZodFromField(f);
  }
  return z.object(shape);
}

export function buildDefaults(config: FormConfig) {
  const defaults: Record<string, any> = {};
  // Support both sections (preferred) and legacy flat fields (backward compatible)
  const configWithSections = config as FormConfig & { sections?: Array<{ fields: FieldDef[] }> };
  const allFields = configWithSections.sections?.flatMap((s) => s.fields) ?? config.fields ?? [];
  for (const f of allFields) {
    if (f.defaultValue !== undefined) defaults[f.name] = f.defaultValue;
    else if (f.kind === "multiselect") defaults[f.name] = [];
    else if (f.kind === "checkbox") defaults[f.name] = false;
    else defaults[f.name] = "";
  }
  return defaults;
}
