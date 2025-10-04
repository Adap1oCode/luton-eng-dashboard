// lib/data/types.ts

// A generic identifier used across tables.
// Keep it broad to accommodate UUID (string) or numeric IDs if any legacy tables use them.
export type Id = string | number;

// Common query params for listing resources.
// - q: global search across configured columns
// - filters: exact-match filters per column (extendable later to gt/lt/in operators if needed)
// - activeOnly: honors a configured boolean column like `is_active` when present
// - sort: per-request override; falls back to a resource's defaultSort if omitted
export type ListParams = {
  page?: number;                 // 1-based
  pageSize?: number;             // default defined by provider
  q?: string;                    // global search string
  filters?: Record<string, unknown>;
  activeOnly?: boolean;
  sort?: { column: string; desc?: boolean };
};

// Normalized paged shape returned by list() for any T.
export type Paged<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;                 // exact if supported by backend; otherwise best-effort
};

// The generic provider contract every resource uses.
// We keep names minimal & consistent across all entities.
// NOTE: remove() instead of delete() to avoid reserved keyword clashes.
export interface DataProvider<T, TInput> {
  list(params?: ListParams): Promise<Paged<T>>;
  get(id: Id): Promise<T | null>;
  create(input: TInput): Promise<Id>;
  update(id: Id, patch: TInput): Promise<void>;
  remove(id: Id): Promise<void>;
}

// ---- Relationship primitives (lightweight, UI-agnostic) ----

// Supported relation kinds for config-driven hydration.
export type RelationKind = "oneToMany" | "manyToOne" | "manyToMany";

export type ManyToMany = {
  kind: "manyToMany";
  name: string;                 // property name on the domain object (e.g., "warehouses")
  viaTable: string;             // junction table (e.g., "role_warehouses")
  thisKey: string;              // column in junction referencing THIS resource PK (e.g., "role_id")
  thatKey: string;              // column in junction referencing TARGET PK (e.g., "warehouse_id")
  targetTable: string;          // e.g., "warehouses"
  targetSelect: string;         // projection for target rows (e.g., "id, code, name")
  includeByDefault?: boolean;   // auto-hydrate on list/get
  resolveAs?: "objects" | "ids";// attach as array of objects or ID array
  onEmptyPolicy?: "ALL" | "NONE" | "EMPTY_ARRAY"; // domain rule when no links exist
};

export type OneToMany = {
  kind: "oneToMany";
  name: string;                 // property on domain (e.g., "history")
  targetTable: string;          // e.g., "tally_card_history"
  foreignKey: string;           // column on target referencing THIS PK (e.g., "tally_card_id")
  targetSelect: string;         // projection for child rows
  orderBy?: { column: string; desc?: boolean };
  limit?: number;               // optional cap for large histories
  includeByDefault?: boolean;
};

export type ManyToOne = {
  kind: "manyToOne";
  name: string;                 // property on domain (e.g., "warehouse")
  targetTable: string;          // e.g., "warehouses"
  targetSelect: string;         // projection for parent row
  localKey: string;             // column on THIS table holding target ID (e.g., "warehouse_id")
  includeByDefault?: boolean;
};

export type Relation =
  | ManyToMany
  | OneToMany
  | ManyToOne;

// A generic resource config that describes how to read/write a table
// and (optionally) hydrate relations in a batch-safe way.
export type ResourceConfig<T, TInput> = {
  table: string;                 // base table or view name
  pk: string;                    // primary key column
  select: string;                // projection for base rows
  search?: string[];             // columns to OR-ilike when q is provided
  activeFlag?: string;           // boolean column for activeOnly (e.g., "is_active")
  defaultSort?: { column: string; desc?: boolean };

  // Mapping functions for domain conversion.
  toDomain: (row: any) => T;             // DB -> domain
  fromInput?: (input: TInput) => any;    // domain input -> DB payload

  // Optional: relation hydration (joins executed by provider post-fetch).
  relations?: Relation[];

  // Optional: final pass to compute derived fields, normalize, or enforce domain rules.
  postProcess?: (rows: T[]) => T[];
};
