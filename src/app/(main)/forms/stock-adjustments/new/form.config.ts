// src/app/(main)/forms/stock-adjustments/new/form.config.ts
import type { FormConfig } from "@/lib/forms/types";

/**
 * Pattern:
 * - `fields` stays for schema/defaults (hidden, server-managed, etc.)
 * - `sections` drives layout (SectionCard + responsive 3-col grid)
 * - Each field can optionally set `column` (1..columns) and `span` (1..columns)
 * - Each section can optionally set `layout: { columns?: 1|2|3|4; fill?: 'row'|'column' }`
 */
export const stockAdjustmentCreateConfig: FormConfig & {
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
      span?: 1 | 2 | 3 | 4;   // horizontal span across columns
      // Legacy hint kept for compatibility (mapped to span by the renderer if span not set)
      width?: "full" | "half" | "third";
      // For selects (optional)
      optionsKey?: string;
    }>;
  }>;
} = {
  key: "stock-adjustments",
  title: "New Stock Adjustment",
  subtitle: "Record a quick adjustment against a Tally Card",
  permissionKey: "resource:user_tally_card_entries:create",
  resource: "tcm_user_tally_card_entries",
  submitLabel: "Save Adjustment",

  // -------------------------------------------------
  // SCHEMA / DEFAULTS SOURCE (not rendered by layout)
  // -------------------------------------------------
  fields: [
    // Server-managed (kept for schema/defaults; not shown in sections)
    { name: "user_id", label: "User", kind: "text", hidden: true },
    { name: "card_uid", label: "Card UID", kind: "text", hidden: true },

    // Visible fields also listed here for schema/defaults; layout comes from `sections`
    {
      name: "tally_card_number",
      label: "Tally Card #",
      kind: "text",
      required: true,
      placeholder: "e.g. TC-000123",
      width: "half",
    },
    {
      name: "qty",
      label: "Quantity (+/−)",
      kind: "number",
      required: true,
      placeholder: "e.g. -4 or 12",
      width: "half",
    },
    {
      name: "location",
      label: "Location",
      kind: "text",
      placeholder: "Rack / Aisle / Bin",
      width: "half",
    },
    {
      name: "note",
      label: "Note",
      kind: "textarea",
      placeholder: "Optional details...",
      width: "full",
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
      layout: { columns: 3, fill: "row" }, // 3-col, row-first fill (defaults anyway)
      fields: [
        // Column 1 stack
        {
          name: "tally_card_number",
          label: "Tally Card #",
          kind: "text",
          required: true,
          placeholder: "e.g. TC-000123",
        },
        {
          name: "location",
          label: "Location",
          kind: "text",
          required: true,
          placeholder: "Rack / Aisle / Bin",
        },
                {
          name: "qty",
          label: "Quantity",
          kind: "number",
          required: true,
          placeholder: "e.g. -4 or 12",
        },
        {
          name: "note",
          label: "Note",
          kind: "textarea",
          placeholder: "Optional details...",
          span: 2, // span across col 1..2 (matches your desired layout)
        },

        // Column 2 stack


        // Column 3 currently unused — available for totals/status later
      ],
    },
  ],

  // -----------------------
  // Submit & Redirect
  // -----------------------
  async submit(values) {
    const res = await fetch("/api/stock-adjustments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json().catch(() => ({}));
  },

  redirectTo(result) {
    return result?.id
      ? `/forms/stock-adjustments/${result.id}`
      : `/forms/stock-adjustments`;
  },
};
