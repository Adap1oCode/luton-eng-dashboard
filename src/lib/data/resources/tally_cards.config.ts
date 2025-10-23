import type { ResourceConfig, TcmTallyCard, UUID } from "../types";

export type TallyCardInput = {
  card_uid?: UUID | null;
  warehouse_id?: UUID | null;
  warehouse?: string | null; // optional text mirror
  tally_card_number: string;
  item_number: number | string;
  note?: string | null;
  is_active?: boolean;
  snapshot_at?: string | null; // ISO; DB defaults if null
  status?: string | null;
  owner?: string | null;
  quantity?: number | null;
};

const tcm_tally_cards: ResourceConfig<TcmTallyCard, TallyCardInput> = {
  table: "tcm_tally_cards",
  pk: "id",
  select:
    "id, card_uid, tally_card_number, warehouse, warehouse_id, item_number, note, is_active, created_at, snapshot_at, hashdiff",
  search: ["tally_card_number", "warehouse"],
  activeFlag: "is_active",
  defaultSort: { column: "snapshot_at", desc: true },

  fromInput: (input: TallyCardInput) => {
    const base: Record<string, any> = {};

    if (input.card_uid !== undefined) base.card_uid = input.card_uid ?? null;
    if (input.tally_card_number !== undefined) base.tally_card_number = String(input.tally_card_number).trim();
    if (input.warehouse_id !== undefined) base.warehouse_id = input.warehouse_id;

    // Only set warehouse when a string value is provided; avoid null to prevent NOT NULL violation
    if (input.warehouse !== undefined && typeof input.warehouse === "string") {
      base.warehouse = input.warehouse;
    }

    if (input.item_number !== undefined) {
      base.item_number = typeof input.item_number === "string" ? Number(input.item_number) : input.item_number;
    }
    if (input.note !== undefined) base.note = input.note ?? null;
    if (input.is_active !== undefined) base.is_active = input.is_active ?? true;
    if (input.snapshot_at !== undefined) base.snapshot_at = input.snapshot_at ?? null;

    // Status-related fields (only include if present)
    if (input.status !== undefined) base.status = input.status ?? null;
    if (input.owner !== undefined) base.owner = input.owner ?? null;
    if (input.quantity !== undefined) base.quantity = input.quantity ?? null;

    // Strip undefined keys so they are not sent
    const payload = Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined));

    // Removed: app-level updated_at injection (column does not exist)
    // Removed: status (column does not exist)

    return payload;
  },

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
      status: { type: "text", nullable: true, write: true },
      owner: { type: "text", nullable: true, write: true },
      quantity: { type: "bigint", nullable: true, write: true },
    },
  },
};

export default tcm_tally_cards;
