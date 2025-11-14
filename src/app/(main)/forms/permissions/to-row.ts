import type { PermissionRow } from "./permissions.config";

/**
 * Transforms raw API response to PermissionRow.
 */
export function toRow(d: any): PermissionRow {
  return {
    key: String(d?.key ?? ""),
    description: d?.description ?? null,
  };
}

