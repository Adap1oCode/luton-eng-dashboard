// src/lib/data/resources/user_tally_card_entries.config.ts
import type { ResourceConfig, TcmUserEntry, UUID } from "../types";

/** Write/input model stays the same (user_id = updater) */
export type TallyCardEntryInput = {
  id: UUID;
  user_id: UUID; // last updater (mapped to updated_by_user_id on write)
  tally_card_number?: string;
  card_uid?: UUID | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
  reason_code?: string | null;
  multi_location?: boolean | null;
};

const tcm_user_tally_card_entries: ResourceConfig<TcmUserEntry, TallyCardEntryInput> = {
  // 🔎 Read from the view (exposes warehouse + role_family + updater alias)
  table: "v_tcm_user_tally_card_entries",
  pk: "id",

  // ⚡ Keep lean; card_uid omitted (only used in forms)
  select:
    "id, user_id, full_name, role_family, tally_card_number, qty, location, note, reason_code, multi_location, updated_at, updated_at_pretty, warehouse_id, warehouse",

  search: ["tally_card_number", "location", "note", "full_name", "role_family"],
  defaultSort: { column: "tally_card_number", desc: false },

  // 🔒 Warehouse scoping (UUID)
  warehouseScope: { mode: "column", column: "warehouse_id" },

  // 🧭 Ownership now by role family (UI lists one latest row per family from the view)
  ownershipScope: {
    mode: "role_family", // <- your API/SSR should enforce this mode
    column: "role_family",
    bypassPermissions: ["entries:read:any", "admin:read:any"],
  },

  // ✍️ CREATE/UPDATE target the base table; map updater correctly
  fromInput: (input: TallyCardEntryInput) => ({
    updated_by_user_id: input.user_id, // <-- renamed target column
    tally_card_number: input.tally_card_number ?? undefined,
    card_uid: input.card_uid ?? null,
    qty: input.qty == null ? null : Number(input.qty),
    location: input.location ?? null,
    note: input.note ?? null,
    reason_code: input.reason_code ?? 'UNSPECIFIED',
    multi_location: input.multi_location ?? false,
    // role_family is derived/set elsewhere; view exposes it read-only
  }),

  toDomain: (row: unknown) => row as TcmUserEntry,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      user_id: { type: "uuid", write: true },                 // updater (alias in view)
      full_name: { type: "text", readonly: true },
      role_family: { type: "text", readonly: true },          // owner dimension
      tally_card_number: { type: "text", write: true },
      card_uid: { type: "uuid", nullable: true, write: true },
      qty: { type: "int", nullable: true, write: true },
      location: { type: "text", nullable: true, write: true },
      note: { type: "text", nullable: true, write: true },
      reason_code: { type: "text", nullable: true, write: true },
      multi_location: { type: "bool", nullable: false, write: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
      updated_at_pretty: { type: "text", nullable: true, readonly: true },
      warehouse_id: { type: "uuid", readonly: true },
      warehouse: { type: "text", readonly: true },
    },
  },
};

export default tcm_user_tally_card_entries;
