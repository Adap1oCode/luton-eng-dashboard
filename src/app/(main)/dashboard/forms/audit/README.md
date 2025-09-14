# Audit Form Module Readme

This document describes the architecture and responsibilities of each file in the **`src/app/(main)/dashboard/forms/audit`** folder. It serves as a reference for maintaining and extending the form in a config-driven, generic way.

---

## 📁 File Overview

### 1. `config.ts`

* **Exports:**

  * `tableName: string` — Name of the Supabase table to insert into.
  * `FieldConfig` — Type definition for a form field.
  * `auditFormConfig: FieldConfig[]` — Array describing each form field (name, label, type, validation, layout, default value, etc.).
* **Purpose:**

  * Central source of truth for the form structure and database mapping.
  * Drives schema generation, default values, payload building, and rendering.

### 2. `build-schema.ts`

* **Exports:**

  * `buildSchema(config: FieldConfig[]): ZodSchema` — Builds a Zod validation schema from the config.
* **Purpose:**

  * Translates `FieldConfig` entries into appropriate Zod validators (string, number, date, array).
  * Applies `.nonempty()` or `.min(1)` when `required` is `true`, `.optional()` otherwise.

### 3. `build-defaults.ts`

* **Exports:**

  * `buildDefaultValues(config: FieldConfig[]): Record<string, any>` — Generates the `defaultValues` object for React Hook Form.
* **Purpose:**

  * Uses `config.defaultValue` when provided.
  * Sets empty string `""` for text fields, `undefined` for date/number fields, and `[]` for multiselects.

### 4. `field-renderer.tsx`

* **Default Export:** `FormFieldRenderer`
* **Props:**

  * `fieldConfig: FieldConfig`
  * `form: UseFormReturn`
* **Purpose:**

  * Renders individual form fields using Shadcn UI components (`Input`, `Textarea`, `Select`, `Checkbox`, `Calendar`, `Tooltip`).
  * Stacks label, tooltip helper text, control, and validation message.
  * Ensures `w-full` inputs and flex-based layout for consistent sizing.

### 5. `submission.ts`

* **Exports:**

  * `submitAuditForm(formData: Record<string, any>): Promise<SubmitResult>`
* **Purpose:**

  * Builds insert payload dynamically from the config (date coercion, multiselect flattening).
  * Prevents immediate duplicate submissions in the same session.
  * Inserts into Supabase using `tableName`, returns the full inserted row (`.select().single()`).
  * Catches and logs errors (unique-constraint, Supabase errors, runtime exceptions) with consistent `{ code, message }`.

### 6. `dynamic-form.tsx`

* **Default Export:** `DynamicForm`
* **Purpose:**

  * Composes the full form UI:
  * Uses React Hook Form with `zodResolver(schema)` and `defaultValues`.
  * Wraps in a Shadcn `Card` with white background and padding.
  * Lays out fields in a responsive grid (`grid-cols-1 sm:grid-cols-2`).
  * Handles submit state (`submitting`, `success`, `error`) and invokes `submitAuditForm`.

---

## 🔄 How It Works

1. **Configuration:**
   You define fields in `config.ts`—each drives validation, defaults, rendering, and payload.
2. **Schema & Defaults:**
   `build-schema.ts` produces a Zod schema; `build-defaults.ts` produces initial form values.
3. **Rendering:**
   `dynamic-form.tsx` wires up React Hook Form and maps over `auditFormConfig` to render each field via `field-renderer.tsx`.
4. **Submission:**
   On submit, data flows to `submission.ts`, which:

   * Builds payload from config
   * Guards against duplicates
   * Inserts into Supabase and returns the new row
   * Logs any errors for easy debugging
5. **Extension:**
   To create a new form for a different table, copy this folder, update `tableName` and `auditFormConfig`, and the rest is generic.

---

*End of Audit Form Module Readme*
