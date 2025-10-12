import type { ResourceConfig } from "@/lib/data/types";

const rolesConfig = {
  table: "public.roles",
  pk: "id",

  select:
    "id, role_code, role_name, description, is_active, can_manage_roles, can_manage_cards, can_manage_entries, created_at, updated_at",

  search: ["role_code", "role_name"] as const,
  defaultSort: { column: "role_code", desc: false } as const,
  activeFlag: "is_active",

  toDomain: (r: any) => ({
    id: r.id,
    role_code: r.role_code,
    role_name: r.role_name,
    description: r.description ?? null,
    is_active: !!r.is_active,
    can_manage_roles: !!r.can_manage_roles,
    can_manage_cards: !!r.can_manage_cards,
    can_manage_entries: !!r.can_manage_entries,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  }),

  fromInput: (i: any) => ({
    role_code: i.role_code,
    role_name: i.role_name,
    description: i.description ?? null,
    is_active: i.is_active ?? true,
    can_manage_roles: !!i.can_manage_roles,
    can_manage_cards: !!i.can_manage_cards,
    can_manage_entries: !!i.can_manage_entries,
  }),

  postProcess: (rows: any[]) => rows,
} satisfies ResourceConfig<any, any>;

export default rolesConfig;
