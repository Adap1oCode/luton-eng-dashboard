// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/warehouse-locations/[id]/edit/page.tsx
// TYPE: Server Component (thin wrapper)
// PURPOSE: Edit warehouse location record (standard update, NO SCD2)
// -----------------------------------------------------------------------------

import React from "react";

import { notFound } from "next/navigation";

import ResourceFormSSRPage from "@/components/forms/form-view/resource-form-ssr-page";
import { getRecordForEdit } from "@/lib/forms/get-record-for-edit";
import { extractOptionsKeys } from "@/lib/forms/extract-options-keys";
import { loadOptions } from "@/lib/forms/load-options";

import { warehouseLocationCreateConfig } from "../../new/form.config";

export default async function EditWarehouseLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use cfg.key as the resource path segment
  const resourceKey = warehouseLocationCreateConfig.key;

  let prep: any;
  try {
    prep = await getRecordForEdit(warehouseLocationCreateConfig, resourceKey, id);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("404") || String(err).includes("Not found")) {
      return notFound();
    }
    throw new Error(`Failed to load warehouse location ${id}: ${String(err?.message ?? err)}`);
  }

  const formId = "warehouse-location-form";

  // Ensure only serializable config crosses to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = prep?.clientConfig ?? {};

  const transportConfig = {
    ...clientConfig,
    // Standard update (NO SCD2)
    method: "PATCH",
    action: `/api/${resourceKey}/${id}`,
    submitLabel: "Update",
  };

  // Extract optionsKeys from form config and load options server-side
  const optionsKeys = extractOptionsKeys(warehouseLocationCreateConfig);
  const loadedOptions = await loadOptions(optionsKeys);

  return (
    <ResourceFormSSRPage
      title="Edit Warehouse Location"
      headerDescription={warehouseLocationCreateConfig.subtitle}
      formId={formId}
      config={transportConfig}
      defaults={prep.defaults ?? {}}
      options={loadedOptions}
      cancelHref={`/forms/${resourceKey}`}
      primaryLabel="Update"
      primaryButtonPermissions={{
        any: ["resource:warehouse_locations:update"]
      }}
    />
  );
}


