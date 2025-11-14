// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/permissions/[key]/edit/page.tsx
// TYPE: Server Component (thin wrapper)
// PURPOSE: Edit permission record (standard update, NO SCD2)
// -----------------------------------------------------------------------------

import React from "react";

import { notFound } from "next/navigation";

import ResourceFormSSRPage from "@/components/forms/form-view/resource-form-ssr-page";
import { getRecordForEdit } from "@/lib/forms/get-record-for-edit";
import { extractOptionsKeys } from "@/lib/forms/extract-options-keys";
import { loadOptions } from "@/lib/forms/load-options";

import { permissionCreateConfig } from "../../new/form.config";

export default async function EditPermissionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  // Use cfg.key as the resource path segment
  const resourceKey = permissionCreateConfig.key;

  let prep: any;
  try {
    prep = await getRecordForEdit(permissionCreateConfig, resourceKey, decodedKey);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("404") || String(err).includes("Not found")) {
      return notFound();
    }
    throw new Error(`Failed to load permission ${decodedKey}: ${String(err?.message ?? err)}`);
  }

  const formId = "permission-form";

  // Ensure only serializable config crosses to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = prep?.clientConfig ?? {};

  const transportConfig = {
    ...clientConfig,
    // Standard update (NO SCD2)
    method: "PATCH",
    action: `/api/${resourceKey}/${encodeURIComponent(decodedKey)}`,
    submitLabel: "Update",
  };

  // Extract optionsKeys from form config and load options server-side
  const optionsKeys = extractOptionsKeys(permissionCreateConfig);
  const loadedOptions = await loadOptions(optionsKeys);

  return (
    <ResourceFormSSRPage
      title="Edit Permission"
      headerDescription={permissionCreateConfig.subtitle}
      formId={formId}
      config={transportConfig}
      defaults={prep.defaults ?? {}}
      options={loadedOptions}
      cancelHref={`/forms/${resourceKey}`}
      primaryLabel="Update"
      primaryButtonPermissions={{
        any: ["screen:permissions:update"]
      }}
    />
  );
}

