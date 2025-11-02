// src/lib/data/resources/tally_cards_current.config.ts
import type { ResourceConfig, TcmTallyCard } from "../types";

/** Read-only "current" view (latest per card_uid). */
const tcm_tally_cards_current: ResourceConfig<TcmTallyCard, unknown> = {  // ⬅️ changed
  table: "v_tcm_tally_cards_current",
  pk: "id",
  select:
    "id, card_uid, tally_card_number, warehouse_id, item_number, note, is_active, created_at, snapshot_at",
search: ["tally_card_number"],
  activeFlag: "is_active",
  defaultSort: { column: "snapshot_at", desc: true },

  toDomain: (row: unknown) => row as TcmTallyCard,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      card_uid: { type: "uuid" },
      tally_card_number: { type: "text" },
      warehouse_id: { type: "uuid" },
      item_number: { type: "bigint" },
      note: { type: "text", nullable: true },
      is_active: { type: "bool" },
      created_at: { type: "timestamp", nullable: true },
      snapshot_at: { type: "timestamp" },
    },
  },
};

export default tcm_tally_cards_current;
