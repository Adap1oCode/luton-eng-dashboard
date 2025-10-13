import type { ResourceConfig, User, UUID } from "../types";

export type UserInput = {
  full_name: string;
  email?: string | null;
  role_id?: UUID | null;
  role_code?: string | null;
  is_active?: boolean;
  is_roles_admin?: boolean;
};

const users: ResourceConfig<User, UserInput> = {
  table: "users",
  pk: "id",
  select:
    "id, full_name, email, role_code, is_active, created_at, auth_id, updated_at, role_id, is_roles_admin",
  search: ["full_name", "email", "role_code"],
  activeFlag: "is_active",
  defaultSort: { column: "full_name" },

  fromInput: (input: UserInput) => ({
    full_name: String(input.full_name).trim(),
    email: input.email ?? null,
    role_code: input.role_code ?? null,
    role_id: input.role_id ?? null,
    is_active: input.is_active ?? true,
    is_roles_admin: input.is_roles_admin ?? false,
  }),

  toDomain: (row: unknown) => row as User,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      full_name: { type: "text", write: true },
      email: { type: "text", nullable: true, write: true },
      role_code: { type: "text", nullable: true, write: true },
      is_active: { type: "bool", write: true },
      created_at: { type: "timestamp", nullable: true, readonly: true },
      auth_id: { type: "uuid", nullable: true, readonly: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
      role_id: { type: "uuid", nullable: true, write: true },
      is_roles_admin: { type: "bool", write: true },
    },
  },
};

export default users;
