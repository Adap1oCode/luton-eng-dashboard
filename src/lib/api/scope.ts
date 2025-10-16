import type { OwnershipScopeCfg, WarehouseScopeCfg } from "@/lib/data/types";

/**
 * Minimal, version-proof shape for a PostgREST filter builder.
 * (Avoids tight coupling to @supabase/postgrest-js generics.)
 */
type FilterableQB = {
  in(column: string, values: readonly any[]): FilterableQB;
  eq(column: string, value: any): FilterableQB;
};

/** Heuristic: treat columns ending with `_id` as UUID-scoped. */
function columnWantsIds(column: string) {
  return /_id$/i.test(column);
}

/**
 * Apply warehouse scope:
 * - mode: "none" => no-op
 * - mode: "column" => in(column, allowed ...), unless global access
 *
 * NOTE:
 *  - If cfg.column ends with `_id`, we prefer allowedWarehouseIds (UUIDs).
 *  - Else we fall back to codes (allowedWarehouseCodes / allowedWarehouses).
 */
export function applyWarehouseScopeToSupabase(
  qb: FilterableQB,
  cfg: WarehouseScopeCfg | undefined,
  ctx: {
    canSeeAllWarehouses: boolean;
    /** legacy alias (codes) */
    allowedWarehouses?: string[];
    /** enriched (preferred) */
    allowedWarehouseCodes?: string[];
    allowedWarehouseIds?: string[];
  }
): FilterableQB {
  if (!cfg || cfg.mode === "none") return qb;

  // Global access unless requireBinding=true forces explicit bindings
  const global = ctx.canSeeAllWarehouses && !(cfg as any).requireBinding;
  if (global) return qb;

  if (cfg.mode === "column") {
    // Decide which list to use (ids for *_id, else codes)
    const useIds = columnWantsIds(cfg.column);
    const codes =
      ctx.allowedWarehouseCodes ??
      ctx.allowedWarehouses /* legacy alias */ ??
      [];
    const ids = ctx.allowedWarehouseIds ?? [];

    const list = useIds ? ids : codes;

    if (!list || list.length === 0) {
      // No bindings + not global => ensure empty result via impossible predicate
      return qb.in(cfg.column, ["__NO_ALLOWED_WAREHOUSES__"]);
    }
    return qb.in(cfg.column, list);
  }

  return qb;
}

/**
 * Apply ownership scope:
 * - mode: "self" => eq(column, userId) unless a bypass permission is present
 */
export function applyOwnershipScopeToSupabase(
  qb: FilterableQB,
  cfg: OwnershipScopeCfg,
  ctx: { userId: string; permissions: string[] }
): FilterableQB {
  if (!cfg || cfg.mode !== "self") return qb;

  const bypass = cfg.bypassPermissions?.some((p) => ctx.permissions.includes(p));
  if (bypass) return qb;

  return qb.eq(cfg.column, ctx.userId);
}
