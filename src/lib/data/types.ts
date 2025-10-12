// lib/data/types.ts
export type UUID = string;
export type Relation<T> = T | null;

// Add near the top:
export type ISODateTime = string;
export type SortSpec = { column: string; desc?: boolean };
export type FilterValue = string | number | boolean | null | Array<string | number | boolean | null>;

// Replace ListParams with:
export type ListParams = {
  page?: number; // 1-based
  pageSize?: number;
  q?: string;
  filters?: Record<string, FilterValue>;
  activeOnly?: boolean;
  sort?: SortSpec;
};

// In ResourceConfig, reuse SortSpec:
export type ResourceConfig<T, TInput> = {
  table: string;
  pk: string; // NOTE: single-column only; composite keys are not supported at this layer.
  select: string;
  search?: string[];
  activeFlag?: string;
  defaultSort?: SortSpec;
  toDomain: (row: any) => T;
  fromInput?: (input: TInput) => any;
  relations?: Relation<any>[]; // ✅ fixed line
  postProcess?: (rows: T[]) => T[];
};

// In domain types, (optional) use ISODateTime alias:
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
