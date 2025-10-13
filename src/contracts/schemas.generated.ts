// AUTO-GENERATED FROM Registry. DO NOT EDIT.
// Generated: 2025-10-13T12:04:49.423Z
// Source: scripts/gen-schemas-from-registry.ts
// MAX_PAGE_SIZE: 200
// BIGINT_AS: number

import { z } from "zod";

/** warehouses: response (DB → API) */
export const warehousesResponse = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  created_at: (z.string()).nullable(),
  updated_at: (z.string()).nullable(),
});
export type warehousesResponseT = z.infer<typeof warehousesResponse>;

/** warehouses: create (API → DB) */
export const warehousesCreate = z.object({
  code: z.string(),
  name: z.string(),
  is_active: z.coerce.boolean(),
}).strict();
export type warehousesCreateT = z.infer<typeof warehousesCreate>;

/** warehouses: patch (API → DB) */
export const warehousesPatch = warehousesCreate.partial().strict();
export type warehousesPatchT = z.infer<typeof warehousesPatch>;

/** roles: response (DB → API) */
export const rolesResponse = z.object({
  id: z.string().uuid(),
  role_code: z.string(),
  role_name: z.string(),
  description: (z.string()).nullable(),
  is_active: z.boolean(),
  can_manage_roles: z.boolean(),
  can_manage_cards: z.boolean(),
  can_manage_entries: z.boolean(),
  created_at: (z.string()).nullable(),
  updated_at: (z.string()).nullable(),
});
export type rolesResponseT = z.infer<typeof rolesResponse>;

/** roles: create (API → DB) */
export const rolesCreate = z.object({
  role_code: z.string(),
  role_name: z.string(),
  description: (z.string()).nullable(),
  is_active: z.coerce.boolean(),
  can_manage_roles: z.coerce.boolean(),
  can_manage_cards: z.coerce.boolean(),
  can_manage_entries: z.coerce.boolean(),
}).strict();
export type rolesCreateT = z.infer<typeof rolesCreate>;

/** roles: patch (API → DB) */
export const rolesPatch = rolesCreate.partial().strict();
export type rolesPatchT = z.infer<typeof rolesPatch>;

/** role_warehouse_rules: response (DB → API) */
export const role_warehouse_rulesResponse = z.object({
  role_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  role_code: z.string(),
  warehouse: z.string(),
});
export type role_warehouse_rulesResponseT = z.infer<typeof role_warehouse_rulesResponse>;

/** role_warehouse_rules: create (API → DB) */
export const role_warehouse_rulesCreate = z.object({
  role_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  role_code: z.string(),
  warehouse: z.string(),
}).strict();
export type role_warehouse_rulesCreateT = z.infer<typeof role_warehouse_rulesCreate>;

/** role_warehouse_rules: patch (API → DB) */
export const role_warehouse_rulesPatch = role_warehouse_rulesCreate.partial().strict();
export type role_warehouse_rulesPatchT = z.infer<typeof role_warehouse_rulesPatch>;

/** tcm_tally_cards: response (DB → API) */
export const tcm_tally_cardsResponse = z.object({
  id: z.string().uuid(),
  card_uid: (z.string().uuid()).nullable(),
  tally_card_number: z.string(),
  warehouse: (z.string()).nullable(),
  warehouse_id: z.string().uuid(),
  item_number: z.number(),
  note: (z.string()).nullable(),
  is_active: z.boolean(),
  created_at: (z.string()).nullable(),
  snapshot_at: z.string(),
  hashdiff: (z.string()).nullable(),
});
export type tcm_tally_cardsResponseT = z.infer<typeof tcm_tally_cardsResponse>;

/** tcm_tally_cards: create (API → DB) */
export const tcm_tally_cardsCreate = z.object({
  tally_card_number: z.string(),
  warehouse: (z.string()).nullable(),
  warehouse_id: z.string().uuid(),
  item_number: z.coerce.number(),
  note: (z.string()).nullable(),
  is_active: z.coerce.boolean(),
  snapshot_at: z.string(),
}).strict();
export type tcm_tally_cardsCreateT = z.infer<typeof tcm_tally_cardsCreate>;

/** tcm_tally_cards: patch (API → DB) */
export const tcm_tally_cardsPatch = tcm_tally_cardsCreate.partial().strict();
export type tcm_tally_cardsPatchT = z.infer<typeof tcm_tally_cardsPatch>;

/** tcm_tally_cards_current: response (DB → API) */
export const tcm_tally_cards_currentResponse = z.object({
  id: z.string().uuid(),
  card_uid: z.string().uuid(),
  tally_card_number: z.string(),
  warehouse_id: z.string().uuid(),
  item_number: z.number(),
  note: (z.string()).nullable(),
  is_active: z.boolean(),
  created_at: (z.string()).nullable(),
  snapshot_at: z.string(),
});
export type tcm_tally_cards_currentResponseT = z.infer<typeof tcm_tally_cards_currentResponse>;

