// ---------------------------------------------------------------------------
// lib/forms/schema.ts (SHARED) – build Zod schema + defaults from config
// ---------------------------------------------------------------------------
import { z } from "zod";

import type { FieldDef, FormConfig } from "./types";

export function buildZodFromField(field: FieldDef) {
  let node: z.ZodTypeAny;
  
  // Special handling for locations array field (used in stock adjustments)
  if (field.name === "locations") {
    node = z.array(
      z.object({
        location: z.string(),
        qty: z.number(),
        pos: z.number().optional(),
        id: z.string().optional(), // Temporary ID for React keys, filtered out before submission
      })
    ).optional();
    return node;
  }
  
  switch (field.kind) {
    case "text":
    case "textarea":
      node = z.string();
      break;
    case "number":
      node = z.preprocess((v) => {
        if (v === "" || v === null || v === undefined) return undefined;
        return Number(v);
      }, z.number().finite());
      break;
    case "date":
      node = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date());
      break;
    case "checkbox":
      node = z.boolean();
      break;
    case "select":
      node = z.string();
      break;
    case "multiselect":
      node = z.array(z.string().uuid()).default([]);
      break;
    default:
      node = z.any();
  }
  if (!field.required) {
    // Use nullish() to allow both null and undefined for optional fields
    // This is needed when fields are explicitly set to null (e.g., location when multi_location is true)
    return node.nullish();
  }

  return node.refine((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return !Number.isNaN(value);
    if (typeof value === "boolean") return true;
    return value !== undefined && value !== null;
  }, {
    message: `${field.label ?? "This field"} is required`,
  });
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
    else if (f.name === "locations") defaults[f.name] = []; // Special handling for locations array
    else if (f.kind === "multiselect") defaults[f.name] = [];
    else if (f.kind === "checkbox") defaults[f.name] = false;
    else defaults[f.name] = "";
  }
  return defaults;
}
