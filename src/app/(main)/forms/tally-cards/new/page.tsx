import React from "react";

import FormIsland from "@/components/forms/shell/form-island";
import FormShell from "@/components/forms/shell/form-shell";
import { PermissionGate } from "@/components/auth/permissions-gate";
import { ensureSections, getAllFields } from "@/lib/forms/config-normalize";
import { buildDefaults } from "@/lib/forms/schema";
import { extractOptionsKeys } from "@/lib/forms/extract-options-keys";
import { loadOptions } from "@/lib/forms/load-options";

import { tallyCardCreateConfig } from "./form.config";

export default async function NewTallyCardPage() {
  const cfg = ensureSections(tallyCardCreateConfig);
  const defaults = buildDefaults({ ...cfg, fields: getAllFields(cfg) } as any);

  // Strip non-serializable functions before passing to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = cfg as any;

  // Provide explicit transport so the client never needs functions
  const transportConfig = {
    ...clientConfig,
    method: "POST" as const,
    action: `/api/forms/${clientConfig.key}`,
  };

  const formId = "tally-card-form";
  
  // Extract optionsKeys from form config and load options server-side
  const optionsKeys = extractOptionsKeys(tallyCardCreateConfig);
  console.log(`[NewTallyCardPage] Extracted optionsKeys:`, optionsKeys);
  const options = await loadOptions(optionsKeys);
  console.log(`[NewTallyCardPage] Loaded options:`, Object.keys(options).map(k => ({ key: k, count: options[k]?.length ?? 0 })));

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
          <PermissionGate any={["resource:tcm_tally_cards:create"]}>
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
