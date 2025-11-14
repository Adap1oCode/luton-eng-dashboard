// src/app/(main)/forms/stock-adjustments/new/form.config.ts
import { z } from "zod";
import type { FormConfig } from "@/lib/forms/types";
import { STOCK_ADJUSTMENT_REASON_CODES, DEFAULT_REASON_CODE } from "@/lib/config/stock-adjustment-reason-codes";

// Form schema for validation (conditional based on multi_location)
export const formSchema = z
  .object({
    tally_card_number: z.string().min(1, "Tally Card Number is required"),
    qty: z.number().min(-999999).max(999999, "Quantity must be reasonable").optional(),
    location: z.string().optional(),
    note: z.string().optional(),
    reason_code: z.enum([
      "UNSPECIFIED",
      "DAMAGE",
      "LOST",
      "FOUND",
      "TRANSFER",
      "COUNT_CORRECTION",
      "ADJUSTMENT",
      "OTHER",
    ]).default(DEFAULT_REASON_CODE),
    multi_location: z.boolean().default(false),
    user_id: z.string().optional(),
    card_uid: z.string().optional(),
    warehouseId: z.string().optional(),
    adjustedQuantity: z.number().optional(),
    currentQuantity: z.number().optional(),
    adjustmentId: z.string().optional(),
    itemNumber: z.string().optional(),
    adjustmentType: z.string().optional(),
    reason: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional(),
    owner: z.string().optional(),
    locations: z.array(
      z.object({
        location: z.string().min(1, "Location is required"),
        qty: z.number().int("Quantity must be an integer"),
        pos: z.number().optional(),
      })
    ).optional(),
  })
  .refine(
    (data) => {
      // If multi_location is false, require location and qty
      if (!data.multi_location) {
        return !!(data.location && data.location.trim() && data.qty != null);
      }
      return true;
    },
    {
      message: "Location and quantity are required when not using multi-location mode",
      path: ["location"],
    }
  )
  .refine(
    (data) => {
      // If multi_location is true, require at least one location
      if (data.multi_location) {
        return !!(data.locations && data.locations.length > 0);
      }
      return true;
    },
    {
      message: "At least one location is required when multi-location mode is enabled",
      path: ["locations"],
    }
  )
  // Note: Zero quantity validation removed - zero is valid for out-of-stock scenarios
  // Validation is now handled in the UI component (stock-adjustment-form-with-locations.tsx)
  // which uses allowsZeroQuantity() function that now returns true for all reason codes

// Default values for the form
export const defaultValues = {
  tally_card_number: "",
  qty: 0,
  location: "",
  note: "",
  reason_code: DEFAULT_REASON_CODE,
  multi_location: false,
  user_id: "",
  card_uid: "",
  warehouseId: "",
  adjustedQuantity: 0,
  currentQuantity: 0,
  adjustmentId: "",
  itemNumber: "",
  adjustmentType: "",
  reason: "",
  notes: "",
  status: "",
  owner: "",
  locations: [] as Array<{ location: string; qty: number; pos?: number }>,
};

// Mock data functions and options
export const fetchWarehouses = async () => {
  // TODO: Implement actual warehouse fetching
  return [
    { value: "wh1", label: "Warehouse 1" },
    { value: "wh2", label: "Warehouse 2" },
  ];
};

export const adjustmentTypeOptions = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
  { value: "correction", label: "Correction" },
];

export const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// Reason code options (config-driven)
export const reasonCodeOptions = STOCK_ADJUSTMENT_REASON_CODES.map((code) => ({
  value: code.value,
  label: code.label,
}));

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
      span?: 1 | 2 | 3 | 4; // horizontal span across columns
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
  permissionKey: "resource:tcm_user_tally_card_entries:create",
  resource: "tcm_user_tally_card_entries",
  submitLabel: "Save Adjustment",

  // -------------------------------------------------
  // SCHEMA / DEFAULTS SOURCE (not rendered by layout)
  // -------------------------------------------------
  fields: [
    // Server-managed (kept for schema/defaults; not shown in sections)
    { name: "user_id", label: "User", kind: "text", hidden: true },
    { name: "card_uid", label: "Card UID", kind: "text", hidden: true },
    { name: "locations", label: "Locations", kind: "text", hidden: true }, // Child locations array

    // Visible fields also listed here for schema/defaults; layout comes from `sections`
    {
      name: "tally_card_number",
      label: "Tally Card",
      kind: "text",
      required: true,
      readOnly: true,
      placeholder: "e.g. TC-000123",
      width: "half",
    },
    {
      name: "reason_code",
      label: "Reason",
      kind: "select",
      required: true,
      placeholder: "Select reason...",
      width: "half",
      optionsKey: "reasonCodes",
    },
    {
      name: "multi_location",
      label: "Multi-location adjustment",
      kind: "checkbox",
      required: false,
      hidden: true, // Hidden - now shown as toggle in accordion header
    },
    {
      name: "qty",
      label: "Quantity (+/−)",
      kind: "number",
      required: false, // Conditional based on multi_location
      placeholder: "e.g. -4 or 12",
      width: "half",
    },
    {
      name: "location",
      label: "Location",
      kind: "select",
      required: false, // Conditional based on multi_location
      placeholder: "Select location...",
      width: "half",
      optionsKey: "warehouseLocations",
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
        // Order: Tally Card, Location, Quantity, Reason, Note
        {
          name: "tally_card_number",
          label: "Tally Card",
          kind: "text",
          required: true,
          readOnly: true,
          placeholder: "e.g. TC-000123",
        },
        {
          name: "location",
          label: "Location",
          kind: "select",
          required: false, // Read-only, calculated from locations table
          readOnly: true,
          placeholder: "Calculated from locations...",
          optionsKey: "warehouseLocations",
        },
        {
          name: "qty",
          label: "Quantity",
          kind: "number",
          required: false, // Read-only, calculated from locations table
          readOnly: true,
          placeholder: "Calculated from locations...",
        },
        {
          name: "note",
          label: "Note",
          kind: "textarea",
          required: false, // Optional
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
    return result?.id ? `/forms/stock-adjustments/${result.id}` : `/forms/stock-adjustments`;
  },
};
