// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally-cards/[id]/edit/page.tsx
// TYPE: Server Component (thin wrapper)
// PURPOSE: Use shared form SSR wrapper to render the Edit screen with transport-only config.
// -----------------------------------------------------------------------------

import React from "react";

import { notFound } from "next/navigation";

import ResourceFormSSRPage from "@/components/forms/form-view/resource-form-ssr-page";
import EditWithTabs from "@/components/history/edit-with-tabs";
import FormIsland from "@/components/forms/shell/form-island";
import { getRecordForEdit } from "@/lib/forms/get-record-for-edit";
import { resolveResource } from "@/lib/api/resolve-resource";
import { extractOptionsKeys } from "@/lib/forms/extract-options-keys";
import { loadOptions } from "@/lib/forms/load-options";

import { tallyCardCreateConfig } from "../../new/form.config";

export default async function EditTallyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use cfg.key as the resource path segment (you set this to "tally-cards")
  const resourceKey = tallyCardCreateConfig.key;

  let prep: any;
  try {
    prep = await getRecordForEdit(tallyCardCreateConfig, resourceKey, id);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("404") || String(err).includes("Not found")) {
      return notFound();
    }
    throw new Error(`Failed to load tally card ${id}: ${String(err?.message ?? err)}`);
  }

  const formId = "tally-card-form";

  // Ensure only serializable config crosses to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = prep?.clientConfig ?? {};

  const transportConfig = {
    ...clientConfig,
    // SCD2: call the custom RPC-backed endpoint
    method: "POST",
    action: `/api/${resourceKey}/${id}/actions/patch-scd2`,
    submitLabel: "Update",
  };

  // Resolve resource config to get history UI config
  let historyUI;
  try {
    const resolved = await resolveResource(resourceKey);
    historyUI = resolved.config.history?.ui;
  } catch (err) {
    // If resource resolution fails, historyUI will be undefined (graceful degradation)
  }

  // Extract optionsKeys from form config and load options server-side
  // Pass current values to ensure item_number is included even if not in first 500 results
  const optionsKeys = extractOptionsKeys(tallyCardCreateConfig);
  const currentValues = prep.defaults?.item_number ? { item_number: prep.defaults.item_number } : undefined;
  const loadedOptions = await loadOptions(optionsKeys, currentValues);

  return (
    <ResourceFormSSRPage
      title="Edit Tally Card"
      headerDescription={tallyCardCreateConfig.subtitle}
      formId={formId}
      config={transportConfig}
      defaults={prep.defaults ?? {}}
      options={loadedOptions}
      cancelHref={`/forms/${resourceKey}`}
      primaryLabel="Update"
      primaryButtonPermissions={{
        any: ["resource:tcm_tally_cards:update"]
      }}
    >
      <EditWithTabs
        resourceKey={resourceKey}
        recordId={id}
      formConfig={transportConfig}
      formDefaults={prep.defaults ?? {}}
      formOptions={loadedOptions}
      formId={formId}
      historyUI={historyUI}
      />
    </ResourceFormSSRPage>
  );
}
