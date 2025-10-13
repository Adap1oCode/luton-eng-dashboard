import type { ResourceConfig, TcmTallyCard, UUID } from "../types";

export type TallyCardInput = {
  card_uid?: UUID | null;
  warehouse_id?: UUID | null;
  warehouse?: string | null;        // optional text mirror
  tally_card_number: string;
  item_number: number | string;
  note?: string | null;
  is_active?: boolean;
  snapshot_at?: string | null;      // ISO; DB defaults if null
};

const tcm_tally_cards: ResourceConfig<TcmTallyCard, TallyCardInput> = {
  table: "tcm_tally_cards",
  pk: "id",
  select:
    "id, card_uid, tally_card_number, warehouse, warehouse_id, item_number, note, is_active, created_at, snapshot_at, hashdiff",
  search: ["tally_card_number", "warehouse"],
  activeFlag: "is_active",
  defaultSort: { column: "snapshot_at", desc: true },

  fromInput: (input: TallyCardInput) => ({
    card_uid: input.card_uid ?? null,
    warehouse_id: input.warehouse_id ?? null,
    warehouse: input.warehouse ?? null,
    tally_card_number: String(input.tally_card_number).trim(),
    item_number:
      typeof input.item_number === "string"
        ? Number(input.item_number)
        : input.item_number,
    note: input.note ?? null,
    is_active: input.is_active ?? true,
    snapshot_at: input.snapshot_at ?? null,
  }),

  toDomain: (row: unknown) => row as TcmTallyCard,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      card_uid: { type: "uuid", nullable: true }, // set by trigger
      tally_card_number: { type: "text", write: true },
      warehouse: { type: "text", nullable: true, write: true },
      warehouse_id: { type: "uuid", write: true },
      item_number: { type: "bigint", write: true },
      note: { type: "text", nullable: true, write: true },
      is_active: { type: "bool", write: true },
      created_at: { type: "timestamp", nullable: true, readonly: true },
      snapshot_at: { type: "timestamp", write: true },
      hashdiff: { type: "text", nullable: true, readonly: true },
    },
  },
};

export default tcm_tally_cards;
