import type { ResourceConfig, Warehouse } from "../types";

export type WarehouseInput = {
  code: string;
  name: string;
  is_active?: boolean;
};

const warehouses: ResourceConfig<Warehouse, WarehouseInput> = {
  table: "warehouses",
  pk: "id",
  select: "id, code, name, is_active, created_at, updated_at",
  search: ["code", "name"],
  activeFlag: "is_active",
  defaultSort: { column: "code" },

  fromInput: (input: WarehouseInput) => ({
    code: String(input.code).trim(),
    name: String(input.name).trim(),
    is_active: input.is_active ?? true,
  }),

  toDomain: (row: unknown) => row as Warehouse,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      code: { type: "text", write: true },
      name: { type: "text", write: true },
      is_active: { type: "bool", write: true },
      created_at: { type: "timestamp", nullable: true, readonly: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
    },
  },
};

export default warehouses;
