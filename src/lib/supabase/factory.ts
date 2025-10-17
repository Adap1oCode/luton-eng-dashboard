// src/lib/supabase/factory.ts
// Generic, UI-agnostic provider for Supabase-backed resources.
// Handles search, filters, sorting, pagination + relation hydration.

// Module top-level imports (تم إزالة الفراغات بين أسطر الـ imports)
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

import { debugAuth } from "@/lib/api/debug";
import { applyOwnershipScopeToSupabase, applyWarehouseScopeToSupabase } from "@/lib/api/scope";
import { getSessionContext } from "@/lib/auth/get-session-context";
import type { DataProvider, Id, ListParams, ResourceConfig, RelationSpec } from "@/lib/data/types";
import { AUTH_SCOPING_ENABLED } from "@/lib/env";

type Mode = "server" | "browser";

function buildOrIlike(q: string, cols: string[]) {
  return cols.map((c) => `${c}.ilike.%${q}%`).join(",");
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

// Resolve a Supabase client for the given mode, tolerating different export names.
// Always returns a client (never a Promise).
async function getClient(mode: Mode): Promise<any> {
  if (mode === "browser") {
    try {
      const Browser = await import("@/lib/supabase");
      const cand =
        (Browser as any).supabaseBrowser ??
        (Browser as any).getBrowserClient ??
        (Browser as any).createClient ??
        (Browser as any).default;
      if (typeof cand === "function") {
        const c = cand();
        return c && typeof c.then === "function" ? await c : c;
      }
      return Browser;
    } catch {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error("Missing Supabase env vars for browser-mode fallback");
      }
      return createSupabaseJsClient(url, key, {
        auth: { persistSession: false },
      });
    }
  }

  try {
    const Server = await import("@/lib/supabase-server");
    const cand =
      (Server as any).createClient ??
      (Server as any).getServerClient ??
      (Server as any).supabaseServer ??
      (Server as any).default;
    if (typeof cand === "function") {
      const c = cand();
      return c && typeof c.then === "function" ? await c : c;
    }
    return Server;
  } catch {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Missing Supabase env vars for server-mode fallback");
    }
    return createSupabaseJsClient(url, key, {
      auth: { persistSession: false },
    });
  }
}

