"use server";

import { supabaseServer } from "@/lib/supabase-server";

import type { RoleInput } from "../_data/types";

// ---- Roles ----
export async function createRole(input: RoleInput) {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("roles")
    .insert({
      role_name: input.name.trim(),
      description: input.description ?? null,
      is_active: input.is_active ?? true,
      role_family: input.role_family ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateRole(id: string, patch: RoleInput) {
  const sb = await supabaseServer();
  const update: Record<string, any> = {};
  if (patch.name !== undefined) update.role_name = patch.name.trim();
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.is_active !== undefined) update.is_active = patch.is_active;
  if (patch.role_family !== undefined) update.role_family = patch.role_family;
  const { error } = await sb.from("roles").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteRole(id: string) {
  const sb = await supabaseServer();
  const { error } = await sb.from("roles").delete().eq("id", id);
  if (error) throw error;
}

// ---- Role ↔ Warehouse assignments ----
export async function addRoleWarehouse(roleId: string, warehouseCode: string, note: string | null) {
  const sb = await supabaseServer();
  
  // Look up warehouse_id from warehouse code
  const { data: warehouse, error: warehouseErr } = await sb
    .from("warehouses")
    .select("id")
    .eq("code", warehouseCode)
    .single();
  
  if (warehouseErr) throw warehouseErr;
  if (!warehouse?.id) throw new Error(`Warehouse with code "${warehouseCode}" not found`);
  
  const { error } = await sb.from("role_warehouse_rules").insert({
    role_id: roleId,
    warehouse_id: warehouse.id,
    note: note ?? null,
  });
  if (error) throw error;
}

export async function removeRoleWarehouses(roleId: string, warehouseCodes: string[]) {
  const sb = await supabaseServer();
  
  // Look up warehouse_ids from warehouse codes
  const { data: warehouses, error: warehouseErr } = await sb
    .from("warehouses")
    .select("id")
    .in("code", warehouseCodes);
  
  if (warehouseErr) throw warehouseErr;
  
  const warehouseIds = (warehouses ?? []).map((w: any) => w.id).filter(Boolean);
  if (warehouseIds.length === 0) return; // Nothing to delete
  
  // Delete by role_id and warehouse_id
  const { error } = await sb
    .from("role_warehouse_rules")
    .delete()
    .eq("role_id", roleId)
    .in("warehouse_id", warehouseIds);
  
  if (error) throw error;
}

// ---- Role Family ↔ Permission assignments ----
export async function addRoleFamilyPermission(roleFamily: string, permissionKey: string) {
  const sb = await supabaseServer();
  const { error } = await sb.from("permission_assignments").insert({
    role_family: roleFamily,
    permission_key: permissionKey,
    role_id: null,
    user_id: null,
  });
  if (error) throw error;
}

export async function removeRoleFamilyPermissions(roleFamily: string, permissionKeys: string[]) {
  const sb = await supabaseServer();
  const { error } = await sb
    .from("permission_assignments")
    .delete()
    .eq("role_family", roleFamily)
    .in("permission_key", permissionKeys)
    .is("role_id", null)
    .is("user_id", null);
  if (error) throw error;
}
