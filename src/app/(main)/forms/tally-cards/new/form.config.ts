// src/app/(main)/forms/tally-cards/new/form.config.ts
import { z } from "zod";
import type { FormConfig } from "@/lib/forms/types";

// Form schema for validation
export const formSchema = z.object({
  tally_card_number: z.string().min(1, "Tally Card Number is required"),
  warehouse_id: z.string().uuid("Valid warehouse ID is required"),
  item_number: z.union([z.string(), z.number()]).refine(
    (val) => {
      const num = typeof val === "string" ? Number(val) : val;
      return Number.isInteger(num) && num > 0;
    },
    { message: "Item number must be a positive integer" }
  ),
  note: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

// Default values for the form
export const defaultValues = {
  tally_card_number: "",
  warehouse_id: "",
  item_number: "", // Empty string for select dropdown
  note: "",
  is_active: true,
};

/**
 * Pattern:
 * - `fields` stays for schema/defaults (hidden, server-managed, etc.)
 * - `sections` drives layout (SectionCard + responsive 3-col grid)
 * - Each field can optionally set `column` (1..columns) and `span` (1..columns)
 * - Each section can optionally set `layout: { columns?: 1|2|3|4; fill?: 'row'|'column' }`
 */
export const tallyCardCreateConfig: FormConfig & {
  submit?: (values: any) => Promise<any>;
  redirectTo?: (result: any) => string | null | undefined;

  // Layout-first source of truth for rendering
  sections?: Array<{
    key: string;
    title: string;
    defaultOpen?: boolean;
    layout?: { columns?: 1 | 2 | 3 | 4; fill?: "row" | "column" }; // NEW
    fields: Array<{
      name: string;
      label: string;
      kind: "text" | "number" | "textarea" | "select" | "multiselect" | "date" | "checkbox";
      required?: boolean;
      placeholder?: string;
      description?: string;
      hidden?: boolean;
      readOnly?: boolean;
      // Layout overrides (optional)
      column?: 1 | 2 | 3 | 4; // start column within section grid
      span?: 1 | 2 | 3 | 4; // horizontal span across columns
      // Legacy hint kept for compatibility (mapped to span by the renderer if span not set)
      width?: "full" | "half" | "third";
      // For selects (optional)
      optionsKey?: string;
    }>;
  }>;
} = {
  key: "tally-cards",
  title: "New Tally Card",
  subtitle: "Create a new tally card",
  permissionKey: "resource:tcm_tally_cards:create",
  resource: "tcm_tally_cards",
  submitLabel: "Save Tally Card",

  // -------------------------------------------------
  // SCHEMA / DEFAULTS SOURCE (not rendered by layout)
  // -------------------------------------------------
  fields: [
    {
      name: "tally_card_number",
      label: "Tally Card Number",
      kind: "text",
      required: true,
      placeholder: "e.g. TC-000123",
    },
    {
      name: "warehouse_id",
      label: "Warehouse",
      kind: "select",
      required: true,
      placeholder: "Select warehouse",
      optionsKey: "warehouses",
    },
    {
      name: "item_number",
      label: "Item Number",
      kind: "select",
      required: true,
      placeholder: "Select item number",
      optionsKey: "items",
    },
    {
      name: "note",
      label: "Note",
      kind: "textarea",
      placeholder: "Optional details...",
    },
    {
      name: "is_active",
      label: "Active",
      kind: "checkbox",
    },
  ],

  // ----------------------------
  // LAYOUT / RENDERING SECTIONS
  // ----------------------------
  sections: [
    {
      key: "details",
      title: "Details",
      defaultOpen: true,
      layout: { columns: 2, fill: "row" },
      fields: [
        {
          name: "tally_card_number",
          label: "Tally Card Number",
          kind: "text",
          required: true,
          placeholder: "e.g. TC-000123",
        },
        {
          name: "warehouse_id",
          label: "Warehouse",
          kind: "select",
          required: true,
          placeholder: "Select warehouse",
          optionsKey: "warehouses",
        },
        {
          name: "item_number",
          label: "Item Number",
          kind: "select",
          required: true,
          placeholder: "Select item number",
          optionsKey: "items",
        },
        {
          name: "is_active",
          label: "Active",
          kind: "checkbox",
        },
        {
          name: "note",
          label: "Note",
          kind: "textarea",
          placeholder: "Optional details...",
          span: 2,
        },
      ],
    },
  ],

  // -----------------------
  // Submit & Redirect
  // -----------------------
  async submit(values) {
    const res = await fetch("/api/forms/tally-cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json().catch(() => ({}));
  },

  redirectTo(result) {
    return result?.id ? `/forms/tally-cards/${result.id}` : `/forms/tally-cards`;
  },
};
