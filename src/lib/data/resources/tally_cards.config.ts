import type { ResourceConfig } from "@/lib/data/types";

import type { TallyCard, TallyCardInput } from "./tally_cards/types";

/**
 * Full writable version table (public.tcm_tally_cards)
 * This is the insert-only, SCD2-style master table.
 * The view v_tcm_tally_cards_current is used for reads.
 */
const tcmTallyCardsConfig = {
  table: "tcm_tally_cards",
  pk: "id",

  // All persisted columns in the master table
  select:
    "id, card_uid, warehouse_id, tally_card_number, item_number, note, is_active, snapshot_at, hashdiff, created_at",

  search: ["tally_card_number", "note"] as const,
  defaultSort: { column: "snapshot_at", desc: true } as const,
  activeFlag: "is_active",

  // DB → domain
  toDomain: (r: any): TallyCard => ({
    id: r.id,
    card_uid: r.card_uid,
    warehouse_id: r.warehouse_id,
    tally_card_number: r.tally_card_number,
    item_number: Number(r.item_number),
    note: r.note ?? null,
    is_active: !!r.is_active,
    snapshot_at: r.snapshot_at ?? null,
    hashdiff: r.hashdiff ?? null,
    created_at: r.created_at ?? null,
  }),

  // domain input → DB payload
  fromInput: (i: TallyCardInput) => ({
    card_uid: i.card_uid ?? null,
    warehouse_id: i.warehouse_id,
    tally_card_number: i.tally_card_number,
    item_number: i.item_number,
    note: i.note ?? null,
    is_active: i.is_active ?? true,
    snapshot_at: i.snapshot_at ?? new Date().toISOString(),
    // hashdiff is typically computed by backend insert logic
  }),

  postProcess: (rows: TallyCard[]) => rows,
} satisfies ResourceConfig<TallyCard, TallyCardInput>;

export default tcmTallyCardsConfig;
