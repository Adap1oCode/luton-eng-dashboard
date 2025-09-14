// src/app/(main)/dashboard/forms/audit/build-schema.ts
import { z, ZodTypeAny } from "zod";
import { FieldConfig } from "./config";

/**
 * Builds a Zod schema based on your FieldConfig[].
 */
export function buildSchemaFromConfig(config: FieldConfig[]) {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of config) {
    // 1) Base type
    let schema: ZodTypeAny;
    switch (field.type) {
      case "number":
        schema = z.coerce.number();
        break;
      case "date":
        schema = z.coerce.date();
        break;
      case "multiselect":
        schema = z.array(z.string());
        break;
      default:
        // text, textarea, select
        schema = z.string();
    }

    // 2) Required vs. optional
    if (field.required) {
      if (field.type === "multiselect") {
        // at least one selection
        schema = (schema as ReturnType<typeof z.array>).min(1, {
          message: `${field.label} is required`,
        });
      } else if (
        field.type === "text" ||
        field.type === "textarea" ||
        field.type === "select"
      ) {
        // non-empty string
        schema = (schema as ReturnType<typeof z.string>).nonempty({
          message: `${field.label} is required`,
        });
      }
      // numbers and dates: leave as-is (will error if empty/invalid)
    } else {
      schema = schema.optional();
    }

    shape[field.name] = schema;
  }

  return z.object(shape);
}

// Keep your existing import in dynamic-form.tsx unchanged:
export { buildSchemaFromConfig as buildSchema };
