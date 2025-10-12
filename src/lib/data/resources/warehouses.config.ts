import type { ResourceConfig } from "@/lib/data/types";

const warehousesConfig = {
  table: "warehouses",
  pk: "id",

  select: "id, code, name, is_active, created_at, updated_at",

  search: ["code", "name"] as const,
  defaultSort: { column: "code", desc: false } as const,
  activeFlag: "is_active",

  toDomain: (r: any) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    is_active: !!r.is_active,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  }),

  fromInput: (i: any) => ({
    code: i.code,
    name: i.name,
    is_active: i.is_active ?? true,
  }),

  postProcess: (rows: any[]) => rows,
} satisfies ResourceConfig<any, any>;

export default warehousesConfig;