// -----------------------------------------------------------------------------
// Relation hydration
// -----------------------------------------------------------------------------
async function hydrateRelations<T>(rows: T[], cfg: ResourceConfig<T, any>, sb: any): Promise<T[]> {
  const rels: RelationSpec[] = cfg.relations?.filter((r) => r.includeByDefault) ?? [];
  if (!rows.length || rels.length === 0) return rows;

  const ids = (rows as any[]).map((r) => r[cfg.pk]);

  for (const r of rels) {
    if (r.kind === "manyToMany") {
      const { data: junction, error: jErr } = await sb
        .from(r.viaTable)
        .select(`${r.thisKey}, ${r.thatKey}`)
        .in(r.thisKey, ids);
      if (jErr) throw jErr;

      const targetIdsByParent = new Map<any, any[]>();
      for (const j of junction ?? []) {
        if (!targetIdsByParent.has(j[r.thisKey])) targetIdsByParent.set(j[r.thisKey], []);
        targetIdsByParent.get(j[r.thisKey])!.push(j[r.thatKey]);
      }

      let targetById: Map<any, any> | null = null;
      if (r.resolveAs !== "ids" && (junction?.length ?? 0) > 0) {
        const allTargetIds = Array.from(new Set(junction!.map((j: any) => j[r.thatKey])));
        const { data: targets, error: tErr } = await sb
          .from(r.targetTable)
          .select(r.targetSelect)
          .in("id", allTargetIds);
        if (tErr) throw tErr;
        targetById = new Map(targets.map((x: any) => [x.id, x]));
      }

      for (const row of rows as any[]) {
        const mine = targetIdsByParent.get(row[cfg.pk]) ?? [];
        if (r.resolveAs === "ids") {
          row[r.name] = mine.map(String).sort();
        } else {
          row[r.name] = mine.map((id) => targetById?.get(id)).filter(Boolean);
        }
        if (mine.length === 0 && r.onEmptyPolicy === "ALL") {
          row[`${r.name}_scope`] = "ALL";
        } else if (mine.length === 0) {
          row[`${r.name}_scope`] = "NONE";
        } else {
          row[`${r.name}_scope`] = "RESTRICTED";
        }
      }
    }

    if (r.kind === "oneToMany") {
      const { data: kids, error } = await sb.from(r.targetTable).select(r.targetSelect).in(r.foreignKey, ids);
      if (error) throw error;

      const grouped = new Map<any, any[]>();
      for (const k of kids ?? []) {
        if (!grouped.has(k[r.foreignKey])) grouped.set(k[r.foreignKey], []);
        grouped.get(k[r.foreignKey])!.push(k);
      }

      for (const row of rows as any[]) {
        let arr = grouped.get(row[cfg.pk]) ?? [];
        if (r.orderBy) {
          const { column, desc } = r.orderBy;
          const asc = !desc;
          arr = arr.sort((a, b) => (a[column] < b[column] ? -1 : 1) * (asc ? 1 : -1));
        }
        if (r.limit != null) arr = arr.slice(0, r.limit);
        row[r.name] = arr;
      }
    }

    if (r.kind === "manyToOne") {
      const targetIds = Array.from(new Set((rows as any[]).map((row) => row[r.localKey]).filter(Boolean)));
      let m = new Map<any, any>();
      if (targetIds.length) {
        const { data: parents, error } = await sb.from(r.targetTable).select(r.targetSelect).in("id", targetIds);
        if (error) throw error;
        m = new Map(parents.map((x: any) => [x.id, x]));
      }
      for (const row of rows as any[]) {
        row[r.name] = m.get(row[r.localKey]) ?? null;
      }
    }
  }

  return cfg.postProcess ? cfg.postProcess(rows) : rows;
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------
export function createSupabaseProvider<T, TInput>(
  cfg: ResourceConfig<T, TInput>,
  mode: Mode = "server",
): DataProvider<T, TInput> {
  const isBrowser = mode === "browser";

  return {
    async list(params: ListParams = {}) {
      const { page = 1, pageSize = 50, q, filters, activeOnly, sort } = params;
      const sb = await getClient(mode);

      let query = sb.from(cfg.table).select(cfg.select, { count: "exact" });

      // Apply scoping (server-only + flag-gated)
      if (!isBrowser && AUTH_SCOPING_ENABLED) {
        const ctx = await getSessionContext();

        // 🔒 Warehouse scoping (now passes codes + ids; function picks correctly)
        query = applyWarehouseScopeToSupabase(query, cfg.warehouseScope, {
          canSeeAllWarehouses: ctx.canSeeAllWarehouses,
          allowedWarehouses: ctx.allowedWarehouses, // legacy alias (codes)
          allowedWarehouseCodes: (ctx as any).allowedWarehouseCodes, // enriched (codes)
          allowedWarehouseIds: (ctx as any).allowedWarehouseIds, // enriched (UUIDs)
        });

        // 🔒 Ownership scoping (uses deprecated alias `userId` for now)
        query = applyOwnershipScopeToSupabase(query, cfg.ownershipScope, {
          // Prefer effective app user id (impersonation-safe); fall back to legacy alias
          userId: (ctx as any).effectiveUser?.appUserId ?? (ctx as any).userId,
          permissions: ctx.permissions,
        });

        debugAuth({
          at: "list",
          resource: cfg.table,
          warehouseScope: cfg.warehouseScope,
          ownershipScope: cfg.ownershipScope,
          ctx: {
            userId: (ctx as any).userId,
            effectiveUserAppUserId: (ctx as any).effectiveUser?.appUserId,
            canSeeAllWarehouses: ctx.canSeeAllWarehouses,
            allowedWarehouses: ctx.allowedWarehouses, // legacy
            allowedWarehouseCodes: (ctx as any).allowedWarehouseCodes,
            allowedWarehouseIds: (ctx as any).allowedWarehouseIds,
          },
        });
      }

      if (q && cfg.search?.length) query = query.or(buildOrIlike(q, cfg.search));
      if (isObject(filters)) {
        for (const [k, v] of Object.entries(filters)) {
          query = Array.isArray(v) ? query.in(k, v as any[]) : query.eq(k, v as any);
        }
      }
      if (activeOnly && cfg.activeFlag) query = query.eq(cfg.activeFlag, true);

      const s = sort ?? cfg.defaultSort;
      if (s) query = query.order(s.column, { ascending: !s.desc });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;

      const base = (data ?? []).map(cfg.toDomain);
      const hydrated = await hydrateRelations(base, cfg, sb);
      return { rows: hydrated, page, pageSize, total: count ?? hydrated.length };
    },

    async get(id: Id) {
      const sb = await getClient(mode);
      let query = sb.from(cfg.table).select(cfg.select).eq(cfg.pk, id);

      // Apply scoping to single record (server-only)
      if (!isBrowser && AUTH_SCOPING_ENABLED) {
        const ctx = await getSessionContext();

        // 🔒 Warehouse scoping (same enriched context passed)
        query = applyWarehouseScopeToSupabase(query, cfg.warehouseScope, {
          canSeeAllWarehouses: ctx.canSeeAllWarehouses,
          allowedWarehouses: ctx.allowedWarehouses, // legacy alias (codes)
          allowedWarehouseCodes: (ctx as any).allowedWarehouseCodes, // enriched (codes)
          allowedWarehouseIds: (ctx as any).allowedWarehouseIds, // enriched (UUIDs)
        });

        // 🔒 Ownership scoping
        query = applyOwnershipScopeToSupabase(query, cfg.ownershipScope, {
          // Prefer effective app user id (impersonation-safe); fall back to legacy alias
          userId: (ctx as any).effectiveUser?.appUserId ?? (ctx as any).userId,
          permissions: ctx.permissions,
        });
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const base = cfg.toDomain(data);
      const [hydrated] = await hydrateRelations([base], cfg, sb);
      return hydrated ?? null;
    },

    async create(input: TInput) {
      if (isBrowser) throw new Error("create() not allowed in browser mode");
      const sb = await getClient(mode);
      const payload = cfg.fromInput ? cfg.fromInput(input) : (input as any);
      const { data, error } = await sb.from(cfg.table).insert(payload).select(cfg.pk).single();
      if (error) throw error;
      return data[cfg.pk];
    },

    async update(id: Id, patch: TInput) {
      if (isBrowser) throw new Error("update() not allowed in browser mode");
      const sb = await getClient(mode);
      const payload = cfg.fromInput ? cfg.fromInput(patch) : (patch as any);
      const { error } = await sb.from(cfg.table).update(payload).eq(cfg.pk, id);
      if (error) throw error;
    },

    async remove(id: Id) {
      if (isBrowser) throw new Error("remove() not allowed in browser mode");
      const sb = await getClient(mode);
      const { error } = await sb.from(cfg.table).delete().eq(cfg.pk, id);
      if (error) throw error;
    },
  };
}

export const createSupabaseReadOnlyProvider = <T, TInput>(cfg: ResourceConfig<T, TInput>) =>
  createSupabaseProvider<T, TInput>(cfg, "browser");

export const createSupabaseServerProvider = <T, TInput>(cfg: ResourceConfig<T, TInput>) =>
  createSupabaseProvider<T, TInput>(cfg, "server");