/** tcm_tally_cards_current: create (API → DB) */
export const tcm_tally_cards_currentCreate = z.object({

}).strict();
export type tcm_tally_cards_currentCreateT = z.infer<typeof tcm_tally_cards_currentCreate>;

/** tcm_tally_cards_current: patch (API → DB) */
export const tcm_tally_cards_currentPatch = tcm_tally_cards_currentCreate.partial().strict();
export type tcm_tally_cards_currentPatchT = z.infer<typeof tcm_tally_cards_currentPatch>;

/** tcm_user_tally_card_entries: response (DB → API) */
export const tcm_user_tally_card_entriesResponse = z.object({
  user_id: z.string().uuid(),
  tally_card_number: z.string(),
  card_uid: (z.string().uuid()).nullable(),
  qty: (z.number().int()).nullable(),
  location: (z.string()).nullable(),
  note: (z.string()).nullable(),
  updated_at: (z.string()).nullable(),
});
export type tcm_user_tally_card_entriesResponseT = z.infer<typeof tcm_user_tally_card_entriesResponse>;

/** tcm_user_tally_card_entries: create (API → DB) */
export const tcm_user_tally_card_entriesCreate = z.object({
  user_id: z.string().uuid(),
  tally_card_number: z.string(),
  card_uid: (z.string().uuid()).nullable(),
  qty: (z.coerce.number().int()).nullable(),
  location: (z.string()).nullable(),
  note: (z.string()).nullable(),
}).strict();
export type tcm_user_tally_card_entriesCreateT = z.infer<typeof tcm_user_tally_card_entriesCreate>;

/** tcm_user_tally_card_entries: patch (API → DB) */
export const tcm_user_tally_card_entriesPatch = tcm_user_tally_card_entriesCreate.partial().strict();
export type tcm_user_tally_card_entriesPatchT = z.infer<typeof tcm_user_tally_card_entriesPatch>;

/** users: response (DB → API) */
export const usersResponse = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: (z.string()).nullable(),
  role_code: (z.string()).nullable(),
  is_active: z.boolean(),
  created_at: (z.string()).nullable(),
  auth_id: (z.string().uuid()).nullable(),
  updated_at: (z.string()).nullable(),
  role_id: (z.string().uuid()).nullable(),
  is_roles_admin: z.boolean(),
});
export type usersResponseT = z.infer<typeof usersResponse>;

/** users: create (API → DB) */
export const usersCreate = z.object({
  full_name: z.string(),
  email: (z.string()).nullable(),
  role_code: (z.string()).nullable(),
  is_active: z.coerce.boolean(),
  role_id: (z.string().uuid()).nullable(),
  is_roles_admin: z.coerce.boolean(),
}).strict();
export type usersCreateT = z.infer<typeof usersCreate>;

/** users: patch (API → DB) */
export const usersPatch = usersCreate.partial().strict();
export type usersPatchT = z.infer<typeof usersPatch>;

export const Schemas = {
  warehouses: { Response: warehousesResponse, Create: warehousesCreate, Patch: warehousesPatch },
  roles: { Response: rolesResponse, Create: rolesCreate, Patch: rolesPatch },
  role_warehouse_rules: { Response: role_warehouse_rulesResponse, Create: role_warehouse_rulesCreate, Patch: role_warehouse_rulesPatch },
  tcm_tally_cards: { Response: tcm_tally_cardsResponse, Create: tcm_tally_cardsCreate, Patch: tcm_tally_cardsPatch },
  tcm_tally_cards_current: { Response: tcm_tally_cards_currentResponse, Create: tcm_tally_cards_currentCreate, Patch: tcm_tally_cards_currentPatch },
  tcm_user_tally_card_entries: { Response: tcm_user_tally_card_entriesResponse, Create: tcm_user_tally_card_entriesCreate, Patch: tcm_user_tally_card_entriesPatch },
  users: { Response: usersResponse, Create: usersCreate, Patch: usersPatch },
} as const;

export const ListResponse = <T extends z.ZodTypeAny>(TItem: T) =>
  z.object({ rows: z.array(TItem), total: z.number().int() });

export type ListResponseT<T> = { rows: T[]; total: number };

export const SingleResponse = <T extends z.ZodTypeAny>(TItem: T) =>
  z.object({ row: TItem });

export type SingleResponseT<T> = { row: T };

export const SuccessResponse = z.object({ success: z.literal(true) });
export type SuccessResponseT = { success: true };

// Standard list query schema for all resources
export const ListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  q: z.string().optional(),
  activeOnly: z.coerce.boolean().optional(),
  sort: z.object({
    column: z.string(),
    desc: z.coerce.boolean().optional(),
  }).optional()
}).strict();
export type ListQueryT = z.infer<typeof ListQuery>;

// Typed helpers (reduce handler boilerplate)
export function parseListQuery(input: unknown) {
  return ListQuery.parse(input);
}
export function parseCreate<R extends keyof typeof Schemas>(resource: R, data: unknown) {
  return Schemas[resource].Create.parse(data);
}
export function parsePatch<R extends keyof typeof Schemas>(resource: R, data: unknown) {
  return Schemas[resource].Patch.parse(data);
}

