// src/lib/data/resources/user_tally_card_entries.config.ts
import type { ResourceConfig, TcmUserEntry, UUID } from "../types";

/** Write/input model stays the same */
export type TallyCardEntryInput = {
  user_id: UUID;
  tally_card_number?: string;
  card_uid?: UUID | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
};

const tcm_user_tally_card_entries: ResourceConfig<TcmUserEntry, TallyCardEntryInput> = {
  // ⬇️ point to the view that exposes warehouse_id/warehouse
  table: "v_tcm_user_tally_card_entries",
  pk: "user_id", // current layer supports single-column pk

  // ⬇️ include warehouse_id (UUID) and warehouse (code) for scoping & UI
  select:
    "user_id, tally_card_number, card_uid, qty, location, note, updated_at, warehouse_id, warehouse",

  search: ["tally_card_number", "location", "note"],
  defaultSort: { column: "updated_at", desc: true },

  // 🔒 SCOPING
  // Warehouse scoping by UUID is the most robust (matches your role_warehouse_rules.warehouse_id)
  warehouseScope: { mode: "column", column: "warehouse_id" },

  // Ownership: user sees their own entries unless they have a bypass permission
  ownershipScope: {
    mode: "self",
    column: "user_id",
    bypassPermissions: ["entries:read:any", "admin:read:any"],
  },

  // Note: CREATE/UPDATE still operate on the base table via provider methods,
  // not on this view. We only use the view for list/get projections.
  fromInput: (input: TallyCardEntryInput) => ({
    user_id: input.user_id,
    tally_card_number: input.tally_card_number ?? undefined,
    card_uid: input.card_uid ?? null,
    qty: input.qty == null ? null : Number(input.qty),
    location: input.location ?? null,
    note: input.note ?? null,
  }),

  toDomain: (row: unknown) => row as TcmUserEntry,

  schema: {
    fields: {
      user_id: { type: "uuid", write: true },
      tally_card_number: { type: "text", write: true },
      card_uid: { type: "uuid", nullable: true, write: true },
      qty: { type: "int", nullable: true, write: true },
      location: { type: "text", nullable: true, write: true },
      note: { type: "text", nullable: true, write: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },

      // read-only fields surfaced by the view:
      warehouse_id: { type: "uuid", readonly: true },
      warehouse: { type: "text", readonly: true },
    },
  },
};

export default tcm_user_tally_card_entries;
