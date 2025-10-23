// src/lib/data/verify/route.ts
// Internal entrypoint for verifying a resource config.

import { verifyResource } from "./verify-resource";
import resources from "../resources";

type ResourceKey = keyof typeof resources;

/**
 * Run a verification report for a given resource.
 * This is not tied to Next.js Response/Request, so you can:
 *  - Call it from an API route
 *  - Call it from a CLI script
 *  - Call it from tests
 */
export async function runVerification(resource: string) {
  const key = resource.trim() as ResourceKey;

  if (!key || !(key in resources)) {
    return {
      error: `Unknown resource "${resource}"`,
      available: Object.keys(resources),
    };
  }

  const cfg = resources[key];
  const report = await verifyResource(key, cfg as any);
  return report;
}