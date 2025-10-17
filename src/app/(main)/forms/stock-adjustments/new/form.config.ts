// src/app/(main)/forms/stock-adjustments/new/form.config.ts
import type { FormConfig } from "@/lib/forms/types";

/**
 * Stock Adjustments – Create
 * Table: tcm_user_tally_card_entries
 * NOTES:
 * - user_id is set on the server from the effective session (hidden here).
 * - card_uid stays hidden; can be populated server-side (e.g., from scanned QR).
 *
 * Shell mapping (no changes to your type required):
 * - Page <FormShell title>            ← config.title
 * - Page <FormShell headerTitle>      ← config.title
 * - Page <FormShell headerDescription>← config.subtitle
 */
export const stockAdjustmentCreateConfig: FormConfig & {
  // Optional enhancements (kept fully backwards-compatible)
  submit?: (values: any) => Promise<any>;
  redirectTo?: (result: any) => string | null | undefined;
} = {
  key: "user_tally_card_entries.create",
  title: "New Stock Adjustment",
  subtitle: "Record a quick adjustment against a Tally Card",
  permissionKey: "resource:user_tally_card_entries:create",
  resource: "tcm_user_tally_card_entries",
  submitLabel: "Save Adjustment",

  fields: [
    // Server-only fields for schema completeness; not rendered
    { name: "user_id", label: "User", kind: "text", hidden: true },
    { name: "card_uid", label: "Card UID", kind: "text", hidden: true },

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
      required: false,
      placeholder: "Rack / Aisle / Bin",
      width: "half",
    },
    {
      name: "note",
      label: "Note",
      kind: "textarea",
      required: false,
      placeholder: "Optional details...",
      width: "full",
    },
  ],

  // ---- Optional: custom submit + redirect (safe to remove if you prefer generic) ----
  async submit(values) {
    // Use your resource-specific endpoint. If you omit this, FormIsland
    // will POST to /api/forms/${config.key} automatically.
    const res = await fetch("/api/stock_adjustments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json().catch(() => ({}));
  },

  redirectTo(result) {
    // If API returns an id, go to detail; otherwise back to list
    return result?.id
      ? `/forms/stock-adjustments/${result.id}`
      : `/forms/stock-adjustments`;
  },
};
