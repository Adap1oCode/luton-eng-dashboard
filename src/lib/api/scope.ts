// src/lib/api/scope.ts
import type { OwnershipScopeCfg, WarehouseScopeCfg } from "@/lib/data/types";

/**
 * Minimal, version-proof shape for a PostgREST filter builder.
 * (Avoids tight coupling to @supabase/postgrest-js generics.)
 */
type FilterableQB = {
  in(column: string, values: readonly any[]): FilterableQB;
  eq(column: string, value: any): FilterableQB;
};

/**
 * Apply warehouse scope:
 * - mode: "none" => no-op
 * - mode: "column" => in(column, allowedWarehouses), unless global access
 */
export function applyWarehouseScopeToSupabase(
  qb: FilterableQB,
  cfg: WarehouseScopeCfg | undefined,
  ctx: { canSeeAllWarehouses: boolean; allowedWarehouses: string[] }
): FilterableQB {
  if (!cfg || cfg.mode === "none") return qb;

  // Global access unless requireBinding=true forces explicit bindings
  const global = ctx.canSeeAllWarehouses && !cfg.requireBinding;
  if (global) return qb;

  if (cfg.mode === "column") {
    const list = ctx.allowedWarehouses ?? [];
    if (list.length === 0) {
      // No bindings + not global => return empty by using an impossible predicate
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
