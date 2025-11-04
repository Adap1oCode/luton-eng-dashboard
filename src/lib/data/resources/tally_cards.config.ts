import type { ResourceConfig, TcmTallyCard, UUID } from "../types";

export type TallyCardInput = {
  card_uid?: UUID | null;
  warehouse_id?: UUID | null;
  tally_card_number: string;
  item_number: number | string;
  note?: string | null;
  is_active?: boolean;
  snapshot_at?: string | null; // ISO; DB defaults if null
};

const tcm_tally_cards: ResourceConfig<TcmTallyCard, TallyCardInput> = {
  table: "tcm_tally_cards",
  pk: "id",
  select:
    "id, card_uid, tally_card_number, warehouse_id, item_number, note, is_active, created_at, snapshot_at, hashdiff",
  search: ["tally_card_number"],
  activeFlag: "is_active",
  defaultSort: { column: "snapshot_at", desc: true },

  fromInput: (input: TallyCardInput) => {
    const base: Record<string, any> = {};

    if (input.card_uid !== undefined) base.card_uid = input.card_uid ?? null;
    if (input.tally_card_number !== undefined) base.tally_card_number = String(input.tally_card_number).trim();
    if (input.warehouse_id !== undefined) base.warehouse_id = input.warehouse_id;

    if (input.item_number !== undefined) {
      base.item_number = typeof input.item_number === "string" ? Number(input.item_number) : input.item_number;
    }
    if (input.note !== undefined) base.note = input.note ?? null;
    if (input.is_active !== undefined) base.is_active = input.is_active ?? true;
    if (input.snapshot_at !== undefined) base.snapshot_at = input.snapshot_at ?? null;

    // Strip undefined keys so they are not sent
    const payload = Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined));

    return payload;
  },

  toDomain: (row: unknown) => row as TcmTallyCard,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      card_uid: { type: "uuid", nullable: true }, // set by trigger
      tally_card_number: { type: "text", write: true },
      warehouse_id: { type: "uuid", write: true },
      item_number: { type: "bigint", write: true },
      note: { type: "text", nullable: true, write: true },
      is_active: { type: "bool", write: true },
      created_at: { type: "timestamp", nullable: true, readonly: true },
      snapshot_at: { type: "timestamp", write: true },
      hashdiff: { type: "text", nullable: true, readonly: true },
    },
  },

  // 📜 HISTORY (SCD2) - Configurable history tracking
  // History queries the base SCD2 table (same as Edit screen), then enriches server-side
  history: {
    enabled: true,
    source: {
      // Query base SCD2 table (same as Edit screen) - not the view which only shows top 1 per anchor
      // historyResource omitted → defaults to current resource (base table)
      anchorColumn: "card_uid", // From tcm_tally_card_anchor - unique identifier for each tally card
      warehouseColumn: "warehouse_id", // Direct column in tcm_tally_cards
    },
    // scope omitted → mirror list ownership & warehouse behavior
    // Ownership scoping: not applicable for tally cards (no ownership scope)
    // Warehouse scoping: applied via warehouseColumn
    projection: {
      columns: [
        "snapshot_at",
        "snapshot_at_pretty", // formatted server-side if not present
        "tally_card_number",
        "warehouse_id",
        "item_number",
        "note",
        "is_active",
      ],
      orderBy: { column: "snapshot_at", direction: "desc" },
    },
    ui: {
      columns: [
        { key: "snapshot_at_pretty", label: "Snapshot", format: "date", width: 200 }, // Full timestamp (date + time)
        { key: "tally_card_number", label: "Tally Card Number", width: 180 },
        { key: "warehouse_id", label: "Warehouse ID", width: 180 },
        { key: "item_number", label: "Item Number", format: "number", width: 140 },
        { key: "note", label: "Note", width: 280 },
        { key: "is_active", label: "Active", width: 100 },
      ],
      tabBadgeCount: true,
    },
  },
};

export default tcm_tally_cards;
