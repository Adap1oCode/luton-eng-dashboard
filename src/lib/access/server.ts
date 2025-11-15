/**
 * Server-side access utilities
 * 
 * Provides functions to fetch effective access from the materialized view
 * and build guards for server-side route protection.
 */

import "server-only";
import { supabaseServer } from "@/lib/supabase-server";
import { buildGuards, type SessionAccess } from "./guards";

/**
 * Type matching the materialized view structure
 */
type EffectivePermissionsRow = {
  user_id: string;
  role_code: string | null;
  role_family: string | null;
  permissions: string[];
  warehouse_scope: Array<{ 
    warehouse_code: string | null; 
    warehouse_id: string | null; 
    warehouse_name: string | null 
  }>;
};

/**
 * Get effective access for a user from the materialized view.
 * 
 * @param appUserId - The users.id (app user id, not auth id)
 * @returns SessionAccess object ready for building guards, or null if user not found
 */
export async function getEffectiveAccess(appUserId: string): Promise<SessionAccess | null> {
  const supabase = await supabaseServer();

  const { data: viewRow, error: viewErr } = await supabase
    .from("mv_effective_permissions")
    .select("role_code, role_family, permissions, warehouse_scope")
    .eq("user_id", appUserId)
    .maybeSingle<EffectivePermissionsRow>();

  if (viewErr) {
    console.error(`[getEffectiveAccess] Query failed: ${viewErr.message}`);
    return null;
  }

  if (!viewRow) {
    // User has no role/permissions
    return {
      roleCode: null,
      roleFamily: null,
      permissions: [],
      allowedWarehouseCodes: [],
    };
  }

  // Extract warehouse codes from warehouse_scope
  const allowedWarehouseCodes = (viewRow.warehouse_scope ?? [])
    .map((w) => w.warehouse_code)
    .filter((code): code is string => !!code);

  return {
    roleCode: viewRow.role_code ?? null,
    roleFamily: viewRow.role_family ?? null,
    permissions: viewRow.permissions ?? [],
    allowedWarehouseCodes,
  };
}

/**
 * Get guards for a user (server-side).
 * Convenience function that fetches access and builds guards.
 * 
 * @param appUserId - The users.id (app user id, not auth id)
 * @returns Guards object, or null if user not found
 */
export async function getGuards(appUserId: string) {
  const access = await getEffectiveAccess(appUserId);
  if (!access) return null;
  return buildGuards(access);
}










