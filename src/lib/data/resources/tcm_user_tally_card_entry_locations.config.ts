import type { ResourceConfig } from "../types";

export type TallyCardEntryLocation = {
  id: string;
  entry_id: string;
  location: string;
  qty: number;
  pos: number | null;
  reason_code: string | null;
};

export type TallyCardEntryLocationInput = {
  id?: string;
  entry_id: string;
  location: string;
  qty: number;
  pos?: number | null;
  reason_code?: string | null;
};

const tcm_user_tally_card_entry_locations: ResourceConfig<
  TallyCardEntryLocation,
  TallyCardEntryLocationInput
> = {
  table: "tcm_user_tally_card_entry_locations",
  pk: "id",
  select: "id, entry_id, location, qty, pos, reason_code",
  search: ["location"],
  defaultSort: { column: "pos", desc: false },

  fromInput: (input: TallyCardEntryLocationInput) => ({
    entry_id: input.entry_id,
    location: String(input.location).trim(),
    qty: Number(input.qty),
    pos: input.pos ?? null,
    reason_code: input.reason_code ?? "UNSPECIFIED",
  }),

  toDomain: (row: unknown) => row as TallyCardEntryLocation,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      entry_id: { type: "uuid", write: true },
      location: { type: "text", write: true },
      qty: { type: "int", write: true },
      pos: { type: "int", nullable: true, write: true },
      reason_code: { type: "text", nullable: true, write: true },
    },
  },
};

export default tcm_user_tally_card_entry_locations;

