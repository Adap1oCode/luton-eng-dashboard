import type { RoleRow } from "./roles.config";

/**
 * Transforms raw API response to RoleRow.
 * Shared between server and client to ensure type consistency.
 */
export function toRow(d: any): RoleRow {
  return {
    id: String(d?.id ?? ""),
    role_code: String(d?.role_code ?? ""),
    role_name: String(d?.role_name ?? ""),
    warehouses: Array.isArray(d?.warehouses) ? d.warehouses : [],
    is_active: Boolean(d?.is_active ?? false),
  };
}






