import type { UserRow } from "./users.config";

export function toRow(d: any): UserRow {
  return {
    id: d?.id ?? "",
    name: d?.full_name ?? d?.name ?? null,
    email: d?.email ?? null,
    role: d?.role_name ?? d?.role ?? null,
    created_at: d?.created_at ?? null,
    active: d?.is_active ?? null,
  };
}






