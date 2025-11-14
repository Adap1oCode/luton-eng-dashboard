import type { PermissionRow } from "./permissions.config";

/**
 * Transforms raw API response to PermissionRow.
 */
export function toRow(d: any): PermissionRow {
  const key = String(d?.key ?? "");
  return {
    id: key, // id is required for makeActionsColumn
    key: key, // keep key for compatibility
    description: d?.description ?? null,
  };
}


