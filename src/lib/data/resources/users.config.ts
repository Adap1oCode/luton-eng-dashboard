import type { ResourceConfig } from "@/lib/data/types";

const usersConfig = {
  table: "users",
  pk: "id",

  select: "id, full_name, email, role_id, role_code, is_active, is_roles_admin, created_at, updated_at",

  search: ["full_name", "email", "role_code"] as const,
  defaultSort: { column: "created_at", desc: true } as const,
  activeFlag: "is_active",

  toDomain: (r: any) => ({
    id: r.id,
    full_name: r.full_name,
    email: r.email ?? null,
    role_id: r.role_id ?? null,
    role_code: r.role_code ?? null, // TODO: deprecate later
    is_active: !!r.is_active,
    is_roles_admin: !!r.is_roles_admin,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  }),

  fromInput: (i: any) => ({
    full_name: i.full_name,
    email: i.email ?? null,
    role_id: i.role_id ?? null,
    is_active: i.is_active ?? true,
    is_roles_admin: !!i.is_roles_admin,
  }),

  postProcess: (rows: any[]) => rows,
} satisfies ResourceConfig<any, any>;

export default usersConfig;
