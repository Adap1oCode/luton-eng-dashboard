import React from "react";

import FormShell from "@/components/forms/shell/form-shell";
import { PermissionGate } from "@/components/auth/permissions-gate";
import { ensureSections, getAllFields } from "@/lib/forms/config-normalize";
import { buildDefaults } from "@/lib/forms/schema";
import FormIsland from "@/components/forms/shell/form-island";

import { warehouseCreateConfig } from "./form.config";

export default async function NewWarehousePage() {
  const cfg = ensureSections(warehouseCreateConfig);
  const defaults = buildDefaults({ ...cfg, fields: getAllFields(cfg) } as any);

  // Strip non-serializable functions before passing to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = cfg as any;

  // Provide explicit transport so the client never needs functions
  const transportConfig = {
    ...clientConfig,
    method: "POST" as const,
    action: `/api/forms/${clientConfig.key}`,
  };

  const formId = "warehouse-form";

  return (
    <FormShell
      title={cfg.title}
      headerTitle={cfg.title}
      headerDescription={cfg.subtitle}
      actions={{
        secondaryLeft: (
          <a href="/forms/warehouses" className="inline-flex items-center rounded-md border px-4 py-2 text-sm">
            Cancel
          </a>
        ),
        primary: (
          <PermissionGate any={["resource:warehouses:create"]}>
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
      <FormIsland formId={formId} config={transportConfig} defaults={defaults} options={{}} />
    </FormShell>
  );
}
