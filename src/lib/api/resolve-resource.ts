// src/lib/api/resolve-resource.ts
// Dynamically resolve a resource's config and optional projection by naming convention.

import type { ResourceConfig } from "@/lib/data/types";

export type ResolvedResource<T = any> = {
  key: string;
  config: ResourceConfig<T, any>;
  toRow?: (domain: T) => any;
  allowRaw: boolean;
};

/**
 * By convention we expect these modules under:
 *   - src/lib/data/resources/<resource>/config.ts
 *   - src/lib/data/resources/<resource>/projection.ts (optional)
 *
 * IMPORTANT: Include ".ts" in the static part of the import path for Vite.
 */
export async function resolveResource(key: string): Promise<ResolvedResource> {
  if (!key || typeof key !== "string") {
    throw new Error("Invalid resource key.");
  }

  // ---- Load config (required)
  let cfgMod: any;
  try {
    cfgMod = await import(
      /* @vite-ignore */ `@/lib/data/resources/${key}/config.ts`
    );
  } catch {
    throw new Error(
      `Unknown resource "${key}". No config found at lib/data/resources/${key}/config.ts`
    );
  }

  const config: ResourceConfig<any, any> =
    (cfgMod?.default as ResourceConfig<any, any>) ??
    (cfgMod?.config as ResourceConfig<any, any>);

  if (!config || !config.table || !config.select) {
    throw new Error(
      `Resource "${key}" has an invalid config. "table" and "select" are required.`
    );
  }

  const allowRaw: boolean =
    typeof cfgMod?.allowRaw === "boolean" ? cfgMod.allowRaw : true;

  // ---- Load projection (optional)
  let toRow: ((d: any) => any) | undefined;
  try {
    const proj = await import(
      /* @vite-ignore */ `@/lib/data/resources/${key}/projection.ts`
    );
    if (typeof proj?.toRow === "function") toRow = proj.toRow;
    else if (typeof proj?.default === "function") toRow = proj.default;
  } catch {
    // no projection is fine
  }

  return { key, config, toRow, allowRaw };
}
