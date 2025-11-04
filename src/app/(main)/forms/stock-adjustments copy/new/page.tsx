import React from "react";

import FormIsland from "@/components/forms/shell/form-island";
import FormShell from "@/components/forms/shell/form-shell";
import { PermissionGate } from "@/components/auth/permissions-gate";
import { ensureSections, getAllFields } from "@/lib/forms/config-normalize";
import { buildDefaults } from "@/lib/forms/schema";

import { stockAdjustmentCreateConfig } from "./form.config";

export default async function NewStockAdjustmentPage() {
  const cfg = ensureSections(stockAdjustmentCreateConfig);
  const defaults = buildDefaults({ ...cfg, fields: getAllFields(cfg) } as any);

  // Strip non-serializable functions before passing to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = cfg as any;

  // Provide explicit transport so the client never needs functions
  const transportConfig = {
    ...clientConfig,
    method: "POST" as const,
    action: `/api/forms/${clientConfig.key}`,
  };

  const formId = "stock-adjustment-form";
  const options = {};

  // Return server-rendered shell with client form island
  // Note: in Next.js App Router, this async component can directly return JSX
  return (
    <FormShell
      title={cfg.title}
      headerTitle={cfg.title}
      headerDescription={cfg.subtitle}
      actions={{
        secondaryLeft: (
          <button type="button" className="inline-flex items-center rounded-md border px-4 py-2 text-sm">
            Cancel
          </button>
        ),
        primary: (
          <PermissionGate any={["resource:tcm_user_tally_card_entries:create"]}>
            <button
              form={formId}
              type="submit"
              className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
            >
              {cfg.submitLabel ?? "Save"}
            </button>
          </PermissionGate>
        ),
      }}
    >
      <FormIsland
        formId={formId}
        config={transportConfig}
        defaults={defaults}
        options={options as any}
        // hideInternalActions defaults to true in FormIsland — including it here is optional
      />
    </FormShell>
  );
}
