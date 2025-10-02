// Canonical types used across the Roles feature

export type Warehouse = {
  code: string;
  name: string;
};

// Your table doesn't have added_at / added_by / note columns,
// but WarehousesTable expects them. We'll provide them as nulls.
export type Assigned = {
  warehouse: string;          // code from role_warehouse_rules.warehouse
  name: string;               // friendly warehouse name (joined from warehouses)
  added_at: string | null;    // always null (no column)
  added_by: string | null;    // always null (no column)
  note: string | null;        // always null (no column)
};

// Used by "new" actions or server utilities when constructing a payload
export type RoleInput = {
  role_code: string;
  role_name: string;
  description?: string | null;
  is_active: boolean;
  warehouses: string[]; // warehouse codes
};
