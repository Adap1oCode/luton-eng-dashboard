// src/lib/api/scope-guards.ts
import type { OwnershipScopeCfg, WarehouseScopeCfg } from "@/lib/data/types";

export function assertRowInWarehouseScope(
  row: Record<string, unknown>,
  cfg: WarehouseScopeCfg | undefined,
  ctx: { canSeeAllWarehouses: boolean; allowedWarehouses: string[] },
) {
  if (!cfg || cfg.mode === "none") return;
  if (ctx.canSeeAllWarehouses && !cfg.requireBinding) return;

  if (cfg.mode === "column") {
    const w = row?.[cfg.column] as string | undefined | null;
    const ok = !!w && ctx.allowedWarehouses.includes(w);
    if (!ok) {
      const err = new Error("forbidden_out_of_scope_warehouse");
      (err as any).status = 403;
      throw err;
    }
  }
}

export function assertRowInOwnershipScope(
  row: Record<string, unknown>,
  cfg: OwnershipScopeCfg,
  ctx: { userId: string; permissions: string[] },
) {
  if (!cfg || cfg.mode !== "self") return;
  const bypass = cfg.bypassPermissions?.some((p) =>
    ctx.permissions.includes(p),
  );
  if (bypass) return;

  const owner = row?.[cfg.column] as string | undefined | null;
  if (!owner || owner !== ctx.userId) {
    const err = new Error("forbidden_out_of_scope_owner");
    (err as any).status = 403;
    throw err;
  }
}
