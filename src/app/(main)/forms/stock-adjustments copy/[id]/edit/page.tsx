// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx
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

import { stockAdjustmentCreateConfig } from "../../new/form.config";

export default async function EditStockAdjustmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use cfg.key as the resource path segment (you set this to "stock-adjustments")
  const resourceKey = stockAdjustmentCreateConfig.key;

  let prep: any;
  try {
    prep = await getRecordForEdit(stockAdjustmentCreateConfig, resourceKey, id);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("404") || String(err).includes("Not found")) {
      return notFound();
    }
    throw new Error(`Failed to load stock adjustment ${id}: ${String(err?.message ?? err)}`);
  }

  const formId = "stock-adjustment-form";

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
    console.warn("Failed to resolve resource for history config:", err);
  }

  return (
    <ResourceFormSSRPage
      title="Edit Stock Adjustment"
      headerDescription={stockAdjustmentCreateConfig.subtitle}
      formId={formId}
      config={transportConfig}
      defaults={prep.defaults ?? {}}
      options={prep.options ?? {}}
      cancelHref={`/forms/${resourceKey}`}
      primaryLabel="Update"
      primaryButtonPermissions={{
        any: ["resource:tcm_user_tally_card_entries:update"]
      }}
    >
      <EditWithTabs
        resourceKey={resourceKey}
        recordId={id}
        formNode={
          <FormIsland
            formId={formId}
            config={transportConfig}
            defaults={prep.defaults ?? {}}
            options={prep.options ?? {}}
          />
        }
        historyUI={historyUI}
      />
    </ResourceFormSSRPage>
  );
}
