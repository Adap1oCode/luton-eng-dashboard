import type { ResourceConfig } from "../types";

export type Permission = {
  key: string;
  description: string | null;
};

export type PermissionInput = {
  key: string;
  description?: string | null;
};

const permissions: ResourceConfig<Permission, PermissionInput> = {
  table: "permissions",
  pk: "key",
  select: "key, description",
  search: ["key", "description"],
  // No activeFlag - permissions don't have is_active
  defaultSort: { column: "key" },

  fromInput: (input: PermissionInput) => ({
    key: String(input.key).trim(),
    description: input.description ?? null,
  }),

  toDomain: (row: unknown) => row as Permission,

  schema: {
    fields: {
      key: { type: "text", write: true },
      description: { type: "text", nullable: true, write: true },
    },
  },
};

export default permissions;







