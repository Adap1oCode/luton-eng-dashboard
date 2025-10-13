import type { ResourceConfig, UUID } from "../types";

/**
 * NOTE: Your shared type enforces a single-column pk at this layer.
 * The physical table is composite (role_id, warehouse_id). We use 'role_id'
 * as pk here so the types compile; routes that need both can accept
 * 'warehouse_id' via query/body when necessary.
 */

export type RoleWarehouseRule = {
  role_id: UUID;
  warehouse_id: UUID;
  role_code: string;
  warehouse: string; // warehouse code text
};

export type RoleWarehouseRuleInput = {
  role_id: UUID;
  warehouse_id: UUID;
  role_code: string;
  warehouse: string;
};

const role_warehouse_rules: ResourceConfig<
  RoleWarehouseRule,
  RoleWarehouseRuleInput
> = {
  table: "role_warehouse_rules",
  pk: "role_id", // single-column pk per current layer constraints
  select: "role_id, warehouse_id, role_code, warehouse",
  search: ["role_code", "warehouse"],
  defaultSort: { column: "role_code" },

  fromInput: (input: RoleWarehouseRuleInput) => ({
    role_id: input.role_id,
    warehouse_id: input.warehouse_id,
    role_code: String(input.role_code).trim(),
    warehouse: String(input.warehouse).trim(),
  }),

  toDomain: (row: unknown) => row as RoleWarehouseRule,

  schema: {
    fields: {
      role_id: { type: "uuid", write: true },
      warehouse_id: { type: "uuid", write: true },
      role_code: { type: "text", write: true },
      warehouse: { type: "text", write: true },
    },
  },
};

export default role_warehouse_rules;
