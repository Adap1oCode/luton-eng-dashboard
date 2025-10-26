// src/lib/data/types.ts

/** Base aliases */
export type UUID = string;
export type Id = UUID;

export type ISODateTime = string;
export type SortSpec = { column: string; desc?: boolean };
export type FilterValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>;

/** List params used by list handlers (1-based page index) */
export type ListParams = {
  page?: number; // 1-based
  pageSize?: number;
  q?: string;
  filters?: Record<string, FilterValue>;
  activeOnly?: boolean;
  sort?: SortSpec;
};

/** Registry-first schema metadata (single source of truth for generators) */
export type ColumnType =
  | "uuid"
  | "text"
  | "bool"
  | "int"
  | "bigint"
  | "number"
  | "timestamp";

export type FieldSpec = {
  type: "uuid" | "text" | "bool" | "int" | "bigint" | "number" | "timestamp";
  nullable?: boolean;
  write?: boolean;
  readonly?: boolean;

  // Optional metadata (useful for form generators / validation)
  required?: boolean;          // if false, treat as optional in Create/Patch
  defaulted?: boolean;         // field has a DB/server default (optional on create)
  enum?: Array<string | number>;
  min?: number;                // numbers: minimum (>=) | strings: min length
  max?: number;                // numbers: maximum (<=) | strings: max length
  length?: number;             // exact string length
  pattern?: string;            // regex for strings
  format?: "email" | "url" | "hostname" | "ipv4" | "ipv6" | "date" | "date-time";
  description?: string;
  example?: unknown;
};

export type ResourceSchemaSpec = {
  fields: Record<string, FieldSpec>;
};

/** Response envelopes */
export type ListResult<T> = { rows: T[]; total: number };
export type SingleResult<T> = { row: T };
export type SuccessResult = { success: true };
export type ErrorResult = { error: { message: string; code?: string } };

/** Mapped helpers from schema metadata */
export type TypeFromColumn<T> = T extends "uuid"
  ? UUID
  : T extends "text"
  ? string
  : T extends "bool"
  ? boolean
  : T extends "int"
  ? number
  : T extends "bigint"
  ? number
  : T extends "number"
  ? number
  : T extends "timestamp"
  ? ISODateTime
  : unknown;

export type WriteModelFromSchema<S extends ResourceSchemaSpec> = {
  [K in keyof S["fields"] as S["fields"][K] extends { write: true }
    ? S["fields"][K] extends { readonly: true }
      ? never
      : K
    : never]: S["fields"][K] extends { type: infer T; nullable: true }
    ? TypeFromColumn<T> | null
    : S["fields"][K] extends { type: infer T }
    ? TypeFromColumn<T>
    : never;
};

export type PatchModelFromSchema<S extends ResourceSchemaSpec> = Partial<
  WriteModelFromSchema<S>
>;

/* =========================================================================================
   ACCESS SCOPING — Optional descriptors generic handlers can use.
   They let you express:
     1) "I can only see MY data"                -> ownershipScope: { mode: "self", column: "user_id" }
     2) "I can only see MY warehouse(s)"        -> warehouseScope: { mode: "column", column: "warehouse" }
     3) "I can see MULTIPLE warehouses"         -> via SessionContext.allowedWarehouses (runtime)
     4) "I can see EVERYBODY (global bypass)"   -> via canSeeAllWarehouses or bypassPermissions
========================================================================================= */

/** Warehouse scope descriptor */
export type WarehouseScopeCfg =
  | { mode: "none" }
  | {
      mode: "column";
      /** Column in the selected projection that contains warehouse code/id (e.g., "warehouse") */
      column: string;
      /**
       * When true, require at least one binding to see data (ignore session.canSeeAllWarehouses).
       * Defaults false to keep the “empty bindings => global” rule.
       */
      requireBinding?: boolean;
    };

/** Ownership scope descriptor */
export type OwnershipScopeCfg =
  | undefined
  | {
      mode: "self";
      /** Column that holds the owning user's id (typically "user_id" or "created_by") */
      column: string;
      /** Any of these permissions bypass the self-only restriction (e.g., admin/read:any). */
      bypassPermissions?: string[];
    };

