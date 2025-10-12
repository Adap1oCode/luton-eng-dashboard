import type { ResourceConfig } from "@/lib/data/types";

/**
 * Read-only view of latest version per card (v_tcm_tally_cards_current)
 */
const tcmTallyCardsCurrentConfig = {
  table: "public.v_tcm_tally_cards_current",
  pk: "card_uid",

  select: "card_uid, warehouse_id, tally_card_number, item_number, note, is_active, snapshot_at",

  search: ["tally_card_number", "item_number", "note"] as const,
  defaultSort: { column: "tally_card_number", desc: false } as const,
  activeFlag: "is_active",

  toDomain: (r: any) => ({
    card_uid: r.card_uid,
    warehouse_id: r.warehouse_id,
    tally_card_number: r.tally_card_number,
    item_number: String(r.item_number),
    note: r.note ?? null,
    is_active: !!r.is_active,
    snapshot_at: r.snapshot_at ?? null,
  }),

  fromInput: (i: any) => i, // view is read-only
  postProcess: (rows: any[]) => rows,
} satisfies ResourceConfig<any, any>;

export default tcmTallyCardsCurrentConfig;
