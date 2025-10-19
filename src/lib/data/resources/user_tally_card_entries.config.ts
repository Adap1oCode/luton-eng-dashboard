import type { ResourceConfig, TcmUserEntry, UUID } from "../types";

/**
 * Physical composite key (user_id, tally_card_number), but this layer
 * supports single-column pk only. We use 'user_id' as pk for typing;
 * handlers can include 'tally_card_number' in filters/body as needed.
 */

export type TallyCardEntryInput = {
  id: UUID;
  user_id: UUID;
  tally_card_number?: string;
  card_uid?: UUID | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
};

const tcm_user_tally_card_entries: ResourceConfig<TcmUserEntry, TallyCardEntryInput> = {
  table: "tcm_user_tally_card_entries",
  pk: "id", // single-column pk per current layer constraints
  select: "id, user_id, tally_card_number, card_uid, qty, location, note, updated_at",
  search: ["tally_card_number", "location", "note"],
  defaultSort: { column: "updated_at", desc: true },

  fromInput: (input: TallyCardEntryInput) => ({
    user_id: input.user_id,
    tally_card_number: input.tally_card_number ?? undefined,
    card_uid: input.card_uid ?? null,
    qty: input.qty === undefined || input.qty === null ? null : Number(input.qty),
    location: input.location ?? null,
    note: input.note ?? null,
  }),

  toDomain: (row: unknown) => row as TcmUserEntry,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      user_id: { type: "uuid", write: false },
      tally_card_number: { type: "text", write: true },
      card_uid: { type: "uuid", nullable: true, write: true },
      qty: { type: "int", nullable: true, write: true },
      location: { type: "text", nullable: true, write: true },
      note: { type: "text", nullable: true, write: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
    },
  },
};

export default tcm_user_tally_card_entries;
