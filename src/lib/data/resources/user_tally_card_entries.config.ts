import type { ResourceConfig } from "@/lib/data/types";

const tcmUserTallyCardEntriesConfig: ResourceConfig<any, any> = {
  table: "tcm_user_tally_card_entries",
  pk: "id", // synthetic; we’ll derive a virtual ID below

  select: "user_id, card_uid, qty, location, note, updated_at",

  search: ["note"] as const,
  defaultSort: { column: "updated_at", desc: true } as const,

  toDomain: (r: any) => ({
    // Compose a unique key client-side
    id: `${r.user_id}:${r.card_uid}:${r.updated_at ?? ""}`,
    user_id: r.user_id,
    card_uid: r.card_uid,
    qty: r.qty,
    location: r.location ?? null,
    note: r.note ?? null,
    updated_at: r.updated_at ?? null,
  }),

  fromInput: (i: any) => ({
    user_id: i.user_id,
    card_uid: i.card_uid,
    qty: i.qty,
    location: i.location ?? null,
    note: i.note ?? null,
  }),

  postProcess: (rows: any[]) => rows,
};

export default tcmUserTallyCardEntriesConfig;
