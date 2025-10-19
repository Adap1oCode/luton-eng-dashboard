// src/lib/forms/get-record-for-edit.ts
// Purpose: One-stop helper to load a record for edit pages,
//          unwrap {row} payloads, and merge with schema defaults.

import { ensureSections, getAllFields } from "@/lib/forms/config-normalize";
import { buildDefaults } from "@/lib/forms/schema";
import { serverRequestMeta, serverFetchJson } from "@/lib/next/server-helpers";

export type EditPrepResult = {
  clientConfig: any;                 // safe-for-client config (functions removed by caller)
  defaults: Record<string, any>;     // merged schema defaults + record
  method: "PATCH";
  action: string;                    // /api/<resourceKey>/<id>
  submitLabel: string;               // "Update"
  options: Record<string, any>;      // e.g. { id }
};

/**
 * Load an existing record and prepare defaults for an edit form.
 * - Normalizes sections (layout) + fields (schema/defaults)
 * - Fetches /api/<resourceKey>/<id> with forwarded cookies
 * - Tolerates both {row: {...}} and flat {...} API shapes
 * - Returns client-safe config + merged defaults
 */
export async function getRecordForEdit(
  cfgInput: any,
  resourceKey: string,
  id: string
): Promise<EditPrepResult> {
  // Normalize config
  const cfg = ensureSections(cfgInput);
  const schemaDefaults = buildDefaults({ ...cfg, fields: getAllFields(cfg) } as any);

  // Build base URL + forward cookie for RLS
  const { base, cookie } = await serverRequestMeta();

  // Fetch existing record
  const url = `${base}/api/${resourceKey}/${id}`;
  const payload = await serverFetchJson<any>(url, { cookie });
  const record = payload?.row ?? payload;

  // Merge defaults
  const defaults = { ...schemaDefaults, ...(record ?? {}) };

  // Strip non-serializable fns before passing config to client components
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = cfg as any;

  return {
    clientConfig,
    defaults,
    method: "PATCH" as const,
    action: `/api/${resourceKey}/${id}`,
    submitLabel: "Update",
    options: { id },
  };
}
