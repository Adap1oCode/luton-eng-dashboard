// src/app/(main)/forms/roles/_data/config.ts
import type { ResourceConfig } from "@/lib/data/types";

/** Matches your table schema exactly. */
export type Role = {
  id: string;                    // uuid (PK)
  role_code: string;             // text, NOT NULL
  role_name: string;             // text, NOT NULL
  description: string | null;    // text, nullable
  is_active: boolean;            // boolean, NOT NULL

  // permissions
  can_manage_roles: boolean;     // boolean, NOT NULL
  can_manage_cards: boolean;     // boolean, NOT NULL
  can_manage_entries: boolean;   // boolean, NOT NULL

  // hydrated fields
  // Derived from relation: keep codes for existing consumers (no regression)
  warehouses?: string[];         // array of warehouse codes (e.g. ["RTZ", "BP-WH1"])

  // Added for Roles form table (Assigned[] shape you described)
  assigned?: {
    warehouse: string;           // code (from warehouses.code)
    name: string;                // friendly name (from warehouses.name)
    added_at: string | null;     // not stored; always null per current schema
    added_by: string | null;     // not stored; always null
    note: string | null;         // not stored; always null
  }[];

  warehouses_scope?: "ALL" | "RESTRICTED" | "NONE";
  has_warehouse_restrictions?: boolean;
};

export type RoleInput = {
  role_code: string;
  role_name: string;
  description?: string | null;
  is_active?: boolean;

  can_manage_roles?: boolean;
  can_manage_cards?: boolean;
  can_manage_entries?: boolean;
};

/**
 * RELATED TABLES (as provided):
 * - role_warehouse_rules: role_code (text, NOT NULL), warehouse (text, NOT NULL), role_id (uuid, NULL/→ NOT NULL)
 * - warehouses: code (text, NOT NULL), name (text, NOT NULL)
 *
 * NOTES:
 * - We join via role_warehouse_rules.role_id → roles.id (preferred).
 * - Warehouses have no numeric/uuid PK; we use code. We hydrate objects (code,name)
 *   then derive both `warehouses: string[]` and `assigned[]` for the Roles form.
 */
export const rolesConfig: ResourceConfig<Role, RoleInput> = {
  table: "roles",
  pk: "id",
  select:
    "id, role_code, role_name, description, is_active, can_manage_roles, can_manage_cards, can_manage_entries",

  // Global search across core text fields
  search: ["role_code", "role_name", "description"],
  activeFlag: "is_active",
  defaultSort: { column: "role_code", desc: false },

  // DB → domain
  toDomain: (r: any): Role => ({
    id: r.id,
    role_code: r.role_code,
    role_name: r.role_name,
    description: r.description ?? null,
    is_active: !!r.is_active,

    can_manage_roles: !!r.can_manage_roles,
    can_manage_cards: !!r.can_manage_cards,
    can_manage_entries: !!r.can_manage_entries,
  }),

  // domain input → DB payload (no change; keeps existing behavior)
  fromInput: (i) => ({
    role_code: i.role_code,
    role_name: i.role_name,
    description: i.description ?? null,
    is_active: i.is_active ?? true,

    can_manage_roles: i.can_manage_roles ?? false,
    can_manage_cards: i.can_manage_cards ?? false,
    can_manage_entries: i.can_manage_entries ?? false,
  }),

  // Relations (N–M) → hydrate full warehouse objects so we can derive both codes and Assigned[]
  relations: [
    {
      kind: "manyToMany",
      name: "warehouses",

      // Junction table
      viaTable: "role_warehouse_rules",

      // Join keys
      thisKey: "role_id",     // role_warehouse_rules.role_id → roles.id
      thatKey: "warehouse_id",   // warehouse code stored in junction

      // Target table & select
      targetTable: "warehouses",
      targetSelect: "id, code, name",

      includeByDefault: true,

      // Hydrate objects: [{ code, name }, ...]
      resolveAs: "ids",

      // Business rule: no links ⇒ unrestricted (ALL warehouses)
      onEmptyPolicy: "ALL",
    },
  ],

  // Derive:
  //  - warehouses: string[] codes (preserves existing consumers)
  //  - assigned: {warehouse,name,added_*:null}[] for the Roles form
  //  - warehouses_scope + has_warehouse_restrictions convenience flags
  postProcess: (rows) =>
    rows.map((r: any) => {
      const rel = Array.isArray(r.warehouses) ? r.warehouses : [];

      const isObjectArray =
        rel.length > 0 && typeof rel[0] === "object" && rel[0] !== null;

      const codes: string[] = isObjectArray
        ? rel.map((w: any) => w.code)
        : (r.warehouses ?? []);

      const assigned =
        isObjectArray
          ? rel.map((w: any) => ({
              warehouse: w.code,
              name: w.name,
              added_at: null,
              added_by: null,
              note: null,
            }))
          : [];

      const warehouses_scope: "ALL" | "RESTRICTED" | "NONE" =
        codes.length === 0 ? "ALL" : "RESTRICTED";

      return {
        ...r,
        warehouses: codes,
        assigned,
        warehouses_scope,
        has_warehouse_restrictions: warehouses_scope === "RESTRICTED",
      };
    }),

  // Required schema property
  schema: {
    fields: {
      id: { type: "uuid" },
      role_code: { type: "text" },
      role_name: { type: "text" },
      description: { type: "text", nullable: true },
      is_active: { type: "bool" },
      can_manage_roles: { type: "bool" },
      can_manage_cards: { type: "bool" },
      can_manage_entries: { type: "bool" },
      created_at: { type: "timestamp", nullable: true },
      updated_at: { type: "timestamp", nullable: true },
    },
  },
};
