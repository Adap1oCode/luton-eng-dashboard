// src/lib/forms/get-record-for-edit.ts
// Purpose: One-stop helper to load a record for edit pages,
//          unwrap {row} payloads, and merge with schema defaults.

import { performance } from "perf_hooks";

import { ensureSections, getAllFields } from "@/lib/forms/config-normalize";
import { buildDefaults } from "@/lib/forms/schema";
import { serverRequestMeta, serverFetchJson } from "@/lib/next/server-helpers";

export type EditPrepResult = {
  clientConfig: any; // safe-for-client config (functions removed by caller)
  defaults: Record<string, any>; // merged schema defaults + record
  method: "PATCH";
  action: string; // /api/<resourceKey>/<id>
  submitLabel: string; // "Update"
  options: Record<string, any>; // e.g. { id }
};

/**
 * Load an existing record and prepare defaults for an edit form.
 * - Normalizes sections (layout) + fields (schema/defaults)
 * - Fetches /api/<resourceKey>/<id> with forwarded cookies
 * - Tolerates both {row: {...}} and flat {...} API shapes
 * - Returns client-safe config + merged defaults
 */
export async function getRecordForEdit(cfgInput: any, resourceKey: string, id: string): Promise<EditPrepResult> {
  const perfStart = performance.now();
  
  // Normalize config
  const cfg = ensureSections(cfgInput);
  const schemaDefaults = buildDefaults({ ...cfg, fields: getAllFields(cfg) } as any);
  const perfConfig = performance.now();
  console.log(`[getRecordForEdit] Config normalization: ${(perfConfig - perfStart).toFixed(2)}ms`);

  // Build base URL + forward cookie for RLS
  const { base, cookie } = await serverRequestMeta();
  const perfMeta = performance.now();
  console.log(`[getRecordForEdit] Server request meta: ${(perfMeta - perfConfig).toFixed(2)}ms`);

  // Fetch existing record
  const url = `${base}/api/${resourceKey}/${id}`;
  const fetchStart = performance.now();
  const payload = await serverFetchJson<any>(url, { cookie });
  const fetchEnd = performance.now();
  console.log(`[getRecordForEdit] API fetch (${url}): ${(fetchEnd - fetchStart).toFixed(2)}ms`);
  const record = payload?.row ?? payload;

  // Merge defaults
  const defaults = { ...schemaDefaults, ...(record ?? {}) };

  // Strip non-serializable fns before passing config to client components
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = cfg as any;

  const perfEnd = performance.now();
  console.log(`[getRecordForEdit] Total time: ${(perfEnd - perfStart).toFixed(2)}ms`);

  return {
    clientConfig,
    defaults,
    method: "PATCH" as const,
    action: `/api/${resourceKey}/${id}`,
    submitLabel: "Update",
    options: {}, // Options are loaded separately via loadOptions(), not here
  };
}
