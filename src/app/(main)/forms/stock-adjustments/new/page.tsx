import React from "react";
import FormShell from "@/components/forms/shell/form-shell";
import FormIsland from "@/components/forms/shell/form-island";

// ✅ bring in your config
import { stockAdjustmentCreateConfig } from "./form.config";

// Optional helpers if you added them (recommended). If you haven’t yet, skip these lines
// and call `buildDefaults(stockAdjustmentCreateConfig)` as before.
import { ensureSections, getAllFields } from "@/lib/forms/config-normalize";
import { buildDefaults } from "@/lib/forms/schema";

export default async function NewStockAdjustmentPage() {
  // If you added config-normalize.ts — great:
  const cfg = ensureSections(stockAdjustmentCreateConfig);
  const defaults = buildDefaults({ ...cfg, fields: getAllFields(cfg) } as any);

  // If you *haven’t* added the normalizer yet, replace the two lines above with:
  // const defaults = buildDefaults(stockAdjustmentCreateConfig as any);

  // ❗ Strip non-serializable functions before passing to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = cfg as any;

  // Provide explicit transport so the client never needs functions
  const transportConfig = {
    ...clientConfig,
    method: "POST" as const,
    action: `/api/forms/${clientConfig.key}`,
  };

  const formId = "stock-adjustment-form";
  const options = {}; // (supply options if needed)

  return (
    <FormShell
      title={cfg.title}
      headerTitle={cfg.title}
      headerDescription={cfg.subtitle}
      actions={{
        secondaryLeft: (
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
          >
            Cancel
          </button>
        ),
        primary: (
          <button
            form={formId}
            type="submit"
            className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
          >
            {cfg.submitLabel ?? "Save"}
          </button>
        ),
      }}
    >
      <FormIsland
        formId={formId}
        config={transportConfig as any}
        defaults={defaults}
        options={options as any}
        // hideInternalActions defaults to true in FormIsland — including it here is optional
      />
    </FormShell>
  );
}
