// -----------------------------------------------------------------------------
// FILE: src/lib/resources/registry.ts
// PURPOSE:
//   Single source of truth for all application resources.
//   • UI route segment = `root` (hyphen-case), e.g. "stock-adjustments"
//   • DB table/view name = `table` (snake_case), e.g. "tcm_user_tally_card_entries"
//   • Permissions are explicit and consistent.
// USAGE:
//   Import `resources` wherever you need to resolve UI → DB table and permissions.
// -----------------------------------------------------------------------------

export type PermissionSet = {
  read: string;
  create: string;
  update: string;
  delete: string;
};

export type ResourceConfig = {
  /** Hyphen-case UI segment used in routes: /api/:root, /api/:root/:id */
  root: string;

  /** Actual DB table or view name (snake_case) */
  table: string;

  /** Permission keys used to authorize CRUD */
  permissions: PermissionSet;

  /**
   * Optional: Zod schema or builder references can be wired later.
   * Keep this minimal for now to avoid coupling API to UI schema.
   */
  // schema?: ZodSchema<any>;
};

/**
 * Registry of all resources in the app.
 * Add new entries here; everything else should reference this registry.
 */
export const resources: Record<string, ResourceConfig> = {
  // Stock Adjustments (User Tally Card Entries)
  // UI path:   /api/stock-adjustments
  // DB table:  tcm_user_tally_card_entries
  "stock-adjustments": {
    root: "stock-adjustments",
    table: "tcm_user_tally_card_entries",
    permissions: {
      read: "resource:user_tally_card_entries:read",
      create: "resource:user_tally_card_entries:create",
      update: "resource:user_tally_card_entries:update",
      delete: "resource:user_tally_card_entries:delete",
    },
  },

  // Add more resources here as you grow:
  // "tally-cards": {
  //   root: "tally-cards",
  //   table: "tcm_tally_cards",
  //   permissions: {
  //     read: "resource:tcm_tally_cards:read",
  //     create: "resource:tcm_tally_cards:create",
  //     update: "resource:tcm_tally_cards:update",
  //     delete: "resource:tcm_tally_cards:delete",
  //   },
  // },
} as const;

/**
 * Get a resource config by its UI root (hyphen-case).
 * Returns undefined if not found.
 */
export function getResource(root: string): ResourceConfig | undefined {
  return resources[root];
}

/**
 * Strict resolver that throws if a resource is unknown.
 * Prefer this in API routes where "not found" should be explicit.
 */
export function requireResource(root: string): ResourceConfig {
  const cfg = getResource(root);
  if (!cfg) {
    throw new Error(`Unknown resource root: "${root}"`);
  }
  return cfg;
}
