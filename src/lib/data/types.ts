// src/lib/data/types.ts

/** Base aliases */
export type UUID = string;
export type Relation<T> = T | null;

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

  // NEW (all optional, used by generators when present)
  required?: boolean;          // if false, treat as optional in Create/Patch
  defaulted?: boolean;         // field has a DB/server default (makes it optional on create)
  enum?: Array<string | number>;
  min?: number;                // numbers: minimum (>=). strings: min length (map as min length if string)
  max?: number;                // numbers: maximum (<=). strings: max length
  length?: number;             // exact length for strings (e.g., codes)
  pattern?: string;            // regex pattern for strings
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

  relations?: Relation<unknown>[];
  postProcess?: (rows: T[]) => T[];

  schema: ResourceSchemaSpec;
};

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
