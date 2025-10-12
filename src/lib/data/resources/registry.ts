// src/lib/resources/registry.ts
// Central registry mapping resource keys to their configs and (optional) projections.
// This keeps the API layer generic and UI-agnostic.

import type { ResourceConfig } from "@/lib/data/types";

// --- Resource entry type (projection is optional) ---
export type ResourceEntry<T, TInput = any> = {
  key: string;                       // e.g., "tally_cards"
  config: ResourceConfig<T, TInput>; // table, select, pk, search, defaultSort, toDomain, etc.
  toRow?: (domain: T) => any;        // optional mapper for UI-friendly shapes
  allowRaw?: boolean;                // if true, API can bypass projection via ?raw=true
};

// --- Tally Cards wiring (kept as-is to avoid regressions right now) ---
import { tcmTallyCardsConfig } from "@/app/(main)/forms/tally_cards/_data/config";
import { toRow as tallyCardsToRow } from "@/app/(main)/forms/tally_cards/projection";

// If you have other resources, import their configs/projections here in the same pattern.
// Example placeholders (uncomment when you add them):
// import { poConfig } from "@/lib/resources/purchase_orders/config";
// import { toRow as poToRow } from "@/lib/resources/purchase_orders/projection";

// --- Registry map ---
// IMPORTANT: Keys must match the [resource] segment used by the generic route.
export const resources = {
  tally_cards: {
    key: "tally_cards",
    config: tcmTallyCardsConfig as ResourceConfig<any, any>,
    toRow: tallyCardsToRow,
    allowRaw: true, // let callers request raw domain rows via ?raw=true when useful
  },
  // Add more resources here:
  // purchase_orders: { key: "purchase_orders", config: poConfig, toRow: poToRow, allowRaw: true },
} satisfies Record<string, ResourceEntry<any, any>>;

// --- Access helpers ---
export function hasResource(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(resources, key);
}

export function getResource<T = any, TInput = any>(key: string): ResourceEntry<T, TInput> | null {
  return (resources as any)[key] ?? null;
}

// Optional: small guard for friendly errors in route handlers.
export function requireResource<T = any, TInput = any>(key: string): ResourceEntry<T, TInput> {
  const entry = getResource<T, TInput>(key);
  if (!entry) {
    const known = Object.keys(resources).sort().join(", ") || "(none)";
    throw new Error(`Unknown resource "${key}". Known resources: ${known}`);
  }
  return entry;
}
