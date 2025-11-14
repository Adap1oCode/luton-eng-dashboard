import type { ResourceConfig, Role } from "../types";

export type RoleInput = {
  role_code: string;
  role_name: string;
  description?: string | null;
  is_active?: boolean;
  can_manage_roles?: boolean;
  can_manage_cards?: boolean;
  can_manage_entries?: boolean;
  role_family?: string | null;
};

const roles: ResourceConfig<Role, RoleInput> = {
  table: "roles",
  pk: "id",
  select:
    "id, role_code, role_name, description, is_active, can_manage_roles, can_manage_cards, can_manage_entries, role_family, created_at, updated_at",
  search: ["role_code", "role_name"],
  activeFlag: "is_active",
  defaultSort: { column: "role_code" },

  fromInput: (input: RoleInput) => ({
    role_code: String(input.role_code).trim(),
    role_name: String(input.role_name).trim(),
    description: input.description ?? null,
    is_active: input.is_active ?? true,
    can_manage_roles: input.can_manage_roles ?? false,
    can_manage_cards: input.can_manage_cards ?? false,
    can_manage_entries: input.can_manage_entries ?? true,
    role_family: input.role_family ?? null,
  }),

  toDomain: (row: unknown) => row as Role,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      role_code: { type: "text", write: true },
      role_name: { type: "text", write: true },
      description: { type: "text", nullable: true, write: true },
      is_active: { type: "bool", write: true },
      can_manage_roles: { type: "bool", write: true },
      can_manage_cards: { type: "bool", write: true },
      can_manage_entries: { type: "bool", write: true },
      role_family: { type: "text", nullable: true, write: true },
      created_at: { type: "timestamp", nullable: true, readonly: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
    },
  },
};

export default roles;
