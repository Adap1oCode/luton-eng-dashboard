"use client";

import { supabaseBrowser } from "@/lib/supabase";
import type { RolesProvider } from "../provider";
import type { Id, Role, RoleInput, ListParams, Paged } from "../types";

const sb = supabaseBrowser();

function toRole(r: any): Role {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    is_active: !!r.is_active,
    created_at: r.created_at,
    updated_at: r.updated_at ?? null,
  };
}

function paginate<T>(rows: T[], { page = 1, pageSize = 50 }: ListParams = {}): Paged<T> {
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page, pageSize, total: rows.length };
}

export const supabaseRolesProvider: RolesProvider = {
  async listRoles(params = {}) {
    // Simple client-side pagination; switch to range() if dataset grows
    const { data, error } = await sb
      .from("roles")
      .select("id, name, description, is_active, created_at, updated_at")
      .order("name");

    if (error) throw error;

    let rows = (data ?? []).map(toRole);

    if (params.activeOnly) rows = rows.filter((r) => r.is_active);
    if (params.q) {
      const q = params.q.toUpperCase();
      rows = rows.filter(
        (r) =>
          r.name.toUpperCase().includes(q) ||
          (r.description ?? "").toUpperCase().includes(q)
      );
    }

    return paginate(rows, params);
  },

  async getRole(id: Id) {
    const { data, error } = await sb
      .from("roles")
      .select("id, name, description, is_active, created_at, updated_at")
      .eq("id", id)
      .single();

    // PGRST116 = no rows found
    if (error && (error as any).code !== "PGRST116") throw error;
    return data ? toRole(data) : null;
  },

  // ⛔️ Mutations must go through server actions (src/app/(main)/forms/roles/actions.ts)
  async createRole(_input: RoleInput): Promise<Id> {
    throw new Error("[rolesProvider] createRole is server-only. Use actions.ts.");
  },

  async updateRole(_id: Id, _patch: RoleInput): Promise<void> {
    throw new Error("[rolesProvider] updateRole is server-only. Use actions.ts.");
  },

  async deleteRole(_id: Id): Promise<void> {
    throw new Error("[rolesProvider] deleteRole is server-only. Use actions.ts.");
  },
};
