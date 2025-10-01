"use server";

import { supabaseServer } from "@/lib/supabase-server";
import type { RoleInput } from "./_data/types";

// ---- Roles ----
export async function createRole(input: RoleInput) {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("roles")
    .insert({
      name: input.name.trim(),
      description: input.description ?? null,
      is_active: input.is_active ?? true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

export async function updateRole(id: string, patch: RoleInput) {
  const sb = await supabaseServer();
  const update: Record<string, any> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.is_active !== undefined) update.is_active = patch.is_active;
  const { error } = await sb.from("roles").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteRole(id: string) {
  const sb = await supabaseServer();
  const { error } = await sb.from("roles").delete().eq("id", id);
  if (error) throw error;
}

// ---- Role ↔ Warehouse assignments ----
export async function addRoleWarehouse(roleId: string, warehouse: string, note: string | null) {
  const sb = await supabaseServer();
  const { error } = await sb
    .from("role_warehouse_rules")
    .insert({
      role_id: roleId,
      warehouse,
      note: note ?? null,
    });
  if (error) throw error;
}

export async function removeRoleWarehouses(roleId: string, warehouses: string[]) {
  const sb = await supabaseServer();
  // PK is (role_id, warehouse)
  const { error } = await sb
    .from("role_warehouse_rules")
    .delete()
    .eq("role_id", roleId)
    .in("warehouse", warehouses);
  if (error) throw error;
}
