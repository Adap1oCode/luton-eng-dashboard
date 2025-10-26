// src/lib/data/resources/dbdocs/v_table_report_combined.config.ts
import type { ResourceConfig } from "../../types";

export type DbTableReport = {
  table_schema: string;
  table_name: string;
  columns: any;
  indexes: any;
  constraints: any;
  foreign_keys: any;
  grants: any;
  rls: any;
  triggers: any;
  dependencies: any;
  usage: any;
  size: any;
};

const v_table_report_combined: ResourceConfig<DbTableReport, never> = {
  table: "mv_table_report_combined",
  pk: "table_name",
  select:
    "table_schema, table_name, columns, indexes, constraints, foreign_keys, grants, rls, triggers, dependencies, usage, size",
  search: ["table_name", "table_schema"],
  defaultSort: { column: "table_name" },

  toDomain: (row: unknown) => row as DbTableReport,

  schema: {
    fields: {
      table_schema: { type: "text", readonly: true },
      table_name: { type: "text", readonly: true },
      columns: { type: "text", readonly: true },
      indexes: { type: "text", readonly: true },
      constraints: { type: "text", readonly: true },
      foreign_keys: { type: "text", readonly: true },
      grants: { type: "text", readonly: true },
      rls: { type: "text", readonly: true },
      triggers: { type: "text", readonly: true },
      dependencies: { type: "text", readonly: true },
      usage: { type: "text", readonly: true },
      size: { type: "text", readonly: true },
    },
  },
};

export default v_table_report_combined;

