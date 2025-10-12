import type { ResourceConfig } from "@/lib/data/types";

const roleWarehouseRulesConfig: ResourceConfig<any, any> = {
  table: "public.role_warehouse_rules",
  pk: "id", // not real DB PK, but required for typing; we’ll override in toDomain

  select: "role_id, warehouse_id",

  search: [] as const,
  defaultSort: { column: "role_id", desc: false } as const,

  toDomain: (r: any) => ({
    id: `${r.role_id}:${r.warehouse_id}`, // virtual ID for UI keys
    role_id: r.role_id,
    warehouse_id: r.warehouse_id,
  }),

  fromInput: (i: any) => ({
    role_id: i.role_id,
    warehouse_id: i.warehouse_id,
  }),

  postProcess: (rows: any[]) => rows,
};

export default roleWarehouseRulesConfig;