/* =========================================================================================
   RELATION SPECS — Strongly-typed relation metadata for hydration.
   This replaces the previous generic Relation<unknown>[] which made TSC infer 'unknown'.
========================================================================================= */

export type ManyToManyRelationSpec = {
  kind: "manyToMany";
  name: string;                       // property to set on each row
  includeByDefault?: boolean;

  viaTable: string;                   // junction table
  thisKey: string;                    // FK in junction pointing to parent (cfg.pk)
  thatKey: string;                    // FK in junction pointing to target id

  // When resolveAs !== "ids", we fetch from targetTable to embed objects
  targetTable: string;
  targetSelect: string;               // projection for target fetch
  resolveAs: "ids" | "objects";

  // Optional scope label for debug/UX: if no junction rows exist
  onEmptyPolicy?: "ALL" | "NONE" | "RESTRICTED";
};

export type OneToManyRelationSpec = {
  kind: "oneToMany";
  name: string;                       // property to set on each row (array)
  includeByDefault?: boolean;

  targetTable: string;                // child table
  targetSelect: string;               // projection
  foreignKey: string;                 // column on child referencing parent pk

  orderBy?: SortSpec;                 // optional ordering
  limit?: number;                     // optional limit per parent
};

export type ManyToOneRelationSpec = {
  kind: "manyToOne";
  name: string;                       // property to set on each row (single object)
  includeByDefault?: boolean;

  targetTable: string;                // parent table
  targetSelect: string;               // projection
  localKey: string;                   // column on row referencing target id
};

export type RelationSpec =
  | ManyToManyRelationSpec
  | OneToManyRelationSpec
  | ManyToOneRelationSpec;

/** ResourceConfig (pk is single-column only at this layer) */
export type ResourceConfig<T, TInput> = {
  table: string;
  pk: string; // single-column only
  select: string;
  search?: string[];
  activeFlag?: string;
  defaultSort?: SortSpec;

  toDomain: (row: unknown) => T;
  fromInput?: (input: TInput) => unknown;

  relations?: RelationSpec[];
  postProcess?: (rows: T[]) => T[];

  schema: ResourceSchemaSpec;

  /** Optional scoping descriptors consumed by generic handlers */
  warehouseScope?: WarehouseScopeCfg;
  ownershipScope?: OwnershipScopeCfg;
};

/* =========================================================================================
   Provider abstraction — central place (imported by supabase/factory.ts)
========================================================================================= */

export interface DataProvider<T, TInput> {
  list(params?: ListParams): Promise<{ rows: T[]; page: number; pageSize: number; total: number }>;
  get(id: Id): Promise<T | null>;
  create(input: TInput): Promise<Id>;
  update(id: Id, patch: TInput): Promise<void>;
  remove(id: Id): Promise<void>;
}

/** Domain types */
export interface Warehouse {
  id: UUID;
  code: string;
  name: string;
  is_active: boolean;
  created_at: ISODateTime | null;
  updated_at: ISODateTime | null;
}

export interface Role {
  id: UUID;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  can_manage_roles: boolean;
  can_manage_cards: boolean;
  can_manage_entries: boolean;
  created_at: ISODateTime | null;
  updated_at: ISODateTime | null;
}

export interface TcmTallyCard {
  id: UUID;
  card_uid: UUID | null;
  warehouse_id: UUID;
  tally_card_number: string;
  item_number: number | string;
  note: string | null;
  is_active: boolean;
  snapshot_at: ISODateTime | null;
  hashdiff: string | null;
  created_at: ISODateTime | null;
}

export interface TcmTallyCardCurrent {
  card_uid: UUID;
  warehouse_id: UUID;
  tally_card_number: string;
  item_number: string;
  note: string | null;
  is_active: boolean;
  snapshot_at: ISODateTime | null;
}

export interface TcmUserEntry {
  user_id: UUID;
  card_uid: UUID | null;
  qty: number | null;
  location: string | null;
  note: string | null;
  updated_at: ISODateTime | null;
}

export interface User {
  id: UUID;
  full_name: string;
  email: string | null;
  role_id: UUID | null;
  role_code: string | null;
  is_active: boolean;
  is_roles_admin: boolean;
  created_at: ISODateTime | null;
  updated_at: ISODateTime | null;
}

export interface DbTableReport {
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
}