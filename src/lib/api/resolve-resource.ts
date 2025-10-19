// src/lib/api/resolve-resource.ts
// Generic resource resolver — registry-based (flat or foldered configs)

import resources from "@/lib/data/resources";
import type { ResourceConfig } from "@/lib/data/types";

/** Unified shape returned to API handlers */
export type ResolvedResource<T = any> = {
  key: string;
  config: ResourceConfig<T, any>;
  toRow?: (domain: T) => any;
  allowRaw: boolean;
};

/**
 * Resolve a resource key into its config.
 * Works with both flat `.config.ts` files and foldered orchestrations,
 * as long as the resource is registered in `src/lib/data/resources/index.ts`.
 */
export async function resolveResource(key: string): Promise<ResolvedResource> {
  if (!key || typeof key !== "string") {
    console.log("[resolveResource] invalid key:", key);
    throw new Error("Invalid resource key.");
  }

  console.log("[resolveResource] lookup key:", key);

  // --- Direct lookup from registry
  const config = (resources as any)[key];
  if (!config) {
    const known = Object.keys(resources).sort().join(", ") || "(none)";
    console.log("[resolveResource] NOT FOUND:", key, "| known:", known);
    throw new Error(`Unknown resource "${key}". Known resources: ${known}`);
  }

  // --- Handle both plain ResourceConfig and { config, toRow, allowRaw }
  let resolvedConfig: ResourceConfig<any, any>;
  let toRow: ((domain: any) => any) | undefined;
  let allowRaw = true;

  if ("config" in config) {
    // ResourceEntry-style object (for orchestrations or complex resources)
    resolvedConfig = (config as any).config;
    toRow = (config as any).toRow;
    allowRaw =
      typeof (config as any).allowRaw === "boolean"
        ? (config as any).allowRaw
        : true;
    console.log("[resolveResource] entry-object:", {
      table: resolvedConfig?.table,
      pk: (resolvedConfig as any)?.pk,
      allowRaw,
    });
  } else {
    // Plain ResourceConfig (flat resource)
    resolvedConfig = config as ResourceConfig<any, any>;
    console.log("[resolveResource] plain-config:", {
      table: resolvedConfig?.table,
      pk: (resolvedConfig as any)?.pk,
    });
  }

  if (!resolvedConfig?.table || !resolvedConfig?.select) {
    console.log("[resolveResource] INVALID CONFIG:", {
      key,
      table: resolvedConfig?.table,
      select: resolvedConfig?.select,
    });
    throw new Error(
      `Resource "${key}" has an invalid config. "table" and "select" are required.`
    );
  }

  console.log("[resolveResource] OK:", {
    key,
    table: resolvedConfig.table,
    pk: (resolvedConfig as any)?.pk,
  });

  return { key, config: resolvedConfig, toRow, allowRaw };
}
