export type Id = string | number;

export type Role = {
  id: Id;
  name: string;            // unique display name, e.g. "Warehouse Admin"
  description?: string | null;
  is_active: boolean;
  created_at: string;      // ISO date-time
  updated_at?: string | null;
};

export type RoleInput = {
  name: string;
  description?: string | null;
  is_active?: boolean;     // default true
  role_family?: string | null;
};

export type ListParams = { page?: number; pageSize?: number; q?: string; activeOnly?: boolean };
export type Paged<T> = { rows: T[]; page: number; pageSize: number; total: number };
